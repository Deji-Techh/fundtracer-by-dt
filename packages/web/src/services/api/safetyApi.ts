export interface SafetyCheck {
  isVerified: boolean;
  hasMintFunction: boolean | null;
  isHoneypot: boolean;
  liquidityLocked: boolean | null;
  ownershipRenounced: boolean | null;
  hiddenFunctions: boolean | null;
}

export interface SafetyData {
  contractAddress: string;
  isHoneypot: boolean;
  riskScore: number;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  warnings: string[];
  checks: SafetyCheck;
  recommendation: 'safe' | 'caution' | 'avoid';
}

export const safetyApi = {
  async check(contractAddress: string): Promise<SafetyData> {
    const response = await fetch('/api/safety/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contractAddress }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check token safety');
    }

    return response.json();
  },
};

export default safetyApi;
