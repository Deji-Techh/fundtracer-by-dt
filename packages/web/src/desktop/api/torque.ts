import { apiRequest } from './client';

export interface TorqueStats {
  points: number;
  rank: number;
  streak: number;
  walletsAnalyzed: number;
  sybilsDetected: number;
  referrals: number;
}

interface TorqueV2Stats {
  walletsScanned: number;
  totalPoints: number;
  rank: number;
  totalScans: number;
}

export async function getTorqueStats(userId?: string): Promise<TorqueStats> {
  const data = await apiRequest<{ success: boolean; stats: TorqueV2Stats }>('/api/torque-v2/mystats');
  const s = data.stats || { walletsScanned: 0, totalPoints: 0, rank: 0, totalScans: 0 };
  return {
    points: s.totalPoints,
    rank: s.rank,
    streak: 0,
    walletsAnalyzed: s.walletsScanned,
    sybilsDetected: 0,
    referrals: 0,
  };
}
