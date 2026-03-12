// Fallback SolanaDrawer Component
// Temporary mock to avoid crashes for /app-solana

import React from 'react';
import './SolanaDrawer.css'; // Ensure this matches existing style imports

export default function SolanaDrawer() {
  return (
    <div className="solana-drawer">
      <h1>Solana Drawer Placeholder</h1>
      <p>This is a mock/fallback version of SolanaDrawer.</p>
    </div>
  );
}