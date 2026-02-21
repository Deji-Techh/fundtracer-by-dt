export function exportToCSV(data: any[], filename: string, columns?: { key: string; header: string }[]) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = columns 
    ? columns.map(col => col.header)
    : Object.keys(data[0]);

  const keys = columns 
    ? columns.map(col => col.key)
    : Object.keys(data[0]);

  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      keys.map(key => {
        const value = row[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportWalletAnalysis(result: any) {
  if (!result) return;

  const timestamp = new Date().toISOString().slice(0, 10);
  const walletAddress = result.wallet?.address?.slice(0, 8) || 'wallet';

  const summaryData = [
    {
      field: 'Address',
      value: result.wallet?.address || ''
    },
    {
      field: 'Chain',
      value: result.wallet?.chain || ''
    },
    {
      field: 'Risk Level',
      value: result.riskLevel || ''
    },
    {
      field: 'Risk Score',
      value: result.overallRiskScore || ''
    },
    {
      field: 'Balance (ETH)',
      value: result.wallet?.balanceInEth || ''
    },
    {
      field: 'Total Transactions',
      value: result.summary?.totalTransactions || 0
    },
    {
      field: 'Total Received (ETH)',
      value: result.summary?.totalValueReceivedEth || 0
    },
    {
      field: 'Total Sent (ETH)',
      value: result.summary?.totalValueSentEth || 0
    },
    {
      field: 'Unique Interactors',
      value: result.summary?.uniqueInteractedAddresses || 0
    },
    {
      field: 'Activity Period (Days)',
      value: result.summary?.activityPeriodDays || 0
    },
    {
      field: 'Export Date',
      value: new Date().toISOString()
    }
  ];

  exportToCSV(summaryData, `FundTracer_${walletAddress}_${timestamp}_summary`, [
    { key: 'field', header: 'Field' },
    { key: 'value', header: 'Value' }
  ]);
}

export function exportTransactions(transactions: any[], walletAddress: string) {
  if (!transactions || transactions.length === 0) return;

  const timestamp = new Date().toISOString().slice(0, 10);
  const shortAddress = walletAddress?.slice(0, 8) || 'wallet';

  const txData = transactions.map(tx => ({
    hash: tx.hash || '',
    blockNumber: tx.blockNumber || '',
    timestamp: tx.timestamp || '',
    from: tx.from || '',
    to: tx.to || '',
    value: tx.valueInEth || tx.value || '',
    gasUsed: tx.gasUsed || '',
    status: tx.status || '',
    isIncoming: tx.isIncoming ? 'Incoming' : 'Outgoing'
  }));

  exportToCSV(txData, `FundTracer_${shortAddress}_${timestamp}_transactions`, [
    { key: 'hash', header: 'Transaction Hash' },
    { key: 'blockNumber', header: 'Block Number' },
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'from', header: 'From' },
    { key: 'to', header: 'To' },
    { key: 'value', header: 'Value (ETH)' },
    { key: 'gasUsed', header: 'Gas Used' },
    { key: 'status', header: 'Status' },
    { key: 'isIncoming', header: 'Direction' }
  ]);
}
