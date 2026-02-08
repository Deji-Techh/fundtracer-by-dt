/**
 * SybilAnalysis - Integrated advanced Sybil detection component
 * Combines FeatureExtractor, ClusteringEngine, CaseManager, and EvidenceExporter
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Users, 
  Target, 
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Share2,
  Save
} from 'lucide-react';
import { useSybilAnalysis } from '../../hooks/useSybilAnalysis';
import { CaseManagerPanel } from './CaseManagerPanel';
import { ExportPanel } from './ExportPanel';
import { useNotify } from '../../contexts/ToastContext';
import { InvestigationCase } from '../../services/CaseManager';

interface SybilAnalysisProps {
  initialAddresses?: string[];
  initialChain?: string;
}

export const SybilAnalysis: React.FC<SybilAnalysisProps> = ({
  initialAddresses = [],
  initialChain = 'linea'
}) => {
  // State
  const [addresses, setAddresses] = useState<string[]>(initialAddresses);
  const [addressInput, setAddressInput] = useState('');
  const [chain, setChain] = useState(initialChain);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Analysis hook
  const { state, result, currentCase, analyze, abort, reset } = useSybilAnalysis(currentCaseId);
  const notify = useNotify();

  // Handle address input
  const handleAddAddresses = () => {
    if (!addressInput.trim()) return;
    
    // Parse addresses (comma, space, or newline separated)
    const newAddresses = addressInput
      .split(/[\s,]+/)
      .map(addr => addr.trim())
      .filter(addr => addr.length === 42 && addr.startsWith('0x'));
    
    if (newAddresses.length === 0) {
      notify.error('No valid Ethereum addresses found');
      return;
    }
    
    const uniqueAddresses = [...new Set([...addresses, ...newAddresses])];
    setAddresses(uniqueAddresses);
    setAddressInput('');
    notify.success(`Added ${newAddresses.length} addresses`);
  };

  // Remove address
  const removeAddress = (addr: string) => {
    setAddresses(addresses.filter(a => a !== addr));
  };

  // Start analysis
  const startAnalysis = async () => {
    if (addresses.length < 3) {
      notify.error('Need at least 3 addresses for clustering');
      return;
    }
    
    if (addresses.length > 500) {
      notify.warning('Large dataset - analysis may take 30-60 seconds');
    }
    
    setShowResults(true);
    await analyze(addresses, chain, {
      onProgress: (message, progress) => {
        console.log(`[Analysis] ${progress}%: ${message}`);
      },
      saveSnapshot: !!currentCaseId
    });
  };

  // Handle case selection
  const handleCaseSelect = (caseId: string | null) => {
    setCurrentCaseId(caseId);
  };

  // Handle case creation
  const handleCaseCreate = (case_: InvestigationCase) => {
    setCurrentCaseId(case_.id);
    notify.success(`Created case: ${case_.name}`);
  };

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#fff',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Target size={32} color="#60a5fa" />
          Advanced Sybil Detection
        </h1>
        <p style={{ color: '#6b7280', fontSize: '15px' }}>
          Multi-algorithm forensic analysis with explainable clustering and tamper-proof evidence
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
        {/* Left Panel - Case Management & Input */}
        <div>
          {/* Case Manager */}
          <CaseManagerPanel
            currentCaseId={currentCaseId}
            onCaseSelect={handleCaseSelect}
            onCaseCreate={handleCaseCreate}
          />

          {/* Address Input */}
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              color: '#fff', 
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Users size={18} color="#60a5fa" />
              Wallet Addresses
              <span style={{ 
                background: '#333', 
                padding: '2px 8px', 
                borderRadius: '12px',
                fontSize: '12px',
                color: '#9ca3af'
              }}>
                {addresses.length}
              </span>
            </h3>

            {/* Chain Selector */}
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0f0f0f',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '12px'
              }}
            >
              <option value="linea">Linea</option>
              <option value="ethereum">Ethereum</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
              <option value="polygon">Polygon</option>
            </select>

            {/* Address Input Area */}
            <textarea
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Paste addresses (comma, space, or newline separated)...&#10;0x1234...&#10;0x5678..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0f0f0f',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                resize: 'vertical',
                marginBottom: '12px',
                fontFamily: 'monospace'
              }}
            />

            <button
              onClick={handleAddAddresses}
              disabled={!addressInput.trim()}
              style={{
                width: '100%',
                padding: '10px',
                background: addressInput.trim() ? '#2a2a2a' : '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: addressInput.trim() ? '#fff' : '#6b7280',
                fontSize: '13px',
                cursor: addressInput.trim() ? 'pointer' : 'not-allowed',
                marginBottom: '16px'
              }}
            >
              Add Addresses
            </button>

            {/* Address List */}
            {addresses.length > 0 && (
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                {addresses.map((addr, i) => (
                  <div
                    key={addr}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: '#0f0f0f',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  >
                    <span style={{ color: '#9ca3af' }}>
                      {i + 1}. {addr.slice(0, 8)}...{addr.slice(-6)}
                    </span>
                    <button
                      onClick={() => removeAddress(addr)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Analysis Button */}
            <button
              onClick={state.status === 'extracting' || state.status === 'clustering' ? abort : startAnalysis}
              disabled={addresses.length < 3}
              style={{
                width: '100%',
                padding: '14px',
                background: state.status === 'extracting' || state.status === 'clustering' 
                  ? '#ef4444' 
                  : addresses.length < 3 
                    ? '#1a1a1a' 
                    : '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: addresses.length < 3 ? 'not-allowed' : 'pointer',
                marginTop: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {state.status === 'extracting' || state.status === 'clustering' ? (
                <><Pause size={18} /> Stop Analysis</>
              ) : (
                <><Play size={18} /> Start Analysis</>
              )}
            </button>

            {addresses.length < 3 && (
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                textAlign: 'center',
                marginTop: '8px' 
              }}>
                Need at least 3 addresses for clustering
              </div>
            )}
          </div>

          {/* Export Panel (when results available) */}
          {result?.snapshot && (
            <div style={{ marginTop: '20px' }}>
              <ExportPanel
                snapshot={result.snapshot}
                caseId={currentCaseId || undefined}
                caseName={currentCase?.name}
              />
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div>
          {!showResults ? (
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              padding: '60px 40px',
              textAlign: 'center'
            }}>
              <Activity size={48} color="#374151" style={{ marginBottom: '16px' }} />
              <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>
                Ready to Analyze
              </h3>
              <p style={{ color: '#4b5563', fontSize: '14px' }}>
                Add at least 3 wallet addresses and click Start Analysis
              </p>
            </div>
          ) : state.status === 'extracting' || state.status === 'clustering' ? (
            /* Progress View */
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              padding: '40px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: `conic-gradient(#3b82f6 ${state.progress * 3.6}deg, #1f2937 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#3b82f6'
                  }}>
                    {Math.round(state.progress)}%
                  </div>
                </div>
                
                <h3 style={{ color: '#fff', marginBottom: '8px' }}>
                  {state.status === 'extracting' ? 'Extracting Features' : 'Clustering Wallets'}
                </h3>
                <p style={{ color: '#6b7280' }}>{state.message}</p>
              </div>

              {/* Progress Steps */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {['Initialize', 'Extract Features', 'Cluster Analysis', 'Complete'].map((step, i) => {
                  const stepProgress = (i + 1) * 25;
                  const isActive = state.progress >= stepProgress - 25;
                  const isComplete = state.progress >= stepProgress;
                  
                  return (
                    <div key={step} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isComplete ? '#22c55e' : isActive ? '#3b82f6' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 8px',
                        fontSize: '14px'
                      }}>
                        {isComplete ? <CheckCircle size={16} /> : i + 1}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: isActive ? '#fff' : '#6b7280' 
                      }}>
                        {step}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : result ? (
            /* Results View */
            <div>
              {/* Summary Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Wallets Analyzed
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
                    {result.features.length}
                  </div>
                </div>

                <div style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Clusters Found
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>
                    {result.clusters.length}
                  </div>
                </div>

                <div style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    High Risk
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>
                    {result.features.filter(f => f.riskLevel === 'high' || f.riskLevel === 'critical').length}
                  </div>
                </div>

                <div style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Campaigns
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
                    {result.campaigns.length}
                  </div>
                </div>
              </div>

              {/* Clusters List */}
              <div style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  color: '#fff', 
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <BarChart3 size={20} color="#60a5fa" />
                  Detected Clusters
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {result.clusters.map((cluster, i) => (
                    <div
                      key={cluster.id}
                      style={{
                        padding: '16px',
                        background: '#0f0f0f',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${getRiskColor(cluster.riskLevel)}`
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <div>
                          <div style={{ 
                            fontWeight: 600, 
                            color: '#fff',
                            fontSize: '15px',
                            marginBottom: '4px'
                          }}>
                            Cluster #{i + 1} • {cluster.wallets.length} wallets
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Suspicion Score: {Math.round(cluster.suspicionScore)}/100
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: getRiskColor(cluster.riskLevel) + '20',
                          color: getRiskColor(cluster.riskLevel)
                        }}>
                          {cluster.riskLevel}
                        </span>
                      </div>

                      {/* Reasons */}
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '6px',
                        marginTop: '12px'
                      }}>
                        {cluster.reasons.map((reason, j) => (
                          <span
                            key={j}
                            style={{
                              padding: '4px 10px',
                              background: '#1a1a1a',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#9ca3af'
                            }}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>

                      {/* Wallet Addresses */}
                      <div style={{ 
                        marginTop: '12px',
                        fontSize: '11px',
                        color: '#4b5563',
                        fontFamily: 'monospace'
                      }}>
                        {cluster.wallets.slice(0, 5).map(w => `${w.slice(0, 6)}...${w.slice(-4)}`).join(', ')}
                        {cluster.wallets.length > 5 && ` +${cluster.wallets.length - 5} more`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campaigns */}
              {result.campaigns.length > 0 && (
                <div style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '20px'
                }}>
                  <h3 style={{ 
                    margin: '0 0 16px 0', 
                    color: '#fff', 
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Clock size={20} color="#f59e0b" />
                    Coordinated Campaigns
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        style={{
                          padding: '14px',
                          background: '#0f0f0f',
                          border: '1px solid #333',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px'
                        }}>
                          <span style={{ fontWeight: 600, color: '#fff' }}>
                            {campaign.name}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {campaign.walletCount} wallets
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {new Date(campaign.startTime * 1000).toLocaleString()} → {new Date(campaign.endTime * 1000).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SybilAnalysis;
