import React from 'react';
import LandingPage from './pages/LandingPage';
import EVMTabs from './EVMTabs';
import SolanaPage from './components/SolanaPage';
import './global.css';

function App() {
  const pathname = window.location.pathname;
  
  // Solana app routes
  if (pathname.startsWith('/app-solana')) {
    return <SolanaPage />;
  }
  
  // EVM app routes
  if (pathname.startsWith('/app-evm')) {
    return <EVMTabs />;
  }
  
  // Landing page
  if (pathname === '/') {
    return <LandingPage />;
  }
  
  // Redirect unknown routes to landing
  return <LandingPage />;
}

export default App;
