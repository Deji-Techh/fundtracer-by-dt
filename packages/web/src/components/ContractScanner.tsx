import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FileText, Users, ArrowUpRight, ArrowDownRight,
  ExternalLink, Copy, Check, Download, ChevronLeft, ChevronRight,
  Clock, Wallet, Activity, Shield, AlertCircle, Loader2,
  BarChart3, TrendingUp, Calendar, Hash
} from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNotify } from '../contexts/ToastContext';
import { apiRequest } from '../api';
import { addToHistory } from '../utils/history';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

export default function ContractScanner() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  
  // Table state
  const [sortField, setSortField] = useState('interactions');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  
  const isMobile = useIsMobile();
  const notify = useNotify();
  const itemsPerPage = 25;

  const handleScan = async () => {
    if (!address.trim()) {
      notify.error('Please enter a contract address');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentPage(1);

    try {
      const response = await apiRequest('/api/contract/scan', 'POST', {
        address: address.trim()
      });

      if (response.success) {
        setResult(response);
        notify.success(`Contract scanned successfully! Found ${response.stats.uniqueWallets} wallets`);
        
        // Add to history
        addToHistory(
          address.trim(),
          'linea',
          response.contract?.name || 'Contract Scan',
          {
            totalTransactions: response.stats?.totalTransfers,
            riskLevel: 'unknown'
          },
          'contract'
        );
      } else {
        throw new Error(response.error || 'Scan failed');
      }
    } catch (err) {
      console.error('Contract scan error:', err);
      setError(err.message || 'Failed to scan contract');
      notify.error(err.message || 'Failed to scan contract');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    notify.success('Address copied to clipboard');
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Sort wallets
  const sortedWallets = useMemo(() => {
    if (!result?.wallets) return [];
    
    return [...result.wallets].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [result?.wallets, sortField, sortDirection]);

  // Paginate
  const paginatedWallets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedWallets.slice(start, start + itemsPerPage);
  }, [sortedWallets, currentPage]);

  const totalPages = Math.ceil((result?.wallets?.length || 0) / itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      // Dynamic import to avoid loading PDF lib unless needed
      const { exportContractPDF } = await import('../utils/exportContractPdf.js');
      await exportContractPDF(result);
      notify.success('PDF exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      notify.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const getTypeColor = (type) => {
    if (type?.includes('ERC-721')) return '#8b5cf6';
    if (type?.includes('ERC-1155')) return '#ec4899';
    if (type?.includes('ERC-20')) return '#3b82f6';
    return '#6b7280';
  };

  const getCategoryColor = (category) => {
    const colors = {
      external: '#10b981',
      erc20: '#3b82f6',
      erc721: '#8b5cf6',
      erc1155: '#ec4899',
      internal: '#f59e0b'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: isMobile ? '16px' : '32px',
        minHeight: '100vh',
        background: 'var(--color-bg)'
      }}
    >
      {/* Header */}
      <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: isMobile ? '1.5rem' : '2.5rem',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          marginBottom: isMobile ? 12 : 8,
          background: 'linear-gradient(135deg, var(--color-text-primary) 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Contract Scanner
        </h1>
        <p style={{ 
          color: 'var(--color-text-muted)', 
          fontSize: isMobile ? '0.875rem' : '1rem',
          lineHeight: isMobile ? 1.5 : 1.4 
        }}>
          Analyze smart contracts and discover all interacting wallets
        </p>
      </motion.div>

      {/* Search Box */}
      <motion.div 
        variants={itemVariants}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: isMobile ? '20px' : '28px',
          marginBottom: 32,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div style={{
          display: 'flex',
          gap: 16,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search 
              size={20} 
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)'
              }}
            />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              placeholder="Enter contract address (0x...)"
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                fontSize: '1rem',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                fontFamily: 'monospace',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleScan}
            disabled={loading}
            style={{
              padding: '16px 32px',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 160,
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Scanning...
              </>
            ) : (
              <>
                <Search size={20} />
                Scan Contract
              </>
            )}
          </motion.button>
        </div>

        {/* Loading Message */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: 20,
                padding: 16,
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: 12,
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                color: '#8b5cf6',
                fontWeight: 500,
              }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Scanning... This may take 10-60 seconds for large contracts
              </div>
              <div style={{
                marginTop: 8,
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
              }}>
                Fetching contract metadata and analyzing all wallet interactions
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginTop: 20,
                padding: 16,
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 12,
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#ef4444',
              }}
            >
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <>
            {/* Contract Info Card */}
            <motion.div
              variants={cardVariants}
              style={{
                background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg-elevated) 100%)',
                border: '1px solid var(--color-border)',
                borderRadius: 24,
                padding: isMobile ? '24px 20px' : '32px',
                marginBottom: 24,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background decoration */}
              <div style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: `radial-gradient(circle, ${getTypeColor(result.contract.type)}20 0%, transparent 70%)`,
                borderRadius: '50%',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 16,
                }}>
                  <div>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        borderRadius: 20,
                        background: `${getTypeColor(result.contract.type)}15`,
                        border: `1px solid ${getTypeColor(result.contract.type)}30`,
                        marginBottom: 12,
                      }}
                    >
                      <Shield size={16} color={getTypeColor(result.contract.type)} />
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: getTypeColor(result.contract.type),
                      }}>
                        {result.contract.type}
                      </span>
                    </motion.div>

                    <h2 style={{
                      fontSize: isMobile ? '1.5rem' : '2rem',
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      marginBottom: 4,
                    }}>
                      {result.contract.name || 'Unknown Contract'}
                    </h2>

                    {result.contract.symbol && (
                      <div style={{
                        fontSize: '1.125rem',
                        color: 'var(--color-text-secondary)',
                        fontWeight: 500,
                      }}>
                        ${result.contract.symbol}
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExportPDF}
                    disabled={exporting}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: exporting ? 'not-allowed' : 'pointer',
                      opacity: exporting ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {exporting ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Download size={16} />
                    )}
                    Export PDF
                  </motion.button>
                </div>

                {/* Contract Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: 16,
                  marginTop: 24,
                }}>
                  {[
                    { label: 'Contract Address', value: formatAddress(result.contract.address), full: result.contract.address, copyId: 'address' },
                    { label: 'Creator', value: result.contract.creator !== 'Unknown' ? formatAddress(result.contract.creator) : 'Unknown', full: result.contract.creator, copyId: 'creator' },
                    { label: 'Created', value: formatDate(result.contract.createdAt) },
                    { label: 'ETH Balance', value: `${result.contract.balanceETH} ETH` },
                    { label: 'Scan Duration', value: `${result.scanDurationMs}ms` },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      style={{
                        padding: 16,
                        background: 'var(--color-bg-elevated)',
                        borderRadius: 12,
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 4,
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.9375rem',
                        color: 'var(--color-text-primary)',
                        fontWeight: 500,
                      }}>
                        {item.value}
                        {item.copyId && item.full && item.full !== 'Unknown' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleCopy(item.full, item.copyId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 4,
                            }}
                          >
                            {copied === item.copyId ? (
                              <Check size={14} color="#10b981" />
                            ) : (
                              <Copy size={14} color="var(--color-text-muted)" />
                            )}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              variants={containerVariants}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {[
                { icon: Users, label: 'Unique Wallets', value: result.stats.uniqueWallets.toLocaleString(), color: '#8b5cf6' },
                { icon: Activity, label: 'Total Transfers', value: result.stats.totalTransfers.toLocaleString(), color: '#3b82f6' },
                { icon: ArrowUpRight, label: 'Incoming', value: result.stats.incomingTransfers.toLocaleString(), color: '#10b981' },
                { icon: ArrowDownRight, label: 'Outgoing', value: result.stats.outgoingTransfers.toLocaleString(), color: '#f59e0b' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  variants={cardVariants}
                  whileHover={{ y: -4 }}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 16,
                    padding: 20,
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${stat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <stat.icon size={24} color={stat.color} />
                  </div>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    marginBottom: 4,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                  }}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Category Breakdown */}
            <motion.div
              variants={itemVariants}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <BarChart3 size={18} />
                Transfer Categories
              </h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                {Object.entries(result.stats.categoryCounts).map(([category, count]) => (
                  <motion.div
                    key={category}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 20,
                      background: `${getCategoryColor(category)}15`,
                      border: `1px solid ${getCategoryColor(category)}30`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: getCategoryColor(category),
                    }} />
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: getCategoryColor(category),
                      textTransform: 'uppercase',
                    }}>
                      {category}
                    </span>
                    <span style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                    }}>
                      {count.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Wallet Table */}
            <motion.div
              variants={itemVariants}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: 20,
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <Wallet size={20} />
                  Top Interacting Wallets
                </h3>
                <span style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                }}>
                  {result.wallets.length.toLocaleString()} total wallets
                </span>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}>
                  <thead>
                    <tr style={{
                      background: 'var(--color-bg-elevated)',
                      borderBottom: '1px solid var(--color-border)',
                    }}>
                      {[
                        { key: 'rank', label: 'Rank' },
                        { key: 'address', label: 'Address' },
                        { key: 'interactions', label: 'Interactions' },
                        { key: 'firstSeen', label: 'First Seen' },
                        { key: 'lastSeen', label: 'Last Seen' },
                        { key: 'topCategory', label: 'Top Category' },
                        { key: 'sentToContract', label: 'Sent' },
                        { key: 'receivedFromContract', label: 'Received' },
                      ].map((col) => (
                        <th
                          key={col.key}
                          onClick={() => col.key !== 'rank' && handleSort(col.key)}
                          style={{
                            padding: '14px 16px',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            cursor: col.key !== 'rank' ? 'pointer' : 'default',
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {col.label}
                            {sortField === col.key && (
                              <span style={{ fontSize: '0.625rem' }}>
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWallets.map((wallet, index) => (
                      <motion.tr
                        key={wallet.address}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          background: index % 2 === 0 ? 'transparent' : 'var(--color-bg-elevated)',
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: wallet.rank <= 3 ? 
                              (wallet.rank === 1 ? '#fbbf24' : wallet.rank === 2 ? '#9ca3af' : '#b45309') : 
                              'var(--color-bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: wallet.rank <= 3 ? 'white' : 'var(--color-text-secondary)',
                          }}>
                            {wallet.rank}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a
                              href={`https://lineascan.build/address/${wallet.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontFamily: 'monospace',
                                color: '#8b5cf6',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                              }}
                              title={wallet.address}
                            >
                              {formatAddress(wallet.address)}
                            </a>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleCopy(wallet.address, `addr-${wallet.address}`)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                              }}
                            >
                              {copied === `addr-${wallet.address}` ? (
                                <Check size={14} color="#10b981" />
                              ) : (
                                <Copy size={14} color="var(--color-text-muted)" />
                              )}
                            </motion.button>
                            <a
                              href={`https://lineascan.build/address/${wallet.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}>
                            {wallet.interactions.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                            {formatDate(wallet.firstSeen)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                            {formatDate(wallet.lastSeen)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 12,
                            background: `${getCategoryColor(wallet.topCategory)}15`,
                            color: getCategoryColor(wallet.topCategory),
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}>
                            {wallet.topCategory}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: '#10b981', fontWeight: 500 }}>
                            {wallet.sentToContract.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ color: '#f59e0b', fontWeight: 500 }}>
                            {wallet.receivedFromContract.toLocaleString()}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                }}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-elevated)',
                      color: currentPage === 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-elevated)',
                      color: currentPage === totalPages ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Next
                    <ChevronRight size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
