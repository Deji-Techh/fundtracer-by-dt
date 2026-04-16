// ============================================================
// FundTracer by DT - Torque Integration Service
// Growth primitives: leaderboards, raffles, rewards
// ============================================================

interface TorqueEvent {
  userId: string;
  event: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

interface TorqueReward {
  campaignId: string;
  recipient: string;
  amount: string;
  reason?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  change: number;
}

class TorqueService {
  private apiKey: string;
  private ingestUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.apiKey = process.env.TORQUE_API_KEY || '';
    this.ingestUrl = process.env.TORQUE_INGEST_URL || 'https://ingest.torque.so/events';
    this.isEnabled = !!this.apiKey;
    
    if (this.isEnabled) {
      console.log('[Torque] Service enabled with ingestion API');
    } else {
      console.log('[Torque] Service disabled - no API key configured');
    }
  }

  private async sendEvent(event: {
    userPubkey: string;
    eventName: string;
    timestamp: number;
    data: Record<string, string | number | boolean>;
  }): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`[Torque] Event tracked (simulated): ${event.eventName} - ${event.userPubkey}`);
      return true;
    }

    try {
      const response = await fetch(this.ingestUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[Torque] Event Error ${response.status}: ${error}`);
        return false;
      }

      console.log(`[Torque] Event sent: ${event.eventName} from ${event.userPubkey}`);
      return true;
    } catch (error) {
      console.error('[Torque] Event request failed:', error);
      return false;
    }
  }

  // Track custom events - maps to Torque's custom event field schema
  async trackEvent(event: TorqueEvent): Promise<boolean> {
    const metadata = event.metadata || {};
    
    const data: Record<string, string | number | boolean> = {};
    
    switch (event.event) {
      case 'wallet_analyzed':
        data.chain = metadata.chain as string;
        data.risk_score = metadata.risk_score as number;
        data.tx_count = metadata.tx_count as number;
        data.has_suspicious = metadata.has_suspicious as boolean;
        break;
        
      case 'sybil_detected':
        data.flagged_addresses = metadata.flagged_addresses as number;
        data.cluster_count = metadata.cluster_count as number;
        break;
        
      case 'contract_analyzed':
        data.chain = metadata.chain as string;
        data.interactor_count = metadata.interactor_count as number;
        break;
        
      case 'compare_wallets':
        data.wallet_count = metadata.wallet_count as number;
        data.correlation_score = metadata.correlation_score as number;
        break;
        
      case 'first_analysis':
        data.chain = metadata.chain as string;
        data.risk_score = metadata.risk_score as number;
        break;
        
      default:
        if (metadata.chain) data.chain = metadata.chain as string;
        if (metadata.risk_score) data.risk_score = metadata.risk_score as number;
        if (metadata.tx_count) data.tx_count = metadata.tx_count as number;
        if (metadata.has_suspicious) data.has_suspicious = metadata.has_suspicious as boolean;
    }

    const eventPayload = {
      userPubkey: event.userId,
      eventName: event.event,
      timestamp: event.timestamp,
      data
    };

    return this.sendEvent(eventPayload);
  }

  // Trigger incentive/reward distribution (if needed in future)
  async triggerReward(reward: TorqueReward): Promise<boolean> {
    console.log(`[Torque] Reward triggered (simulated): ${reward.campaignId} - ${reward.amount} to ${reward.recipient}`);
    return true;
  }

  // Get leaderboard rankings
  async getLeaderboard(campaignId: string): Promise<LeaderboardEntry[]> {
    console.log(`[Torque] Get leaderboard: ${campaignId} (requires separate API)`);
    return [];
  }

  // Submit score to leaderboard
  async submitScore(campaignId: string, userId: string, score: number): Promise<boolean> {
    console.log(`[Torque] Score submitted (simulated): ${userId} - ${score} points`);
    return true;
  }

  // Get user points/rank
  async getUserStats(userId: string): Promise<{ points: number; rank: number; streak: number } | null> {
    console.log(`[Torque] Get user stats: ${userId} (requires separate API)`);
    return null;
  }
}

export const torqueService = new TorqueService();

// Event types for tracking
export const TORQUE_EVENTS = {
  FIRST_ANALYSIS: 'first_analysis',
  WALLET_ANALYZED: 'wallet_analyzed',
  CONTRACT_ANALYZED: 'contract_analyzed',
  SYBIL_DETECTED: 'sybil_detected',
  HIGH_RISK_FOUND: 'high_risk_found',
  COMPARE_WALLETS: 'compare_wallets',
  FUNDING_TREE_GENERATED: 'funding_tree_generated',
  NFT_PORTFOLIO_VIEW: 'nft_portfolio_view',
  DAILY_STREAK_7: 'daily_streak_7',
  DAILY_STREAK_30: 'daily_streak_30',
  SHARE_ON_TWITTER: 'share_on_twitter',
  INVITE_FRIEND: 'invite_friend'
} as const;

// Campaign IDs
export const TORQUE_CAMPAIGNS = {
  EARLY_ADOPTER: 'early-adopter-rewards',
  SYBIL_HUNTER: 'sybil-hunter-leaderboard',
  ANALYZER_STREAK: 'active-analyst-streak',
  TOP_ANALYZER: 'top-analyzer-championship',
  VIRAL_SHARE: 'viral-share-bonus',
  REFERRAL: 'referral-program'
} as const;

// Helper to track analysis events
export async function trackAnalysisEvent(
  userId: string,
  event: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await torqueService.trackEvent({
    userId,
    event,
    metadata,
    timestamp: Date.now()
  });
}