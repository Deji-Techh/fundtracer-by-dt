# FundTracer x Torque — Equity Rewards Engine (v3)

> How FundTracer uses Torque for growth primitives — now with groups, activity feed, and Telegram broadcast.

## The Evolution

| Version | Key Feature | Limitation |
|---------|-----------|----------|
| v1 | Multiple campaigns | 49K reads/day quota issues |
| v2 | Single leaderboard, rank on write | No groups, no live feed |
| **v3** | Group leaderboards + Live activity feed | Production-ready |

## Architecture (v3)

```
User scans wallet (Telegram group)
        |
        v
  performScan() in TelegramBot
        |
        +---> Firestore: torque_wallets/{uid}
        |     walletsScanned +1, totalPoints +10
        |     rank recalculated (on write)
        |
        +---> Firestore: torque_groups/{groupId}
        |     totalScans +1, totalPoints +10
        |
        +---> Firestore: torque_activity (NEW)
        |     userId, displayName, walletAddress, chain, timestamp
        |     (auto-cleanup: keep last 20)
        |
        +---> Torque Ingest API (async)
        |
        +---> Telegram broadcast (NEW)
              Broadcast to all registered groups
              "🔍 username scanned 0x1234... on LINEA (+10 pts)"
        
        v
  GET /api/torque/v2/leaderboard → Leaderboard display
  GET /api/torque/v2/activity  → Live activity feed
  GET /api/torque/v2/groups    → Group leaderboards
```

---

## Firestore Schema (v3)

### Collection: `torque_wallets/{userId}`

```javascript
{
  userId: string,           // doc ID
  walletsScanned: number,   // THE metric
  totalPoints: number,     // walletsScanned * 10
  rank: number,         // calculated on write
  firstScanAt: timestamp,
  lastScanAt: timestamp,
  displayName: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Collection: `torque_groups/{groupId}` (NEW)

```javascript
{
  groupId: string,         // Telegram chat ID
  groupName: string,
  adminId: string,        // Telegram user ID of admin
  chatId: string,
  totalScans: number,
  totalPoints: number,
  members: string[],     // Array of Telegram IDs who joined
  memberCount: number,
  createdAt: timestamp
}
```

### Collection: `torque_activity/{docId}` (NEW)

```javascript
{
  userId: string,
  displayName: string,
  walletAddress: string,
  chain: string,
  points: number,
  timestamp: number
}
```

**Auto-cleanup:** Keep last 20 entries. Delete older on each new insert.

---

## Redis Keys (v3)

| Key | Data | TTL |
|-----|------|-----|
| `torque:v2:leaderboard` | Top 50 entries | 5 min |
| `torque:v2:user:{uid}` | User's stats | 5 min |
| `torque:v2:activity` | Last 10 activities | 15 sec |
| `torque:v2:total` | Total scanned count | 5 min |

---

## API Endpoints (v3)

| Method | Route | Auth | Description |
|--------|-------|------|-------|
| GET | `/api/torque/v2/leaderboard` | No | Top 50 leaderboard |
| GET | `/api/torque/v2/mystats` | Yes | User's stats + rank |
| GET | `/api/torque/v2/activity` | No | Last 10 activities (NEW) |
| GET | `/api/torque/v2/groups` | No | Group leaderboards (NEW) |
| POST | `/api/torque/v2/scan` | Yes | Increment on each scan |
| POST | `/api/torque/v2/admin/reset` | Admin | Wipe all data |

---

## Points System (v3)

| Action | Points | Tracking |
|--------|--------|----------|
| Wallet scanned | 10 pts | Auto on scan |
| Group member scan | +group points | Broadcast to all groups |

---

## Rank Calculation

**Before (v1):** Expensive on every read
```javascript
const rank = await db.collection('torque_user_stats')
  .where('points', '>', userPoints)
  .count()  // Full collection scan!
```

**After (v2+):** Efficient on write only
```javascript
// Called only when user scans
await recalculateRanks()  // One-time batch update
await docRef.update({ rank: newRank })
```

---

## Read Reduction Results

| Metric | v1 | v2 | v3 |
|--------|-----|-----|-----|
| Reads per leaderboard view | ~5K/day | ~96/day | ~96/day |
| Activity feed polls | - | - | ~2K/day |
| Rank calculation | `.count()` | Cached | Cached |
| Leaderboard cache | 60-120s | 5 min | 5 min |
| **Total estimated** | ~49K/day | ~700/day | ~2.7K/day |

**v3 Firebase read estimate:**
- Leaderboard: 100 users × 4 polls/hour × 24h = 9,600/day ÷ 50 cache ratio = ~192
- Activity: 100 users × 3 polls/hour × 24h = 7,200/day ÷ 15s cache = ~480
- Groups: Minimal polling

**Well within free tier (50K/day).**

---

## Frontend Components (v3)

| Component | Location | Refresh | Description |
|-----------|---------|---------|-----------|
| `<TorqueLeaderboard>` | `components/TorqueLeaderboard.tsx` | 30s | Top 50 |
| `<ActivityFeed>` | `components/ActivityFeed.tsx` | 20s | Live feed (NEW) |
| RewardsPage tabs | `pages/RewardsPage.tsx` | - | campaigns / leaderboard / **activity** / groups |

**Activity Feed Features:**
- Real-time updates (20s poll interval)
- Animate in new entries
- Shows: username, wallet (shortened), chain, +10 pts, time ago
- Max 8 visible, scroll for more
- Empty state: "No recent scans yet"

---

## Telegram Commands (v3)

### Personal
```
/rewardslb → Shows top 10 + total scanned count
/personalrewardslb → Your scans, points, rank
```

### Group Setup
```
/registergroup → Register this group (admin only)
/groupstats → View group stats
/join → Join group leaderboard
/leave → Leave group leaderboard
```

### Group Scanning
```
/groupmode → Enable basic commands for everyone
/scan <address> → Scan any wallet
/contract <addr> → Analyze contracts
/token <addr> → Token prices
/rugcheck <addr> → Check if token is scam
/trending → Top tokens
/pmarkets → Polymarket markets
```

### Activity Broadcast
When a user scans in a registered group:
1. Points increment in `torque_wallets`
2. Activity saved to `torque_activity`
3. **Broadcast to all other registered groups:**
   ```
   🔍 username scanned 0x1234... on LINEA (+10 pts)
   ```

---

## Live Activity Feed Architecture

```
User scans in group
        |
        v
  torqueServiceV2.addActivity()
        |
        +---> Firestore: torque_activity (add)
        |     +---> Cleanup old entries (keep 20)
        |
        +---> broadcastActivity() (Telegram)
              |
              +---> Get recent activity
              +---> For each registered group:
                    +---> Skip originating group
                    +---> Send: "🔍 {name} scanned {addr}..."
              |
              v
        Web polls: GET /api/torque/v2/activity
              |
              +---> Redis cache (15s)
              +---> Return last 10
              +---> Frontend renders
```

### Why Broadcast to All Groups?
- Creates FOMO and social proof
- Users see activity across ecosystem
- Encourages more scanning
- Telegram groups get real-time updates without polling

### Quota Safety
- Activity writes: 1 per scan
- Activity reads: ~480/day (polling)
- Telegram sends: Free (server to server)

---

## Group Features

### Registration Flow
1. Admin runs `/registergroup`
2. Bot asks for group name
3. Group saved to `torque_groups`
4. Check Firestore first (prevents duplicates)

### Member Tracking
1. Members run `/join` in the group
2. Telegram ID added to `members` array
3. `memberCount` updated
4. Can run `/leave` to remove

### Duplicate Prevention (v3 fix)
```javascript
// Check Firestore before /registergroup
const existing = await db.collection('torque_groups')
  .where('chatId', '==', chatId)
  .get();

if (existing.size > 0) {
  // Show existing group, don't create new
}
```

---

## Manual Reset (Admin)

To wipe all data:
```bash
curl -X POST "https://your-api.com/api/torque/v2/admin/reset?secret=fundtracer-admin-2024"
```

---

## Environment Variables

```
TORQUE_API_KEY        # Torque ingest API key
TORQUE_INGEST_URL    # https://ingest.torque.so/events
REDIS_URL           # Redis for caching
ADMIN_SECRET        # For admin reset endpoint
TELEGRAM_BOT_TOKEN   # Telegram bot token
```

---

## Why This Wins Hackathons

| Factor | Why It Wins |
|--------|-----------|
| Works reliably | No quota issues |
| Telegram integration | Most won't integrate TG |
| Group features | Community-building angle |
| Live activity feed | Real-time excitement |
| Clean UI | Professional, not AI-looking |
| One metric | Confusing multi-campaign vs. simple |
| Production-ready caching | Others hit Firebase limits |

The biggest differentiator: **It just works.** Plus groups create community, and activity feed creates FOMO.

---

## What's Next (Roadmap)

- [ ] Rank change alerts (Telegram DM when overtaken)
- [ ] Achievement badges
- [ ] Shareable stats card
- [ ] Group vs group challenges
- [ ] Torque campaign leaderboards (when available)