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
  private baseUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.apiKey = process.env.TORQUE_API_KEY || '';
    this.baseUrl = process.env.TORQUE_API_URL || 'https://api.torque.xyz/v1';
    this.isEnabled = !!this.apiKey;
    
    if (this.isEnabled) {
      console.log('[Torque] Service enabled');
    } else {
      console.log('[Torque] Service disabled - no API key configured');
    }
  }

  private async request<T>(endpoint: string, method: string, body?: unknown): Promise<T | null> {
    if (!this.isEnabled) {
      console.log(`[Torque] ${method} ${endpoint} - disabled (no API key)`);
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[Torque] Error ${response.status}: ${error}`);
        return null;
      }

      return response.json();
    } catch (error) {
      console.error('[Torque] Request failed:', error);
      return null;
    }
  }

  // Track custom events (wallet analyzed, sybil detected, etc.)
  async trackEvent(event: TorqueEvent): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`[Torque] Event tracked (simulated): ${event.event} - ${event.userId}`);
      return true;
    }

    const result = await this.request<{ success: boolean }>('/events', 'POST', {
      user_id: event.userId,
      event: event.event,
      metadata: event.metadata,
      timestamp: event.timestamp
    });

    return !!result?.success;
  }

  // Trigger incentive/reward distribution
  async triggerReward(reward: TorqueReward): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`[Torque] Reward triggered (simulated): ${reward.campaignId} - ${reward.amount} to ${reward.recipient}`);
      return true;
    }

    const result = await this.request<{ success: boolean }>('/incentives/trigger', 'POST', {
      campaign_id: reward.campaignId,
      recipient: reward.recipient,
      amount: reward.amount,
      reason: reward.reason
    });

    return !!result?.success;
  }

  // Get leaderboard rankings
  async getLeaderboard(campaignId: string): Promise<LeaderboardEntry[]> {
    if (!this.isEnabled) {
      return [];
    }

    const result = await this.request<{ entries: LeaderboardEntry[] }>(`/leaderboards/${campaignId}`, 'GET');
    return result?.entries || [];
  }

  // Submit score to leaderboard
  async submitScore(campaignId: string, userId: string, score: number): Promise<boolean> {
    if (!this.isEnabled) {
      console.log(`[Torque] Score submitted (simulated): ${userId} - ${score} points`);
      return true;
    }

    const result = await this.request<{ success: boolean }>(`/leaderboards/${campaignId}/submit`, 'POST', {
      user_id: userId,
      score
    });

    return !!result?.success;
  }

  // Get user points/rank
  async getUserStats(userId: string): Promise<{ points: number; rank: number; streak: number } | null> {
    if (!this.isEnabled) {
      return null;
    }

    const result = await this.request<{ points: number; rank: number; streak: number }>(`/users/${userId}/stats`, 'GET');
    return result;
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