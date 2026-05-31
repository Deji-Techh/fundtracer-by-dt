import { apiRequest, setAuthToken } from './client';

export interface UserProfile {
  uid: string;
  name?: string;
  displayName?: string;
  username?: string;
  email?: string;
  tier?: 'free' | 'pro' | 'max';
  isVerified?: boolean;
  walletAddress?: string | null;
  profilePicture?: string | null;
  authProvider?: 'wallet' | 'google' | 'twitter' | 'email' | 'api_key';
  usage: {
    today: number;
    limit: number | 'unlimited';
    remaining: number | 'unlimited';
  };
}

export async function getProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/user/profile');
}

export async function updateProfile(data: { displayName?: string; profilePicture?: string }): Promise<{ success: boolean; user: UserProfile }> {
  return apiRequest('/api/user/profile', 'POST', data);
}
