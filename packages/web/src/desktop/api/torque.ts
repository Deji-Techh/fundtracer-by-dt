import { apiRequest } from './client';

export interface TorqueStats {
  points: number;
  rank: number;
  streak: number;
  walletsAnalyzed: number;
  sybilsDetected: number;
  referrals: number;
}

export async function getTorqueStats(userId?: string): Promise<TorqueStats> {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const data = await apiRequest<{ success: boolean; stats: TorqueStats }>(`/api/torque/stats/detailed${q}`);
  return data.stats || { points: 0, rank: 0, streak: 0, walletsAnalyzed: 0, sybilsDetected: 0, referrals: 0 };
}
