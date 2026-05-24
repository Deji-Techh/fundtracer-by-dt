import crypto from 'crypto';

export function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

export function generateInviteUrl(inviteCode: string): string {
  return `https://fundtracer.xyz/app-evm/room?invite=${inviteCode}`;
}

export function getExpiryDate(hoursFromNow: number = 168): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}
