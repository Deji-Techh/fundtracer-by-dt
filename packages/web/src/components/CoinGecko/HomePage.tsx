import React from 'react';
import { TerminalLayout } from '../Terminal';

interface HomePageProps {
  walletAddress?: string;
  onWalletClick?: () => void;
}

// New FundTracer Terminal - Professional DEX Terminal Interface
const HomePage: React.FC<HomePageProps> = () => {
  return <TerminalLayout />;
};

export default HomePage;
