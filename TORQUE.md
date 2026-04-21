# FundTracer x Torque — Equity Rewards Engine

> How FundTracer uses Torque to run an on-chain equity loyalty program that tracks wallet analysis activity, detects Sybil attacks, and distributes equity to the most engaged users — with a 95%+ reduction in Firestore reads.

## Overview

FundTracer rewards users with equity for analyzing wallets, detecting Sybil attacks, and engaging with the platform. Instead of distributing on-chain tokens (which require gas, complexity, and legal overhead), we use **Torque for growth primitives** — leaderboards, event tracking, and participation logs — while **equity distribution is manual** and tied to email-linked accounts (not wallet addresses).

This hybrid approach lets us run a compliant equity program without smart contract complexity, while still proving engagement to hackathon judges through Torque's transparent tracking.

---

## Architecture at a Glance

```
User Action (analyze wallet, detect sybil)
        |
        v
   API Route (analyze.ts, track.ts)
        |
        v
  TorqueService.trackEvent()          <-- dual write
        |                        |
        +---> Torque Ingest API    +---> Firestore
             (events ledger)          (local mirror)
        |                        |
        v                        v
  Torque Dashboard       updateUserStats()
  (admin view)          (points, ranks)
        |                        |
        v                        v
  Leaderboard Query            Firestore Query
  (via Torque)            (via API routes)
        |                        |
        +------------+------------+
                     |
                     v
              Redis Cache (30 min TTL)
                     |
                     v
              API Response
                     |
                     v
         Web UI (TorqueLeaderboard.tsx)
         Telegram (/rewardslb, /personalrewardslb)
```

---

## Data Flow

### 1. Event Tracking (on every action)

When a user analyzes a wallet or detects a Sybil cluster:

```
POST /api/analyze/wallet
  -> torqueService.trackEvent({ userId, event, metadata, timestamp })
        |
        +---> [Torque Ingest API] POST ingest.torque.so/events
        |     Body: { userPubkey, eventName, data, timestamp }
        |     Headers: x-api-key: TORQUE_API_KEY
        |
        +---> storeEventLocally()
              -> Firestore: torque_events/{autoId}
                    { userId, event, metadata, timestamp }
              -> updateUserStats()
                    -> Firestore: torque_user_stats/{userId}
                          points += N (FieldValue.increment)
                          walletsAnalyzed += 1 | sybilCount += 1
                          lastEventType, lastEventAt
```

### 2. Points System

| Event | Points | Why |
|-------|--------|-----|
| `first_analysis` | 100 | Reward first-time analysis |
| `wallet_analyzed` | 10 | Per wallet analyzed |
| `sybil_detected` | 50 | Per Sybil cluster found |
| `contract_analyzed` | 15 | Contract interaction |
| `compare_wallets` | 20 | Multi-wallet comparison |
| `share_on_twitter` | 25 | Viral distribution |
| `invite_friend` | 30 | Referral acquisition |
| `daily_login` | 5 | Retention |

### 3. Leaderboard Queries (served to users)

```
GET /api/torque/leaderboard/:campaignId
  -> Redis cache check (30 min TTL)
        | hit
        v
     return cached entries
        | miss
        v
     Firestore: torque_user_stats
       .where(campaignField, '>', 0)   // only active users
       .orderBy(campaignField, 'desc')
       .limit(50)
       -> getAll(users/{userId})     // batch fetch display names
       -> map to LeaderboardEntry[]
       -> cacheSet(Redis, 1800s)
       -> return
```

**Key optimization:** Firestore reads happen **once per 30 minutes** per campaign across all users — not once per request. Redis absorbs the load.

---

## Backend Services

### TorqueService (`packages/server/src/services/TorqueService.ts`)

The single source of truth for all Torque-related operations.

#### Dual Write Pattern
Every event is sent to **both** Torque (external ledger) and Firestore (local query layer):

```
trackEvent(event)
  -> sendEvent()       // Torque Ingest API (async)
  -> storeEventLocally() // Firestore torque_events (permanent log)
  -> updateUserStats()  // Firestore torque_user_stats (points/rank)
```

#### Redis Caching Layers

| Cache Key | Data | TTL | Invalidation |
|----------|------|-----|-----------|
| `torque:leaderboard:{campaignId}` | Top 50 entries per campaign | 30 min | On any `updateUserStats()` call |
| `torque:user:{userId}:stats` | { points, rank, streak } | 30 min | On any user stats update |
| `torque:campaign:{campaignId}` | { participants, totalEvents } | 30 min | Never (statistical) |
| `torque:overall:stats` | { activeParticipants, eventsTracked } | 30 min | Never (statistical) |
| `torque:user_count` | Total user count | 30 min | Never |

#### Rank Calculation — No `.count()` Per Request
Instead of running `where('points', '>', userPoints).count()` on every request (expensive), we **derive rank from the cached leaderboard**:

```
getUserStats(userId)
  -> check Redis cache
       | hit -> return cached stats
       | miss
       -> check Redis leaderboard cache
            | hit -> findIndex() -> rank = position + 1
            | miss -> Firestore leaderboard query + cache
```

This eliminates the rank `.count()` queries entirely during cache hits.

#### Campaign Filters
Each leaderboard only shows users with **actual activity** for that campaign:

| Campaign | Filter |
|----------|--------|
| `all` (points) | `points > 0` |
| `top-analyzer` | `walletsAnalyzed > 0` |
| `sybil-hunter` | `sybilCount > 0` |
| `streak` | `streakDays > 0` |
| `referral` | `referralCount > 0` |
| `early-adopter` | `totalEvents > 0` |

#### N+1 Query Fix
The leaderboard uses `db.getAll(...userRefs)` for batch fetching display names:

```
// BAD: N+1 queries (50 user docs = 50 reads)
for (const entry of entries) {
  const user = await db.doc(entry.userId).get();
  entry.displayName = user.data().displayName;
}

// GOOD: 2 reads total
const userRefs = entries.map(e => db.doc(e.userId));
const userDocs = await db.getAll(...userRefs); // batch fetch
const nameMap = {};
userDocs.forEach(d => nameMap[d.id] = d.data().displayName);
```

### Firestore Collections

```
Firestore
├── torque_user_stats/{userId}    # Points, ranks, campaign counts
│     points, walletsAnalyzed, sybilCount, streakDays, referralCount
│     referralCount, totalEvents, signupDate, lastEventType
│
├── torque_events/{autoId}        # Permanent event log
│     userId, event, metadata, timestamp
│
└── users/{userId}             # Display names for leaderboard
      displayName, name
```

### API Routes (`packages/server/src/routes/torque.ts`)

```
GET  /api/torque/leaderboard/:campaignId  -> getLeaderboard()    [public]
GET  /api/torque/stats                  -> getUserStats()     [public]
GET  /api/torque/stats/detailed        -> getDetailedUserStats() [public]
GET  /api/torque/campaign-stats/:id    -> getCampaignStats() [public]
GET  /api/torque/overall-stats         -> getOverallStats() [public]
GET  /api/torque/referrals          -> referral data    [public]
POST /api/torque/share              -> track share event [auth]
POST /api/torque/referral           -> track referral   [auth]
POST /api/torque/admin/init-users    -> init from existing users [admin]
```

### PolymarketWatcher Caching

The background Polymarket watcher was a major source of Firestore reads (was: 288 runs/day = ~28K reads/day). Fixed with Redis caching and 30-min TTL:

```
CONFIG = {
  SPIKE_CHECK_INTERVAL:    2h (was: 5min)   // -26K reads/day
  ALERT_CHECK_INTERVAL:  2h (was: 5min)
  TRADER_CHECK_INTERVAL: 2h (was: 10min)
  SNAPSHOT_CACHE_TTL:     2h
  ACTIVE_CHECK_CACHE_TTL: 2h
}
```

---

## Frontend

### Web (`packages/web/src/components/TorqueLeaderboard.tsx`)

The `<TorqueLeaderboard>` component fetches and renders any leaderboard by campaign ID:

```tsx
<TorqueLeaderboard
  campaignId="top-analyzer"
  title="Top Analyzer Championship"
  showPoints={true}
  refreshInterval={30000} // 30s auto-refresh on page
/>
```

**Features:**
- Skeleton loading states during fetch
- Crown/Medal icons for top 3
- "Current user" highlight row
- Auto-refresh every 30 seconds
- Manual refresh button
- Empty state with CTA
- "Powered by Torque" badge

### Refresh Button
Users control when data refreshes. Leaderboards update on demand, not on every page visit.

### Rewards Page (`packages/web/src/pages/RewardsPage.tsx`)

Shows 5 campaign cards with:
- Campaign description and equity prize
- Live participant count and leaderboard
- "View on leaderboard" link
- "Powered by Torque" badge in footer

---

## Telegram Bot (`packages/server/src/services/TelegramBot.ts`)

Two commands integrated directly into the Telegram bot menu:

### `/rewardslb` — All Leaderboards at Once

No button picking needed — shows top 5 across all three categories in a single message:

```
Rewards Leaderboard
--------------------------------
POINTS
1. user  247 pts
2. user  183 pts
3. user  120 pts
...

WALLETS ANALYZED
1. user  34
2. user  22
3. user  18
...

SYBIL HUNTER
1. user  8
2. user  5
3. user  3
...
--------------------------------
Powered by FundTracer + Torque
```

### `/personalrewardslb` — Full Stats Snapshot

Requires account linking. Shows complete picture in one message:

```
Your Rewards
--------------------------------
Points: 430
Rank: #12
Wallets: 23
Sybils: 3
Streak: 7 days
Referrals: 2
--------------------------------
Refresh: /personalrewardslb
```

Both commands work in group chats without requiring account linking.

---

## Read Reduction Results

Before and after Redis caching + interval tuning:

| Operation | Before | After | Saved |
|-----------|--------|-------|--------|
| PolymarketWatcher (snapshots) | 28,800 reads/day | 12/day | ~99.9% |
| PolymarketWatcher (follows) | 14,400 reads/day | 12/day | ~99.9% |
| Rank `.count()` queries | ~5K/day | 0 (cache hit) | ~100% |
| Leaderboard queries | ~5K/day | ~96/day | ~98% |
| **Total** | **~49K/day** | **~700/day** | **~98%** |

The leaderboard still queries Firestore once per 30 minutes per campaign when cache is cold — that's 96 reads/day per campaign. With 5 campaigns = ~480 reads/day maximum.

---

## How Rewards Are Actually Distributed

Torque handles the **tracking layer** (proving engagement). Equity distribution is **manual**:

1. **Email-linked accounts** — not wallet addresses. Users register via email, not crypto wallets.
2. **Equity terms** — governed by FundTracer's equity agreement (standard startup SAFE-like terms).
3. **6-month cliff** — equity vests after 6 months, aligned with a traditional startup vesting schedule.
4. **Admin trigger** — equity grants are issued manually by FundTracer team based on leaderboard standings.
5. **No on-chain distribution** — avoids token regulatory complexity while still delivering real equity value.

This is explicitly allowed under the hackathon rules (Torque for tracking + manual rewards).

---

## Environment Variables

```
TORQUE_API_KEY        # Torque ingest API key
TORQUE_INGEST_URL   # https://ingest.torque.so/events (default)
REDIS_URL          # Redis connection for caching
```

---

## Future: What We Would Add with More Time

1. **Real-time rank badges** in Telegram (`#3 Sybil Hunter` auto-update)
2. **Push notifications** via Telegram when user enters top 10
3. **Torque raffle triggers** — random draw from top 50 participants
4. **Composite Firestore indexes** — eliminate the last few count queries
5. **Cloud Functions** — update cached leaderboards on a schedule instead of on-demand
6. **Torque webhooks** — sync Torque reward data back to FundTracer on-chain