import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const abbreviationDescriptions: Record<string, string> = {
  ETH: 'Ethereum - The native cryptocurrency of the Ethereum blockchain',
  TVL: 'Total Value Locked - The total value of assets staked or deposited in a protocol',
  MCAP: 'Market Capitalization - Total market value of a token (price × circulating supply)',
  FDV: 'Fully Diluted Valuation - Market cap if all tokens were in circulation',
  VOL: 'Volume - Total trading activity over a 24-hour period',
  TX: 'Transaction - A transfer of value on the blockchain',
  TXS: 'Transactions - Number of blockchain transactions',
  SENT: 'Sent - Total value transferred OUT of the wallet',
  RECV: 'Received - Total value transferred INTO the wallet',
  GAS: 'Gas - Computational cost required to execute a transaction on Ethereum',
  APR: 'Annual Percentage Rate - Estimated yearly return on investment',
  APY: 'Annual Percentage Yield - Yearly return accounting for compound interest',
  LP: 'Liquidity Provider - User who provides assets to a liquidity pool',
  NFT: 'Non-Fungible Token - Unique digital asset stored on blockchain',
  DeFi: 'Decentralized Finance - Financial services built on blockchain without intermediaries',
  ROI: 'Return on Investment - Profit or loss relative to initial investment',
  DAO: 'Decentralized Autonomous Organization - Blockchain-based organization governed by code',
  ENS: 'Ethereum Name Service - Human-readable domain for crypto addresses',
  PoH: 'Proof of Humanity - Identity verification system on Ethereum',
  SYBIL: 'Sybil Attack - Creating multiple fake identities to manipulate a network',
  KYC: 'Know Your Customer - Identity verification process',
  AML: 'Anti-Money Laundering - Regulations to prevent illegal fund transfers',
  HODL: 'Hold On for Dear Life - Strategy of long-term crypto holding',
  whale: 'Whale - Large cryptocurrency holder with significant influence',
  rug: 'Rug Pull - Developer abandons project after collecting funds',
  sniper: 'Sniper - Bot that buys tokens immediately after launch',
  mint: 'Mint - Creating new tokens or NFTs',
  burn: 'Burn - Permanently removing tokens from circulation',
  stake: 'Stake - Locking tokens to earn rewards or secure network',
  bridge: 'Bridge - Protocol that transfers assets between blockchains',
};

interface TooltipProps {
  children: React.ReactNode;
  abbreviation?: string;
  content?: string;
}

export function Tooltip({ children, abbreviation, content }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const tooltipContent = content || (abbreviation ? abbreviationDescriptions[abbreviation.toUpperCase()] : '');

  if (!tooltipContent) {
    return <>{children}</>;
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
    setIsVisible(true);
  };

  return (
    <span
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.span
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              padding: '8px 12px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: '0.8125rem',
              color: 'var(--color-text-primary)',
              whiteSpace: 'normal',
              maxWidth: 280,
              wordBreak: 'break-word',
              zIndex: 9999,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none',
            }}
          >
            {abbreviation && (
              <span style={{
                display: 'block',
                fontWeight: 600,
                color: 'var(--color-accent)',
                marginBottom: 4,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {abbreviation.toUpperCase()}
              </span>
            )}
            {tooltipContent}
            <span style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid var(--color-bg-elevated)',
            }} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function LabelWithTooltip({ label, abbreviation }: { label: string; abbreviation: string }) {
  return (
    <Tooltip abbreviation={abbreviation}>
      <span style={{
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: 2,
      }}>
        {label}
      </span>
    </Tooltip>
  );
}
