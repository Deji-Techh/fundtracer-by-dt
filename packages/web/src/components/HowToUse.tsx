import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, Globe, Shield, Zap, Wallet } from 'lucide-react';

interface HowToUseProps {
    isOpen: boolean;
    onToggle: () => void;
}

function HowToUse({ isOpen, onToggle }: HowToUseProps) {
    return (
        <div className="how-to-use">
            <button className="how-to-use-toggle" onClick={onToggle}>
                <span>How to Use FundTracer</span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {isOpen && (
                <div className="how-to-use-content">
                    <div className="use-section">
                        <div className="use-icon">
                            <Wallet size={24} />
                        </div>
                        <div className="use-details">
                            <h3>Getting Started</h3>
                            <ol>
                                <li>Connect your wallet (MetaMask, WalletConnect, Coinbase, etc.)</li>
                                <li>Select the blockchain network (Ethereum, Linea, Base, etc.)</li>
                                <li>Enter a wallet address to analyze</li>
                                <li>View funding sources, destinations, and risk indicators</li>
                            </ol>
                            <p className="use-note">Free tier: 7 analyses per day. Upgrade your plan for more access.</p>
                        </div>
                    </div>

                    <div className="use-section">
                        <div className="use-icon">
                            <Globe size={24} />
                        </div>
                        <div className="use-details">
                            <h3>Analysis Types</h3>
                            <ul className="detection-list">
                                <li><Zap size={14} /> <strong>Wallet Analysis</strong> — Trace funding sources &amp; destinations</li>
                                <li><Zap size={14} /> <strong>Sybil Detection</strong> — Detect linked wallets &amp; farming patterns</li>
                                <li><Zap size={14} /> <strong>Contract Analysis</strong> — Inspect smart contract interactions</li>
                                <li><Zap size={14} /> <strong>Wallet Compare</strong> — Compare multiple wallets side-by-side</li>
                            </ul>
                        </div>
                    </div>

                    <div className="use-section">
                        <div className="use-icon">
                            <Shield size={24} />
                        </div>
                        <div className="use-details">
                            <h3>What We Detect</h3>
                            <ul className="detection-list">
                                <li><Zap size={14} /> Rapid fund movement (flash loans, MEV)</li>
                                <li><Zap size={14} /> Same-block transactions (bot activity)</li>
                                <li><Zap size={14} /> Circular fund flows (wash trading)</li>
                                <li><Zap size={14} /> Sybil farming patterns</li>
                                <li><Zap size={14} /> Fresh wallet with high activity</li>
                                <li><Zap size={14} /> Dust attacks</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HowToUse;
