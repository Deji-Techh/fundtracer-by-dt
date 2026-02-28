import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EVMTabs from './EVMTabs';
import SolanaPage from './components/SolanaPage';
import { SolanaWalletProvider } from './providers/SolanaWalletProvider';
import './styles/ios-glass.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app-evm/*" element={<EVMTabs />} />
        <Route path="/app-solana/*" element={
          <SolanaWalletProvider>
            <SolanaPage />
          </SolanaWalletProvider>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
