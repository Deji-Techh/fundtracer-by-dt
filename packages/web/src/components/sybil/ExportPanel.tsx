import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Scale, Check, Copy } from 'lucide-react';
import { EvidenceExporter, ExportFormat } from '../../services/EvidenceExporter';
import { AnalysisSnapshot } from '../../services/CaseManager';
import { useNotify } from '../../contexts/ToastContext';

interface ExportPanelProps {
  snapshot: AnalysisSnapshot;
  caseId?: string;
  caseName?: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  snapshot,
  caseId,
  caseName
}) => {
  const [exporting, setExporting] = useState(false);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const notify = useNotify();

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    
    try {
      const exporter = new EvidenceExporter(snapshot.features[0]?.chain || 'linea');
      
      const evidence = await exporter.export(snapshot, format, {
        caseId,
        caseName,
        analyst: 'FundTracer Analyst',
        includeTransactions: format === 'json'
      });
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `sybil-evidence-${timestamp}.${format === 'legal' ? 'md' : format}`;
      
      // Download
      if (typeof evidence === 'string') {
        // CSV or Legal format (strings)
        const blob = new Blob([evidence], { 
          type: format === 'csv' ? 'text/csv' : 'text/markdown' 
        });
        exporter.downloadEvidence(blob, filename);
        
        // Extract hash for legal format
        if (format === 'legal') {
          const hashMatch = evidence.match(/\*\*Evidence Hash\*\*: ([a-f0-9]{64})/);
          if (hashMatch) setLastHash(hashMatch[1]);
        }
      } else {
        // JSON format (Blob)
        exporter.downloadEvidence(evidence, filename);
        
        // Extract hash from JSON
        const text = await evidence.text();
        const json = JSON.parse(text);
        if (json.integrity?.hash) {
          setLastHash(json.integrity.hash);
        }
      }
      
      notify.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      notify.error('Export failed: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const copyHash = () => {
    if (lastHash) {
      navigator.clipboard.writeText(lastHash);
      notify.success('Hash copied to clipboard');
    }
  };

  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        color: 'var(--color-text-primary)', 
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Download size={18} color="var(--color-accent)" />
        Export Evidence
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* JSON Export */}
        <button
          onClick={() => handleExport('json')}
          disabled={exporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            minHeight: '44px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.6 : 1,
            textAlign: 'left'
          }}
        >
          <FileText size={20} color="var(--color-accent)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: '2px' }}>JSON (Full Data)</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Machine-readable with integrity hash
            </div>
          </div>
          <Download size={16} color="var(--color-text-muted)" />
        </button>

        {/* CSV Export */}
        <button
          onClick={() => handleExport('csv')}
          disabled={exporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            minHeight: '44px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.6 : 1,
            textAlign: 'left'
          }}
        >
          <FileSpreadsheet size={20} color="var(--color-positive)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: '2px' }}>CSV (Summary)</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Spreadsheet format for Excel/Google Sheets
            </div>
          </div>
          <Download size={16} color="var(--color-text-muted)" />
        </button>

        {/* Legal Export */}
        <button
          onClick={() => handleExport('legal')}
          disabled={exporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            minHeight: '44px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.6 : 1,
            textAlign: 'left'
          }}
        >
          <Scale size={20} color="var(--color-warning)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: '2px' }}>Legal Report</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Court-admissible markdown with chain of custody
            </div>
          </div>
          <Download size={16} color="var(--color-text-muted)" />
        </button>
      </div>

      {/* Integrity Hash Display */}
      {lastHash && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--color-bg)',
          borderRadius: '8px'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--color-text-muted)', 
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Check size={12} color="var(--color-positive)" />
            Tamper-Evident SHA-256 Hash
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontFamily: 'monospace',
            fontSize: '11px'
          }}>
            <code style={{ 
              flex: 1,
              background: 'var(--color-bg-elevated)',
              padding: '6px 10px',
              borderRadius: '4px',
              color: 'var(--color-positive)',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {lastHash.slice(0, 16)}...{lastHash.slice(-16)}
            </code>
            <button
              onClick={copyHash}
              style={{
                padding: '10px',
                minWidth: '44px',
                minHeight: '44px',
                background: 'var(--color-border)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '4px',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Copy full hash"
            >
              <Copy size={14} />
            </button>
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--color-text-muted)', 
            marginTop: '6px',
            lineHeight: 1.4
          }}>
            This hash uniquely identifies this evidence package. 
            Any modification will change the hash, proving tampering.
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPanel;
