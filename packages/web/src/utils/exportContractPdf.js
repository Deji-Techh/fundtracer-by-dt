import jsPDF from 'jspdf';
import 'jspdf-autotable';

export async function exportContractPDF(scanResult) {
  const { contract, stats, wallets, scannedAt } = scanResult;
  
  // Create PDF in landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set up colors
  const primaryColor = '#6366f1'; // Indigo
  const textColor = '#1f2937';
  const mutedColor = '#6b7280';
  
  // Add header
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text('Linea Contract Sybil Analysis Report', 15, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(mutedColor);
  doc.text(`Generated: ${new Date(scannedAt).toLocaleString()}`, 15, 28);
  doc.text(`Scan Duration: ${scanResult.scanDurationMs}ms`, 15, 33);
  
  // Contract Info Section
  let yPos = 45;
  
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text('Contract Information', 15, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(textColor);
  
  const contractInfo = [
    ['Name:', contract.name || 'Unknown'],
    ['Symbol:', contract.symbol || 'N/A'],
    ['Type:', contract.type],
    ['Address:', contract.address],
    ['Creator:', contract.creator],
    ['Created:', contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : 'Unknown'],
    ['ETH Balance:', `${contract.balanceETH} ETH`],
  ];
  
  doc.autoTable({
    startY: yPos,
    body: contractInfo,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: mutedColor },
      1: { textColor: textColor }
    },
    margin: { left: 15, right: 15 }
  });
  
  yPos = doc.lastAutoTable.finalY + 10;
  
  // Statistics Section
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text('Statistics', 15, yPos);
  
  yPos += 8;
  
  const statsData = [
    ['Unique Wallets:', stats.uniqueWallets.toLocaleString()],
    ['Total Transfers:', stats.totalTransfers.toLocaleString()],
    ['Incoming Transfers:', stats.incomingTransfers.toLocaleString()],
    ['Outgoing Transfers:', stats.outgoingTransfers.toLocaleString()],
  ];
  
  // Add category counts
  Object.entries(stats.categoryCounts).forEach(([category, count]) => {
    statsData.push([`${category}:`, count.toLocaleString()]);
  });
  
  doc.autoTable({
    startY: yPos,
    body: statsData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: mutedColor },
      1: { textColor: textColor }
    },
    margin: { left: 15, right: 15 }
  });
  
  // Wallet Interactions Section
  yPos = doc.lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text('Wallet Interactions', 15, yPos);
  
  yPos += 8;
  
  // Prepare wallet table data
  const walletHeaders = [
    'Rank',
    'Address',
    'Interactions',
    'First Seen',
    'Last Seen',
    'Category',
    'Sent',
    'Received'
  ];
  
  const walletData = wallets.map(wallet => [
    wallet.rank.toString(),
    wallet.address,
    wallet.interactions.toLocaleString(),
    wallet.firstSeen ? new Date(wallet.firstSeen).toLocaleDateString() : 'N/A',
    wallet.lastSeen ? new Date(wallet.lastSeen).toLocaleDateString() : 'N/A',
    wallet.topCategory.toUpperCase(),
    wallet.sentToContract.toLocaleString(),
    wallet.receivedFromContract.toLocaleString()
  ]);
  
  // Add wallet table
  doc.autoTable({
    startY: yPos,
    head: [walletHeaders],
    body: walletData,
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241], // Indigo
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 45, fontStyle: 'bold' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 15, halign: 'center' }
    },
    margin: { left: 15, right: 15 },
    didDrawPage: function(data) {
      // Footer on every page
      doc.setFontSize(8);
      doc.setTextColor(mutedColor);
      doc.text(
        `Linea Sybil Scanner — Page ${data.pageNumber}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
  });
  
  // Save PDF
  const filename = `linea_contract_${contract.name?.replace(/\s+/g, '_') || 'scan'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export default exportContractPDF;
