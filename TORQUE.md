# FundTracer x Torque — Equity Rewards Engine (v3)

> How FundTracer uses Torque for growth primitives — now with groups, activity feed, Telegram broadcast, and Web + Telegram scanning.

## The Evolution

| Version | Key Feature | Limitation |
|---------|-----------|----------|
| v1 | Multiple campaigns | 49K reads/day quota issues |
| v2 | Single leaderboard, rank on write | No groups, no live feed |
| **v3** | Groups + Live activity + Web/TG scanning | Production-ready |

## Architecture (v3)

### Web Scanning Flow
```
User scans on fundtracer.xyz
        |
        v
  POST /api/analyze/wallet
        |
        v
  torqueServiceV2.incrementScan(userId)
        |
        +---> Firestore: torque_wallets/{uid}
        |     walletsScanned +1, totalPoints +10
        |     rank recalculated (on write)
        |
        +---> Firestore: torque_activity
        |     activity entry added
        |
        +---> Torque Ingest API (async)
        |
        v
  Live activity feed updates
```

### Telegram Group Scanning Flow
```
User scans in Telegram group
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
        +---> Firestore: torque_activity
        |     activity entry added
        |
        +---> Torque Ingest API (async)
        |
        +---> Telegram broadcast
              "🔍 username scanned 0x1234... on LINEA (+10 pts)"
              (broadcasts to all OTHER registered groups)
        
        v
  Live activity feed updates
  Telegram groups notified
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
| GET | `/api/torque-v2/leaderboard` | No | Top 50 leaderboard |
| GET | `/api/torque-v2/mystats` | Yes | User's stats + rank |
| GET | `/api/torque-v2/activity` | No | Last 10 activities (NEW) |
| GET | `/api/torque-v2/groups` | No | Group leaderboards (NEW) |
| POST | `/api/torque-v2/scan` | Yes | Increment on each scan |
| POST | `/api/torque-v2/admin/reset` | Admin | Wipe all data |

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
| `<ActivityFeed>` | `components/ActivityFeed.tsx` | 20s | Live feed (web + TG scans) |
| RewardsPage tabs | `pages/RewardsPage.tsx` | - | campaigns / leaderboard / activity / groups |

**Activity Feed Features:**
- Real-time updates (20s poll interval)
- Captures BOTH web scans AND Telegram group scans
- Telegram broadcasts to all OTHER groups (creates cross-group FOMO)
- Animate in new entries
- Max 8 visible, scroll for more
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
        Web polls: GET /api/torque-v2/activity
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
- Activity writes: 1 per scan (web + TG)
- Activity reads: ~480/day (polling)
- Telegram sends: Free (server to server)

### Firestore-First Pattern (v3 fix)
All group commands now check Firestore BEFORE memory:
- `/groupstats` → loads from Firestore if not in memory
- `/join` → loads from Firestore if not in memory
- `/leave` → loads from Firestore if not in memory
- `/registergroup` → prevents duplicate groups
- Group scan → loads group from Firestore before updating

This ensures groups survive server restarts. Memory is cache, Firestore is source of truth.

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
curl -X POST "https://your-api.com/api/torque-v2/admin/reset?secret=fundtracer-admin-2024"
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
| Web + Telegram | Dual entry point for users |
| Telegram integration | Most won't integrate TG |
| Group features | Community-building angle |
| Live activity feed | Real-time excitement + FOMO |
| Telegram broadcast | Cross-group visibility |
| Clean UI | Professional, not AI-looking |
| One metric | Confusing multi-campaign vs. simple |
| Production-ready caching | Others hit Firebase limits |
| Firestore-first pattern | Survives server restarts |

The biggest differentiator: **It just works.** Plus:
- Groups create community
- Activity feed creates FOMO
- Dual scanning (web + TG) maximizes engagement

---

## Manual Equity Distribution Model

Since Torque incentives are configured on-chain, FundTracer uses a manual distribution approach:

| Component | Implementation |
|-----------|----------------|
| Leaderboard | Tracks wallets scanned per user |
| Points | 10 points per wallet analyzed |
| Ranking | Top scanners eligible for equity |
| Distribution | Manual allocation (off-chain) |

**Why Manual:**

- Full control over eligibility criteria
- Can exclude sybil/suspicious accounts
- Simpler for hackathon timeline
- Can integrate Torque MCP later for automation

**Growth Loop:**

```
User scans wallet -> +10 points -> Rank updates -> Competition drives more scans
```

**Distribution Logic:**

1. Monthly snapshot of leaderboard
2. Top N users eligible (based on budget)
3. Manual token/Airdrop distribution
4. Optional: Integrate Torque campaigns later for automation

---

## CLI Integration

FundTracer CLI connects to Torque for reward tracking:

### Linking Flow (v3 - Updated)

```bash
# 1. Open fundtracer.xyz/cli in browser
# 2. Sign in with Google  
# 3. Click "Generate Link Code" button
# 4. Run in terminal:
fundtracer link FT-XXXX
```

### Commands

| Command | Description |
|---------|-------------|
| `fundtracer analyze <address>` | Analyze a single wallet |
| `fundtracer compare <addresses...>` | Compare wallets for Sybil detection |
| `fundtracer portfolio <address>` | View NFT and token holdings |
| `fundtracer batch <file>` | Analyze multiple wallets from a file |
| `fundtracer interactive` | Start interactive mode |
| `fundtracer config` | Configure API keys |
| `fundtracer link <code>` | Link CLI to web account |
| `fundtracer rewards` | View leaderboard and stats |

### How It Works

1. Web user signs in at `/cli` page
2. Calls `/api/torque-v2/cli/link/generate` (requires auth)
3. Returns 4-char code (e.g., `FT-5CAE`) with 5-min expiry
4. Code saved to `torque_cli_links` collection
5. CLI calls `/api/torque-v2/cli/link/verify` with code
6. Links user's Firebase ID to CLI session

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/torque-v2/cli/link/generate` | Yes | Generate link code |
| POST | `/api/torque-v2/cli/link/verify` | No | Verify and link CLI |
| POST | `/api/torque-v2/cli/scan` | No | Record scan (+10 pts) |

### Rewards Tracking

```bash
# Automatic (default) - tracks each scan
fundtracer analyze 0x...

# Skip tracking
fundtracer analyze 0x... --no-track

# View leaderboard
fundtracer rewards

# Your stats
fundtracer rewards --me
```

### CLI Scan Tracking

Each `fundtracer analyze` call:
1. Sends wallet address to `/cli/scan` endpoint
2. Backend adds +10 points to leaderboard
3. Adds activity entry to feed
4. Returns success (silent failure)

CLI scans appear in activity feed with "cli" chain indicator.

### Solana Scanning

FundTracer CLI also supports Solana wallet scanning:

FundTracer now supports Solana wallet scanning with Torque rewards:

### Endpoints That Count

| Method | Endpoint | Points | Activity |
|--------|----------|--------|----------|
| GET | `/api/solana/portfolio/:addr` | +10 | Yes |
| GET | `/api/solana/risk/:addr` | +10 | Yes |

### How It Works

1. User scans Solana wallet on web or via API
2. Backend checks auth (user must be logged in)
3. Calls `torqueServiceV2.incrementScan(userId, displayName)`
4. Adds activity entry with chain = "solana"
5. Leaderboard and activity feed update

### Activity Feed

CLI scans show chain in activity:
- `cli` - Command-line interface scans
- `solana` - Solana wallet scans  
- `eth`, `linea`, etc. - Web chain scans

---

## What's Next (Roadmap)

- [ ] Rank change alerts (Telegram DM when overtaken)
- [ ] Achievement badges
- [ ] Shareable stats card
- [ ] Group vs group challenges
- [ ] Torque campaign leaderboards (when available)