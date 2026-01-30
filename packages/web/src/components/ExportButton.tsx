import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalysisResult, MultiWalletResult } from '@fundtracer/core';

interface ExportButtonProps {
  result: AnalysisResult | MultiWalletResult;
  type: 'pdf' | 'csv';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  result,
  type,
  variant = 'secondary',
  className = ''
}) => {
  const handleExport = () => {
    if (type === 'pdf') {
      exportToPDF(result);
    } else {
      exportToCSV(result);
    }
  };

  return (
    <button
      onClick={handleExport}
      className={`export-button export-${type} variant-${variant} ${className}`}
      title={`Export as ${type.toUpperCase()}`}
    >
      <span className="export-icon">
        {type === 'pdf' ? '📄' : '📊'}
      </span>
      <span className="export-label">
        Export {type.toUpperCase()}
      </span>
    </button>
  );
};

// Export AnalysisResult to PDF
function exportToPDF(result: AnalysisResult | MultiWalletResult) {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  
  // Title
  doc.setFontSize(20);
  doc.text('FundTracer Analysis Report', 14, 20);
  
  // Timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${timestamp}`, 14, 30);
  
  // Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('This report is for informational purposes only and should not be considered financial advice.', 14, 38);
  doc.setTextColor(0, 0, 0);
  
  if ('wallet' in result) {
    // Single wallet analysis
    exportSingleWalletPDF(doc, result);
  } else {
    // Multi-wallet comparison
    exportMultiWalletPDF(doc, result);
  }
  
  // Save
  const filename = `fundtracer-analysis-${Date.now()}.pdf`;
  doc.save(filename);
}

function exportSingleWalletPDF(doc: jsPDF, result: AnalysisResult) {
  const wallet = result.wallet;
  
  // Wallet Info Section
  doc.setFontSize(14);
  doc.text('Wallet Information', 14, 50);
  
  const walletInfo = [
    ['Address', wallet.address],
    ['Chain', wallet.chain],
    ['Balance', `${wallet.balanceInEth.toFixed(4)} ETH`],
    ['Risk Level', result.riskLevel.toUpperCase()],
    ['Risk Score', `${result.riskScore}/100`]
  ];
  
  autoTable(doc, {
    startY: 55,
    head: [['Property', 'Value']],
    body: walletInfo,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] }
  });
  
  // Statistics Section
  const statsY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text('Transaction Statistics', 14, statsY);
  
  const stats = result.statistics;
  const statsData = [
    ['Total Transactions', stats.totalTransactions.toString()],
    ['Incoming Transactions', stats.incomingCount.toString()],
    ['Outgoing Transactions', stats.outgoingCount.toString()],
    ['Unique Senders', stats.uniqueSenders.toString()],
    ['Unique Receivers', stats.uniqueReceivers.toString()],
    ['Avg Transaction Value', `${stats.averageTransactionValue.toFixed(4)} ETH`],
    ['Largest Incoming', `${stats.largestIncoming.toFixed(4)} ETH`],
    ['Largest Outgoing', `${stats.largestOutgoing.toFixed(4)} ETH`]
  ];
  
  autoTable(doc, {
    startY: statsY + 5,
    head: [['Metric', 'Value']],
    body: statsData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] }
  });
  
  // Suspicious Indicators (if any)
  if (result.suspiciousIndicators && result.suspiciousIndicators.length > 0) {
    const suspY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Suspicious Activity Indicators', 14, suspY);
    
    const suspData = result.suspiciousIndicators.map(ind => [
      ind.type,
      ind.description,
      ind.severity
    ]);
    
    autoTable(doc, {
      startY: suspY + 5,
      head: [['Type', 'Description', 'Severity']],
      body: suspData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] }
    });
  }
  
  // Top Counterparties
  if (result.topCounterparties && result.topCounterparties.length > 0) {
    const counterY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Top Counterparties', 14, counterY);
    
    const counterData = result.topCounterparties.map(counter => [
      counter.address.slice(0, 20) + '...',
      counter.type,
      counter.value.toFixed(4) + ' ETH',
      counter.count.toString()
    ]);
    
    autoTable(doc, {
      startY: counterY + 5,
      head: [['Address', 'Type', 'Total Value', 'Transactions']],
      body: counterData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] }
    });
  }
}

function exportMultiWalletPDF(doc: jsPDF, result: MultiWalletResult) {
  // Summary Section
  doc.setFontSize(14);
  doc.text('Multi-Wallet Comparison', 14, 50);
  
  const summaryData = [
    ['Total Wallets', result.wallets.length.toString()],
    ['Total Volume', `${result.totalVolume.toFixed(4)} ETH`],
    ['High Risk Wallets', result.riskSummary.high.toString()],
    ['Medium Risk Wallets', result.riskSummary.medium.toString()],
    ['Low Risk Wallets', result.riskSummary.low.toString()]
  ];
  
  autoTable(doc, {
    startY: 55,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] }
  });
  
  // Individual Wallets
  const walletsY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text('Individual Wallet Analysis', 14, walletsY);
  
  const walletData = result.wallets.map(wallet => [
    wallet.address.slice(0, 20) + '...',
    wallet.balance.toFixed(4) + ' ETH',
    wallet.transactionCount.toString(),
    wallet.riskLevel.toUpperCase()
  ]);
  
  autoTable(doc, {
    startY: walletsY + 5,
    head: [['Address', 'Balance', 'Transactions', 'Risk']],
    body: walletData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] }
  });
  
  // Correlations
  if (result.correlations && result.correlations.length > 0) {
    const corrY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Wallet Correlations', 14, corrY);
    
    const corrData = result.correlations.map(corr => [
      corr.address1.slice(0, 15) + '...',
      corr.address2.slice(0, 15) + '...',
      corr.type,
      corr.strength
    ]);
    
    autoTable(doc, {
      startY: corrY + 5,
      head: [['Wallet 1', 'Wallet 2', 'Type', 'Strength']],
      body: corrData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] }
    });
  }
}

// Export to CSV
function exportToCSV(result: AnalysisResult | MultiWalletResult) {
  let csvContent = '';
  
  if ('wallet' in result) {
    // Single wallet CSV
    csvContent = generateSingleWalletCSV(result);
  } else {
    // Multi-wallet CSV
    csvContent = generateMultiWalletCSV(result);
  }
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `fundtracer-analysis-${Date.now()}.csv`;
  link.click();
}

function generateSingleWalletCSV(result: AnalysisResult): string {
  const wallet = result.wallet;
  const stats = result.statistics;
  
  let csv = 'FundTracer Analysis Report\n';
  csv += `Generated,${new Date().toISOString()}\n\n`;
  
  // Wallet Info
  csv += 'Wallet Information\n';
  csv += `Address,${wallet.address}\n`;
  csv += `Chain,${wallet.chain}\n`;
  csv += `Balance,${wallet.balanceInEth} ETH\n`;
  csv += `Risk Level,${result.riskLevel}\n`;
  csv += `Risk Score,${result.riskScore}\n\n`;
  
  // Statistics
  csv += 'Transaction Statistics\n';
  csv += `Metric,Value\n`;
  csv += `Total Transactions,${stats.totalTransactions}\n`;
  csv += `Incoming Transactions,${stats.incomingCount}\n`;
  csv += `Outgoing Transactions,${stats.outgoingCount}\n`;
  csv += `Unique Senders,${stats.uniqueSenders}\n`;
  csv += `Unique Receivers,${stats.uniqueReceivers}\n`;
  csv += `Avg Transaction Value,${stats.averageTransactionValue} ETH\n`;
  csv += `Largest Incoming,${stats.largestIncoming} ETH\n`;
  csv += `Largest Outgoing,${stats.largestOutgoing} ETH\n\n`;
  
  // Suspicious Indicators
  if (result.suspiciousIndicators && result.suspiciousIndicators.length > 0) {
    csv += 'Suspicious Activity Indicators\n';
    csv += `Type,Description,Severity\n`;
    result.suspiciousIndicators.forEach(ind => {
      csv += `"${ind.type}","${ind.description}",${ind.severity}\n`;
    });
    csv += '\n';
  }
  
  // Top Counterparties
  if (result.topCounterparties && result.topCounterparties.length > 0) {
    csv += 'Top Counterparties\n';
    csv += `Address,Type,Total Value,Transaction Count\n`;
    result.topCounterparties.forEach(counter => {
      csv += `${counter.address},${counter.type},${counter.value},${counter.count}\n`;
    });
  }
  
  return csv;
}

function generateMultiWalletCSV(result: MultiWalletResult): string {
  let csv = 'FundTracer Multi-Wallet Analysis Report\n';
  csv += `Generated,${new Date().toISOString()}\n`;
  csv += `Total Wallets,${result.wallets.length}\n`;
  csv += `Total Volume,${result.totalVolume} ETH\n\n`;
  
  // Risk Summary
  csv += 'Risk Summary\n';
  csv += `Risk Level,Count\n`;
  csv += `High,${result.riskSummary.high}\n`;
  csv += `Medium,${result.riskSummary.medium}\n`;
  csv += `Low,${result.riskSummary.low}\n\n`;
  
  // Individual Wallets
  csv += 'Individual Wallets\n';
  csv += `Address,Balance,Transaction Count,Incoming Volume,Outgoing Volume,Risk Level\n`;
  result.wallets.forEach(wallet => {
    csv += `${wallet.address},${wallet.balance},${wallet.transactionCount},${wallet.incomingVolume},${wallet.outgoingVolume},${wallet.riskLevel}\n`;
  });
  csv += '\n';
  
  // Correlations
  if (result.correlations && result.correlations.length > 0) {
    csv += 'Wallet Correlations\n';
    csv += `Address 1,Address 2,Correlation Type,Strength,Transaction Count\n`;
    result.correlations.forEach(corr => {
      csv += `${corr.address1},${corr.address2},${corr.type},${corr.strength},${corr.transactionCount}\n`;
    });
  }
  
  return csv;
}

// Export menu component
interface ExportMenuProps {
  result: AnalysisResult | MultiWalletResult;
  className?: string;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ result, className = '' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className={`export-menu ${className}`}>
      <button
        className="export-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>📥</span> Export
      </button>
      
      {isOpen && (
        <div className="export-menu-dropdown">
          <button onClick={() => { exportToPDF(result); setIsOpen(false); }}>
            <span>📄</span> Export PDF
          </button>
          <button onClick={() => { exportToCSV(result); setIsOpen(false); }}>
            <span>📊</span> Export CSV
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
