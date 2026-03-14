import React, { useState, useEffect } from 'react';
import { 
  FolderIcon,
  PlusIcon,
  Search01Icon,
  MoreVerticalIcon,
  Trash2Icon,
  Download02Icon,
  Upload02Icon,
  Clock01Icon,
  Shield01Icon,
  AlertCircleIcon,
  CloseIcon
} from '@hugeicons/core-free-icons';
import { caseManager, InvestigationCase } from '../../services/CaseManager';
import { useNotify } from '../../contexts/ToastContext';
import { useIsMobile } from '../../hooks/useIsMobile';

interface CaseManagerPanelProps {
  currentCaseId: string | null;
  onCaseSelect: (caseId: string | null) => void;
  onCaseCreate: (case_: InvestigationCase) => void;
}

export const CaseManagerPanel: React.FC<CaseManagerPanelProps> = ({
  currentCaseId,
  onCaseSelect,
  onCaseCreate
}) => {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({ caseCount: 0, snapshotCount: 0, totalSize: '0 KB' });
  const notify = useNotify();
  const isMobile = useIsMobile();

  // Load cases on mount
  useEffect(() => {
    loadCases();
    loadStats();
  }, []);

  const loadCases = async () => {
    const allCases = await caseManager.getAllCases();
    setCases(allCases);
  };

  const loadStats = async () => {
    const storageStats = await caseManager.getStorageStats();
    setStats(storageStats);
  };

  const handleCreateCase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newCase = await caseManager.createCase(
      formData.get('name') as string,
      formData.get('description') as string,
      formData.get('contract') as string || undefined,
      formData.get('chain') as string
    );
    
    setShowCreateModal(false);
    await loadCases();
    onCaseCreate(newCase);
    notify.success('Case created successfully');
  };

  const handleDeleteCase = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this case? All data will be lost.')) {
      await caseManager.deleteCase(caseId);
      await loadCases();
      if (currentCaseId === caseId) {
        onCaseSelect(null);
      }
      notify.success('Case deleted');
    }
  };

  const handleExportCase = async (case_: InvestigationCase, e: React.MouseEvent) => {
    e.stopPropagation();
    const json = await caseManager.exportCase(case_.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-${case_.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success('Case exported');
  };

  const handleImportCase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = await caseManager.importCase(text);
      await loadCases();
      onCaseSelect(imported.id);
      notify.success('Case imported successfully');
    } catch (error) {
      notify.error('Failed to import case: Invalid file format');
    }
  };

  const filteredCases = cases.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#22c55e';
      case 'in-progress': return '#3b82f6';
      case 'closed': return '#6b7280';
      case 'archived': return '#9ca3af';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderIcon size={20} color="var(--color-accent)" />
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: isMobile ? '14px' : '16px' }}>
            Investigation Cases
          </h3>
          <span style={{ 
            background: 'var(--color-border)', 
            padding: '2px 8px', 
            borderRadius: '12px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)'
          }}>
            {cases.length}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={{
            padding: '8px 12px',
            minHeight: '44px',
            background: 'var(--color-border)',
            border: '1px solid var(--color-border-light)',
            borderRadius: '6px',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Upload02Icon size={14} />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportCase}
              style={{ display: 'none' }}
            />
          </label>
          
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 12px',
            minHeight: '44px',
            background: 'var(--color-accent)',
            border: 'none',
            borderRadius: '6px',
            color: 'var(--color-text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <PlusIcon size={14} />
            New Case
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search01Icon size={16} style={{ 
          position: 'absolute', 
          left: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)',
          color: 'var(--color-text-muted)'
        }} />
        <input
          type="text"
          placeholder="Search cases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            minHeight: '44px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Case List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* No Case Option */}
        <div
          onClick={() => onCaseSelect(null)}
          style={{
            padding: '12px',
            background: currentCaseId === null ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)',
            border: `1px solid ${currentCaseId === null ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <CloseIcon size={16} color="var(--color-text-muted)" />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              No Case (Analysis only)
            </div>
          </div>
        </div>

        {/* Cases */}
        {filteredCases.map(case_ => (
          <div
            key={case_.id}
            onClick={() => onCaseSelect(case_.id)}
            style={{
              padding: '12px',
              background: currentCaseId === case_.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)',
              border: `1px solid ${currentCaseId === case_.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <FolderIcon 
                size={18} 
                color={currentCaseId === case_.id ? 'var(--color-accent)' : 'var(--color-text-muted)'} 
              />
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{ 
                    color: 'var(--color-text-primary)', 
                    fontWeight: 500,
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {case_.name}
                  </span>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getStatusColor(case_.status)
                  }} />
                </div>
                
                {case_.description && (
                  <div style={{ 
                    color: 'var(--color-text-muted)', 
                    fontSize: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '4px'
                  }}>
                    {case_.description}
                  </div>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock01Icon size={11} />
                    {new Date(case_.updatedAt).toLocaleDateString()}
                  </span>
                  <span>
                    {case_.snapshots.length} snapshots
                  </span>
                  {case_.targetContract && (
                    <span style={{ 
                      background: '#1e3a5f',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '10px'
                    }}>
                      {case_.targetChain}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={(e) => handleExportCase(case_, e)}
                  style={{
                    padding: '10px',
                    minWidth: '44px',
                    minHeight: '44px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Export case"
                >
                  <Download02Icon size={14} />
                </button>
                <button
                  onClick={(e) => handleDeleteCase(case_.id, e)}
                  style={{
                    padding: '10px',
                    minWidth: '44px',
                    minHeight: '44px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: 'var(--color-negative)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Delete case"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Storage Stats */}
      <div style={{ 
        marginTop: '16px',
        padding: '12px',
        background: 'var(--color-bg)',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>{stats.caseCount} cases • {stats.snapshotCount} snapshots</span>
        <span>{stats.totalSize}</span>
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--color-text-primary)' }}>
              Create New Case
            </h3>
            
            <form onSubmit={handleCreateCase}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                  Case Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g., Linea Airdrop Sybil Investigation"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    minHeight: '44px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Brief description of the investigation..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                  Target Contract (optional)
                </label>
                <input
                  name="contract"
                  type="text"
                  placeholder="0x..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    minHeight: '44px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                  Chain
                </label>
                <select
                  name="chain"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    minHeight: '44px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px'
                  }}
                >
                  <option value="linea">Linea</option>
                  <option value="ethereum">Ethereum</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="optimism">Optimism</option>
                  <option value="base">Base</option>
                  <option value="polygon">Polygon</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 20px',
                    minHeight: '44px',
                    background: 'var(--color-border)',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    minHeight: '44px',
                    background: 'var(--color-accent)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseManagerPanel;
