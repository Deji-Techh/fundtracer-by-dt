import React, { useState } from 'react';

interface SafetyCheck {
  isVerified: boolean;
  hasMintFunction: boolean | null;
  isHoneypot: boolean;
  liquidityLocked: boolean | null;
  ownershipRenounced: boolean | null;
  hiddenFunctions: boolean | null;
}

interface TokenSafetyProps {
  contractAddress: string;
  safety: {
    isHoneypot: boolean;
    riskScore: number;
    riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical' | 'unknown';
    warnings: string[];
    checks: SafetyCheck;
    recommendation: 'safe' | 'caution' | 'avoid';
  };
  loading?: boolean;
}

export const TokenSafety: React.FC<TokenSafetyProps> = ({ 
  contractAddress, 
  safety, 
  loading 
}) => {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '8px', 
        border: '1px solid #e5e5e5',
        padding: '24px',
      }}>
        <div className="skeleton" style={{ height: '24px', width: '50%', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '16px', width: '100%', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '16px', width: '80%' }} />
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'safe': return '#16a34a';
      case 'low': return '#22c55e';
      case 'medium': return '#d97706';
      case 'high': return '#dc2626';
      case 'critical': return '#991b1b';
      default: return '#6b7280';
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'safe': return '#16a34a';
      case 'caution': return '#d97706';
      case 'avoid': return '#dc2626';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      borderRadius: '8px', 
      border: '1px solid #e5e5e5',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '1.125rem' }}>
            Token Safety Check
          </h3>
          <div style={{
            padding: '4px 12px',
            borderRadius: '4px',
            backgroundColor: getRiskColor(safety.riskLevel) + '20',
            color: getRiskColor(safety.riskLevel),
            fontWeight: 600,
            fontSize: '0.875rem',
          }}>
            {safety.riskLevel === 'unknown' ? 'Unknown' : `${safety.riskLevel.toUpperCase()} RISK`}
          </div>
        </div>

        {/* Risk Score */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '8px',
            fontSize: '0.875rem',
            color: '#6b7280',
          }}>
            <span>Risk Score</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{safety.riskScore}/100</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${safety.riskScore}%`,
              height: '100%',
              backgroundColor: getRiskColor(safety.riskLevel),
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Recommendation */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: getRecommendationColor(safety.recommendation) + '10',
          borderRadius: '8px',
          borderLeft: `4px solid ${getRecommendationColor(safety.recommendation)}`,
        }}>
          <div style={{ 
            fontWeight: 600, 
            color: getRecommendationColor(safety.recommendation),
            textTransform: 'uppercase',
            fontSize: '0.875rem',
            marginBottom: '4px',
          }}>
            Recommendation: {safety.recommendation}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {safety.recommendation === 'safe' 
              ? 'This token appears safe to interact with.' 
              : safety.recommendation === 'caution'
              ? 'Proceed with caution. Review warnings below.'
              : 'Avoid this token. High risk detected.'}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {safety.warnings.length > 0 && (
        <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#dc2626',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            ⚠️ Warnings
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px', 
            color: '#6b7280',
            fontSize: '0.875rem',
          }}>
            {safety.warnings.map((warning, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Checks */}
      <div style={{ padding: '24px' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          <span>Detailed Security Checks</span>
          <span>{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div style={{ marginTop: '16px' }}>
            <CheckItem 
              label="Contract Verified" 
              status={safety.checks.isVerified} 
            />
            <CheckItem 
              label="No Mint Function" 
              status={!safety.checks.hasMintFunction} 
              unknown={safety.checks.hasMintFunction === null}
            />
            <CheckItem 
              label="Not a Honeypot" 
              status={!safety.checks.isHoneypot} 
            />
            <CheckItem 
              label="Liquidity Locked" 
              status={safety.checks.liquidityLocked} 
              unknown={safety.checks.liquidityLocked === null}
            />
            <CheckItem 
              label="Ownership Renounced" 
              status={safety.checks.ownershipRenounced} 
              unknown={safety.checks.ownershipRenounced === null}
            />
            <CheckItem 
              label="No Hidden Functions" 
              status={!safety.checks.hiddenFunctions} 
              unknown={safety.checks.hiddenFunctions === null}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ label: string; status: boolean; unknown?: boolean }> = ({ 
  label, 
  status, 
  unknown 
}) => {
  if (unknown) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>{label}</span>
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>⚪ Unknown</span>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid #f3f4f6',
    }}>
      <span style={{ color: '#374151', fontSize: '0.875rem' }}>{label}</span>
      <span style={{ 
        color: status ? '#16a34a' : '#dc2626', 
        fontSize: '0.875rem',
        fontWeight: 600,
      }}>
        {status ? '✓ Pass' : '✗ Fail'}
      </span>
    </div>
  );
};

export default TokenSafety;
