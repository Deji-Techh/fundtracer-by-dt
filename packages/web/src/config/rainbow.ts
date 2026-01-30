import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  linea,
  mainnet,
  arbitrum,
} from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '50d2e6a49b5c231708de8e982bf538d5';

export const config = getDefaultConfig({
  appName: 'FundTracer',
  appDescription: 'Trace with Precision. Scale with Confidence.',
  appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://fundtracer.xyz',
  projectId,
  chains: [linea, mainnet, arbitrum],
  ssr: false, // We're not using SSR
});
