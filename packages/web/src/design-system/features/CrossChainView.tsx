/**
 * CrossChainView - Cross-Chain Bridge Tracing
 * Detect and visualize bridge transactions across chains
 */

import React, { useState, useCallback } from 'react';
import { ChainId, CHAINS } from '@fundtracer/core';
import { getAuthToken } from '../../api';
import './CrossChainView.css';
import './InvestigateView.css';

interface CrossChainViewProps {
  selectedChain?: ChainId;
}

type TraceStatus = 'idle' | 'loading' | 'complete' | 'error';

interface BridgeEvent {
  bridge: string;
  sourceTx: string;
  destChain: string;
  destAddress?: string;
  amount: string;
  tokenBridged: string;
  timestamp: number;
}

interface TraceResult {
  sourceChain: string;
  sourceAddress: string;
  bridgeEvents: BridgeEvent[];
}

export function CrossChainView({ selectedChain = 'linea' }: CrossChainViewProps) {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<TraceStatus>('idle');
  const [result, setResult] = useState<TraceResult | null>(null);
  const [error, setError] = useState('');

  const handleTrace = useCallback(async () => {
    if (!address.trim()) return;

    setStatus('loading');
    setResult(null);
    setError('');

    try {
      const token = getAuthToken();
      const response = await fetch('/api/analyze/bridge-trace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ address: address.trim(), chain: selectedChain }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Trace failed' }));
        throw new Error(err.message || 'Bridge trace failed');
      }

      const data = await response.json();
      setResult(data);
      setStatus('complete');
    } catch (err: any) {
      setError(err.message || 'Trace failed');
      setStatus('error');
    }
  }, [address, selectedChain]);

  const chainName = (id: string) => {
    const chain = CHAINS[id as ChainId];
    return chain?.name || id;
  };

  return (
    <div className="crosschain-view">
      <div className="page-head">
        <div className="page-title">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
            <path d="M1 4l4-3v6l-4-3zM13 4l-4-3v6l4-3z"/>
            <path d="M5 7l2-1 2 1M7 6v7"/>
            <path d="M3 11l2 2 2-2"/>
          </svg>
          Cross-Chain Tracing
        </div>
        <div className="page-desc">Follow funds across blockchain bridges — detect Wormhole, Mayan, Allbridge, and more</div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="field-label">Wallet Address to Trace</div>
          <div className="addr-field">
            <div className="addr-bar">
              <span className="addr-label">{selectedChain.toUpperCase()}</span>
            </div>
            <input
              className="ft-addr-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x… wallet address"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && status !== 'loading') handleTrace();
              }}
              disabled={status === 'loading'}
            />
          </div>

          <div className="hint">
            Detects bridge transactions to Wormhole, Mayan, Allbridge, deBridge, LayerZero, Stargate, Across.
          </div>

          <div className="actions">
            <button className="btn-analyze" onClick={handleTrace} disabled={!address.trim() || status === 'loading'}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5l3 3"/>
              </svg>
              {status === 'loading' ? 'Tracing...' : 'Trace Bridges'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="crosschain-loading">
              <div className="graph-loading-spinner" />
              <p>Scanning for bridge transactions across chains...</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {status === 'complete' && result && result.bridgeEvents.length === 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="crosschain-empty">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" style={{ width: 60, height: 60 }}>
                <circle cx="20" cy="20" r="16"/>
                <path d="M12 20h16M20 12v16"/>
              </svg>
              <h3>No Bridge Activity Detected</h3>
              <p>This wallet has no detected bridge transactions on {chainName(selectedChain)}.</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {status === 'complete' && result && result.bridgeEvents.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="crosschain-summary">
              <div className="crosschain-summary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 4l4-3v6l-4-3zM23 4l-4-3v6l4-3z"/>
                  <path d="M5 7l2-1 2 1"/>
                  <path d="M17 7l2-1 2 1"/>
                  <path d="M9 12l3-1 3 1"/>
                  <path d="M12 11v10"/>
                  <path d="M8 21h8"/>
                </svg>
              </div>
              <div className="crosschain-summary-text">
                Found <strong>{result.bridgeEvents.length}</strong> bridge transaction{result.bridgeEvents.length > 1 ? 's' : ''}
              </div>
            </div>

            <div className="crosschain-timeline">
              {result.bridgeEvents.map((evt, idx) => (
                <div key={idx} className="crosschain-event">
                  <div className="crosschain-event-line" />
                  <div className="crosschain-event-dot" />
                  <div className="crosschain-event-card">
                    <div className="crosschain-event-header">
                      <span className="crosschain-event-bridge">{evt.bridge}</span>
                      <span className="crosschain-event-amount">{evt.amount} {evt.tokenBridged}</span>
                    </div>
                    <div className="crosschain-event-chains">
                      <span className="crosschain-chain-badge crosschain-chain-source">{chainName(selectedChain)}</span>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
                        <path d="M2 8h12M8 2l6 6-6 6"/>
                      </svg>
                      <span className="crosschain-chain-badge crosschain-chain-dest">{chainName(evt.destChain)}</span>
                    </div>
                    <div className="crosschain-event-details">
                      <span className="crosschain-event-tx">Tx: {evt.sourceTx.slice(0, 10)}...</span>
                      {evt.destAddress && (
                        <span className="crosschain-event-dest">→ {evt.destAddress.slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="investigate-error">
              <div className="investigate-error__title">Trace Failed</div>
              <p className="investigate-error__message">{error}</p>
              <button className="btn-analyze" onClick={handleTrace} style={{ marginTop: 12 }}>
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrossChainView;
