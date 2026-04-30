# FundTracer x Torque - Integration Friction Log

> Builder experience notes from the Torque x Frontier Hackathon
> Some issues here are not Torque-based, leaving for reference

## Overview

FundTracer is a multi-chain blockchain forensics platform. Users scan wallets to trace funds, detect sybil patterns, and analyze transaction activity.

Torque integration provides equity rewards via leaderboards that track wallets analyzed per user.

---

## What Worked

| Area | Outcome |
|------|---------|
| Custom Events API | Ingest endpoint functioned correctly on first implementation |
| Redis Caching | Reduced Firebase reads from 49K/day to ~700/day (98% reduction) |
| Telegram Integration | Group commands executed without special configuration |
| CLI Link Flow | Google OAuth + link code system works reliably |

---

## Recent Updates (Post-Hackathon)

### CLI Link Code Issue

**Problem:** Firebase ID token verification failed with "Firebase ID token has no 'kid' claim" error.

**Root Cause:** `/cli/link` endpoint used `auth.verifyIdToken()` directly, but the token from frontend didn't have the required "kid" claim that Firebase Admin expects.

**Solution:** Split into two endpoints:
- `/cli/link/generate` - uses authMiddleware (for web to generate code)
- `/cli/link/verify` - no auth needed (CLI verifies code)

This follows the same pattern as other working endpoints like `/mystats` and `/scan`.

### CLI Activity Feed Issue

**Problem:** CLI scans added points but didn't appear in activity feed.

**Root Cause:** `incrementScan()` only updated leaderboard points. Activity required separate call to `addActivity()`.

**Solution:** Updated `/cli/scan` to call both `incrementScan()` and `addActivity()`, passing wallet address.

### Solana Scanning

**Problem:** Solana scans didn't count toward leaderboard.

**Root Cause:** Solana endpoints (`/solana/portfolio`, `/solana/risk`) called portfolio service directly without Torque integration.

**Solution:** Added Torque tracking to Solana endpoints:
```javascript
if (userId) {
  await torqueServiceV2.incrementScan(userId, displayName);
  await torqueServiceV2.addActivity(userId, displayName, address, 'solana');
}
```

---

## MCP Integration Notes

Torque MCP was available from hackathon start. We chose NOT to use it for this implementation.

**Why REST over MCP:**

| Factor | Decision |
|--------|----------|
| Direct control | REST gave us direct control over event payload structure |
| Debugging | Easier to debug via console logs during hackathon |
| Timeline | REST was faster to implement in 48 hrs |
| Familiarity | Team more familiar with fetch() than MCP commands |

**Would we use MCP next time?**

Yes. MCP provides:
- Cleaner abstraction layer
- Type-safe event definitions
- Automatic error handling

**Core Functionality:** REST API to Torque ingest endpoint works identically. The growth primitives (leaderboards, custom events, tracking) function correctly.

---

## Growth Loop Implementation

**The Loop:**

```
User scans wallet → +10 points → Rank updates → Competition drives more scans
```

**Components:**

| Component | Implementation |
|-----------|----------------|
| Trigger | Every wallet scan = +10 points |
| Retention | Leaderboard rank creates competitive drive |
| Reward | Top scanners eligible for equity |
| Distribution | Manual allocation (not via Torque incentives) |

**Why Manual Distribution:**

- Full control over eligibility criteria
- Can exclude sybil/suspicious accounts manually
- Simpler for hackathon timeline
- Can integrate Torque MCP with incentives automation later

---

## Friction Points

### 1. Route-Level Auth Misconfiguration

**Problem:** All `/api/torque-v2/*` routes required authentication because auth middleware was mounted at the prefix level.

```javascript
// BEFORE (problematic)
app.use('/api/torque-v2', authMiddleware);  // applied to ALL routes
```

**Impact:** Public leaderboard endpoint required auth. Users couldn't view without logging in.

**Fix:** Applied auth middleware to individual protected routes only:

```javascript
// AFTER (fixed)
app.get('/api/torque-v2/leaderboard', noAuth, getLeaderboard);  // public
app.get('/api/torque-v2/mystats', authMiddleware, getMyStats);   // protected
```

**Suggested Improvement:** Add `public: true` parameter support for route definitions.

---

### 2. Duplicate Route Path Segments

**Problem:** Route mount included `v2` prefix, individual routes also included `v2`:

```javascript
app.use('/v2', torqueRoutes);      // mount: /v2
router.get('/v2/leaderboard');     // result: /v2/v2/leaderboard -> 404
```

**Impact:** 2 hours debugging 404 responses.

**Fix:** Removed duplicate `v2` from individual route definitions.

**Suggested Improvement:** Linter rule to flag duplicate path segments.

---

### 3. Frontend/Backend Endpoint Mismatch

**Problem:** 
- Frontend called: `/api/torque/v2/mystats`
- Backend served: `/api/torque-v2/mystats`

**Impact:** Leaderboard returned empty data. No error thrown - just silent failure.

**Fix:** Standardized all endpoints to `/api/torque-v2/*` pattern.

**Suggested Improvement:** Shared TypeScript types between frontend and backend to catch mismatches at compile time.

---

### 4. Redis Type Error

**Problem:** 

```javascript
const cached = await redis.get('leaderboard');
const data = cached.substring(0, 100);  // TypeError: substring not a function
```

**Impact:** Crashed on cache hit because numeric data was being treated as string.

**Fix:**

```javascript
if (typeof cached === 'string') {
  data = JSON.parse(cached);
}
```

**Suggested Improvement:** Typed cache layer or runtime type validation.

---

### 5. Firebase Quota Risk

**Problem:** Rank calculation executed on every leaderboard read:

```javascript
const myRank = await db.collection('users')
  .where('points', '>', myPoints)
  .count();  // runs on EVERY page view
```

At 100 users x 50 views/day = 5,000 queries/day against free tier (50,000/day limit). Other features added more load.

**Fix:**
- Moved rank calculation to write time only (when user scans)
- Cached results in Redis (5 min TTL)
- Leaderboard reads from cache, not Firestore

**Result:**

| Metric | Before | After |
|--------|--------|-------|
| Firebase reads/day | ~49,000 | ~700 |

**Suggested Improvement:** Dashboard quota warning: "Project trending toward X% of limit."

---

### 6. Telegram Group Data Loss

**Problem:** Server restart wiped in-memory group data. Users re-registered groups.

**Fix:** Firestore-first pattern:

```javascript
// Check Firestore BEFORE memory
const group = await db.collection('groups').doc(groupId).get();
if (!group.exists) group = memoryGroups.get(groupId);
```

**Suggested Improvement:** Auto-sync on server startup from persistent storage.

---

### 7. Custom Events Not Visible in Incentives UI

**Problem:** Created 4 custom events (wallet_analyzed, sybil_detected, contract_analyzed, compare_wallets). Incentives UI showed only on-chain options (Trading, Holding, Liquidity, Referrals).

**Impact:** Couldn't configure rewards for custom events via standard UI.

**Workaround:** Used "Create with AI" flow, typed natural language query. AI navigated to correct configuration.

**Suggested Improvement:** Make custom events a first-class option in the create incentive dropdown.

Btw, we are also rewarding our users manually, not via torque

---

## Recommendations

| Priority | Area | Recommendation |
|----------|------|-------------|
| P0 | Route Auth | Add `public: true` flag support or clarify mount-level behavior in docs |
| P1 | Custom Events | Surface in create incentive UI as primary option |
| P2 | Quota Alerts | Add dashboard notifications for trending toward limits |
| P3 | Cache Layer | Built-in type validation |
| P4 | Route Spec | Auto-generate client SDKs from definition |

---

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| Firebase reads/day | 49,000 | ~700 |
| Leaderboard cache TTL | N/A | 5 minutes |
| Custom events | 0 | 4 |
| Integration channels | Web | Web + Telegram |

---

## Verdict

**Would we use Torque again?** Yes. Core functionality worked. Issues were integration-level, not platform-level.

---

## Post-Hackathon Updates

### Auth 401 Issue on /mystats (April 2026)

**Problem:** `/api/torque-v2/mystats` returned 401 Unauthorized even with valid JWT, while `/api/user/profile` worked fine with the same token.

**Root Cause:** Different fetch patterns:
- `/api/user/profile` used `apiRequest()` wrapper with `credentials: 'include'`
- `/torque-v2/*` used raw `fetch()` without credentials option

The browser wasn't sending cookies/credentials with the raw fetch, so auth header wasn't being sent on some requests.

**Solution:** 
- Updated MyStatsTab.tsx to use `apiRequest()` instead of raw `fetch()`
- Added field mapping: `walletsScanned × 10 = points` for equity display
- Backend returns both fields, frontend handles the conversion

**Files Changed:**
- `packages/web/src/components/MyStatsTab.tsx`
- `packages/server/src/routes/torqueV2.ts` (added debug logging)

### Equity Claim System (April 2026)

Added equity claim functionality:
- 500,000 points pool = 5% equity
- 10 points per wallet analyzed
- Users can claim from My Stats tab
- Claim recorded to `torque_claims` collection

---

### Equity Claim System Improvements (v3.2 - April 2026)

**Phase 1 Fixes:**

1. **No close button on claimed view** - Users stuck on "Equity Claimed!" screen with no way to go back
   - Added X close button to dismiss and return to stats
   - Added "Back to Stats" button after claiming

2. **One-time claim limitation** - Users could only claim once, even after earning more points
   - Removed 1-month claim restriction
   - Changed to accumulate-and-claim model: users earn points, claim when they want
   - Tracks total claimed vs claimable separately
   - Minimum 10 new points required per claim

3. **Rewards Claimed stat not updating** - Hero section showed static "0%"
   - Fixed to fetch from `/api/torque-v2/pool-stats` endpoint
   - Now shows actual distributed equity percentage

4. **Removed vesting text** - Removed footer "5% equity pool • 12-24 month vesting • 3-12 month cliffs"

**Phase 2 Fixes (v3.2):**

1. **Equity Claimed showing 0% after claiming** - Redis cache returned stale data
   - Added cache invalidation after successful claim
   - Clears: claim status, user stats, leaderboard, pool stats caches

2. **"Failed to claim" error when nothing left** - Backend returned error when claimable = 0
   - Changed to show "View Claimed Equity (X%)" with claim percentage
   - Added "Analyze more wallets to claim more equity!" hint
   - Auto-refresh claim status from backend after claiming

3. **500 error on claim/history** - Endpoint crashed on errors
   - Now returns empty history array instead of 500
   - UI doesn't break on server issues

4. **Activity feed showed "Unknown" for claims** - Chain showed "EQUITY", user showed "Unknown"
   - Changed to show "Claimed" user, "CLAIMED" chain
   - Shows equity % instead of points
   - Added checkmark icon and green styling

**New Features:**

- **Claim History** - New `/api/torque-v2/claim/history` endpoint
- **Claim History UI** - Displays list of all past claims with dates in My Stats tab
- **Multiple Claims** - Users can claim multiple times as they earn more points
- **Claimable Equity** - Shows how much more equity can be claimed

**Files Changed:**
- `packages/web/src/components/MyStatsTab.tsx` - Added close/back buttons, claim history, multiple claim support
- `packages/server/src/services/TorqueServiceV2.ts` - Multiple claim logic, getClaimHistory method, cache invalidation
- `packages/server/src/routes/torqueV2.ts` - Added claim history endpoint, error handling
- `packages/web/src/pages/RewardsPage.tsx` - Fixed rewards claimed, removed footer
- `packages/web/src/pages/RewardsPage.css` - Added styles for new buttons and history
- `packages/web/src/components/ActivityFeed.tsx` - Claim activity display fixes

---

*Submitted: April 2026*
*Hackathon: Torque x Frontier*
*Updated: April 2026*

