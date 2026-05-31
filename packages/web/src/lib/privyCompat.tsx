import type { ReactNode } from 'react';

type PrivyUser = {
  wallet?: { address?: string };
  linkedAccounts?: Array<Record<string, unknown>>;
} | null;

const noopAsync = async () => {};

export function PrivyProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function usePrivy() {
  return {
    ready: true,
    authenticated: false,
    user: null as PrivyUser,
    login: noopAsync,
    logout: noopAsync,
    connectWallet: noopAsync,
    linkWallet: noopAsync,
    unlinkWallet: noopAsync,
    getAccessToken: async () => null,
  };
}
