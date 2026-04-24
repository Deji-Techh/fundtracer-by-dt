Some issues here were not maily torque based, just leaaving it here incase of any person that wants to build something similar, goodluck

# FundTracer x Torque - Integration Friction Log

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

*Submitted: April 2026*
*Hackathon: Torque x Frontier*

