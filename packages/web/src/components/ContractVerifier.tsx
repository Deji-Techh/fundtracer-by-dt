import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Shield01Icon, ShieldCheckIcon, ShieldAlertIcon, ExternalLinkIcon } from '@hugeicons/core-free-icons';

interface ContractVerification {
  isVerified: boolean;
  contractName: string;
  compilerVersion: string;
  optimizationUsed: boolean;
  runs: number;
  sourceCode: string;
  abi: string;
}

export function ContractVerifier() {
  const [address, setAddress] = useState('');
  const [verification, setVerification] = useState<ContractVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkVerification = async () => {
    if (!address || address.length !== 42) {
      setError('Please enter a valid contract address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.lineascan.build/api?module=contract&action=getsourcecode&address=${address}`
      );
      const data = await response.json();

      if (data.result && data.result[0]) {
        const result = data.result[0];
        setVerification({
          isVerified: result.SourceCode !== '',
          contractName: result.ContractName,
          compilerVersion: result.CompilerVersion,
          optimizationUsed: result.OptimizationUsed === '1',
          runs: parseInt(result.Runs) || 0,
          sourceCode: result.SourceCode,
          abi: result.ABI
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to check verification:', err);
      setError('Failed to check contract verification');
      setLoading(false);
    }
  };

  return (
    <div className="contract-verifier-card" style={{ 
      padding: '20px', 
      background: 'var(--color-bg-secondary)', 
      borderRadius: '12px',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <HugeiconsIcon icon={Shield01Icon} size={20} strokeWidth={2} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontWeight: 600, fontSize: '16px' }}>Contract Verification Checker</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Enter contract address (0x...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ flex: 1 }}
          className="input"
        />
        <button
          onClick={checkVerification}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--color-danger)', fontSize: '14px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {verification && (
        <div style={{ 
          padding: '16px', 
          background: verification.isVerified ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          borderRadius: '8px',
          border: `1px solid ${verification.isVerified ? 'var(--color-success)' : 'var(--color-danger)'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            {verification.isVerified ? (
              <>
                <HugeiconsIcon icon={ShieldCheckIcon} size={24} strokeWidth={2} style={{ color: 'var(--color-success)' }} />
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                  Verified Contract
                </span>
              </>
            ) : (
              <>
                <HugeiconsIcon icon={ShieldAlertIcon} size={24} strokeWidth={2} style={{ color: 'var(--color-danger)' }} />
                <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>
                  Not Verified
                </span>
              </>
            )}
          </div>

          {verification.isVerified && (
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Contract Name:</strong> {verification.contractName}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Compiler:</strong> {verification.compilerVersion}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Optimization:</strong> {verification.optimizationUsed ? `Yes (${verification.runs} runs)` : 'No'}
              </div>
            </div>
          )}

          <a
            href={`https://lineascan.build/address/${address}#code`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              marginTop: '12px',
              fontSize: '14px',
              color: 'var(--color-primary)'
            }}
          >
            View on LineaScan <HugeiconsIcon icon={ExternalLinkIcon} size={14} strokeWidth={2} />
          </a>
        </div>
      )}
    </div>
  );
}
