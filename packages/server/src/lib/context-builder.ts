// ============================================================
// Context Builder - Formats wallet/contract data for AI
// ============================================================

interface WalletAnalysis {
  address?: string;
  chain?: string;
  riskScore?: number;
  riskLevel?: string;
  balance?: string;
  totalTransactions?: number;
  totalReceived?: string;
  totalSent?: string;
  uniqueAddresses?: number;
  activityPeriodDays?: number;
  firstSeen?: string;
  lastSeen?: string;
  tags?: string[];
  fundingSources?: string[];
  topDestinations?: string[];
  tokenHoldings?: Array<{ symbol: string; balance: string; value: string }>;
  topInteractions?: Array<{ address: string; label: string; count: number }>;
  flags?: string[];
  sybilCluster?: {
    detected: boolean;
    clusterSize: number;
    sharedFundingSource?: string;
    similarityScore?: number;
  };
}

interface ContractAnalysis {
  address?: string;
  chain?: string;
  name?: string;
  contractType?: string;
  verified?: boolean;
  deployer?: string;
  createdAt?: string;
  totalInteractions?: number;
  holders?: number;
  transfers?: number;
  isHoneypot?: boolean;
  isMintable?: boolean;
  isPaused?: boolean;
  riskLevel?: string;
  riskScore?: number;
  flags?: string[];
  securityFindings?: string[];
}

export type AnalysisData = WalletAnalysis | ContractAnalysis;

export function buildContext(data: AnalysisData, addressType: 'wallet' | 'contract'): string {
  if (addressType === 'wallet') {
    return buildWalletContext(data as WalletAnalysis);
  } else {
    return buildContractContext(data as ContractAnalysis);
  }
}

function buildWalletContext(data: WalletAnalysis): string {
  let context = 'WALLET ANALYSIS DATA\n';
  context += '=====================\n\n';
  
  context += `Address: ${data.address || 'Unknown'}\n`;
  context += `Chain: ${data.chain || 'Unknown'}\n`;
  context += `Risk Score: ${data.riskScore ?? 'N/A'}\n`;
  context += `Risk Level: ${data.riskLevel ?? 'Unknown'}\n`;
  context += `Balance: ${data.balance ?? 'N/A'}\n`;
  context += `Total Transactions: ${data.totalTransactions ?? 'N/A'}\n`;
  context += `Total Received: ${data.totalReceived ?? 'N/A'}\n`;
  context += `Total Sent: ${data.totalSent ?? 'N/A'}\n`;
  context += `Unique Addresses: ${data.uniqueAddresses ?? 'N/A'}\n`;
  context += `Activity Period: ${data.activityPeriodDays ?? 'N/A'} days\n`;
  context += `First Activity: ${data.firstSeen ?? 'N/A'}\n`;
  context += `Last Activity: ${data.lastSeen ?? 'N/A'}\n`;
  
  context += '\n--- Token Holdings ---\n';
  if (data.tokenHoldings && data.tokenHoldings.length > 0) {
    data.tokenHoldings.forEach(token => {
      context += `- ${token.symbol}: ${token.balance} (${token.value})\n`;
    });
  } else {
    context += 'No token holdings data available\n';
  }
  
  context += '\n--- Top Interactions ---\n';
  if (data.topInteractions && data.topInteractions.length > 0) {
    data.topInteractions.forEach(interaction => {
      context += `- ${interaction.label || interaction.address}: ${interaction.count} interactions\n`;
    });
  } else {
    context += 'No interaction data available\n';
  }
  
  context += '\n--- Funding Sources ---\n';
  if (data.fundingSources && data.fundingSources.length > 0) {
    data.fundingSources.forEach(source => {
      context += `- ${source}\n`;
    });
  } else {
    context += 'No funding source data available\n';
  }
  
  context += '\n--- Tags ---\n';
  if (data.tags && data.tags.length > 0) {
    context += data.tags.join(', ') + '\n';
  } else {
    context += 'No tags\n';
  }
  
  context += '\n--- Flags & Risk Indicators ---\n';
  if (data.flags && data.flags.length > 0) {
    data.flags.forEach(flag => {
      context += `- ${flag}\n`;
    });
  } else {
    context += 'No flags detected\n';
  }
  
  context += '\n--- Sybil Cluster Analysis ---\n';
  if (data.sybilCluster) {
    context += `Detected: ${data.sybilCluster.detected ? 'YES' : 'NO'}\n`;
    if (data.sybilCluster.detected) {
      context += `Cluster Size: ${data.sybilCluster.clusterSize} wallets\n`;
      context += `Shared Funding: ${data.sybilCluster.sharedFundingSource || 'N/A'}\n`;
      context += `Similarity Score: ${(data.sybilCluster.similarityScore ?? 0) * 100}%\n`;
    }
  } else {
    context += 'No sybil cluster data\n';
  }
  
  return context;
}

function buildContractContext(data: ContractAnalysis): string {
  let context = 'CONTRACT ANALYSIS DATA\n';
  context += '======================\n\n';
  
  context += `Address: ${data.address || 'Unknown'}\n`;
  context += `Chain: ${data.chain || 'Unknown'}\n`;
  context += `Name: ${data.name || 'Unknown'}\n`;
  context += `Type: ${data.contractType || 'Unknown'}\n`;
  context += `Verified: ${data.verified ? 'Yes' : 'No'}\n`;
  context += `Deployer: ${data.deployer || 'N/A'}\n`;
  context += `Created: ${data.createdAt || 'N/A'}\n`;
  context += `Total Interactions: ${data.totalInteractions ?? 'N/A'}\n`;
  context += `Holders: ${data.holders ?? 'N/A'}\n`;
  context += `Transfers: ${data.transfers ?? 'N/A'}\n`;
  context += `Risk Score: ${data.riskScore ?? 'N/A'}\n`;
  context += `Risk Level: ${data.riskLevel ?? 'Unknown'}\n`;
  
  context += '\n--- Security Analysis ---\n';
  context += `Honeypot Risk: ${data.isHoneypot ? 'DETECTED' : 'Not detected'}\n`;
  context += `Mintable: ${data.isMintable ? 'Yes - potential risk' : 'No'}\n`;
  context += `Paused: ${data.isPaused ? 'Yes - currently paused' : 'No'}\n`;
  
  context += '\n--- Security Findings ---\n';
  if (data.securityFindings && data.securityFindings.length > 0) {
    data.securityFindings.forEach(finding => {
      context += `- ${finding}\n`;
    });
  } else {
    context += 'No critical security issues found\n';
  }
  
  context += '\n--- Flags ---\n';
  if (data.flags && data.flags.length > 0) {
    data.flags.forEach(flag => {
      context += `- ${flag}\n`;
    });
  } else {
    context += 'No flags\n';
  }
  
  return context;
}

// Format analysis data for display in chat
export function formatAnalysisForDisplay(data: AnalysisData, addressType: 'wallet' | 'contract'): string {
  if (addressType === 'wallet') {
    const w = data as WalletAnalysis;
    return `
**Wallet Analysis Complete**

• **Address:** \`${w.address?.slice(0, 10)}...\`
• **Chain:** ${w.chain}
• **Risk Score:** ${w.riskScore}/100 (${w.riskLevel})
• **Balance:** ${w.balance || 'N/A'}
• **Transactions:** ${w.totalTransactions?.toLocaleString() || 'N/A'}
• **First Seen:** ${w.firstSeen || 'N/A'}
${w.tags?.length ? `\n• **Tags:** ${w.tags.join(', ')}` : ''}
${w.sybilCluster?.detected ? `\n⚠️ **Sybil Cluster Detected:** ${w.sybilCluster.clusterSize} wallets` : ''}
    `.trim();
  } else {
    const c = data as ContractAnalysis;
    return `
**Contract Analysis Complete**

• **Address:** \`${c.address?.slice(0, 10)}...\`
• **Chain:** ${c.chain}
• **Name:** ${c.name || 'Unknown'}
• **Type:** ${c.contractType || 'Unknown'}
• **Verified:** ${c.verified ? '✅ Yes' : '❌ No'}
• **Risk Level:** ${c.riskLevel || 'Unknown'}
${c.isHoneypot ? '\n⚠️ **Honeypot Risk Detected**' : ''}
${c.isMintable ? '\n⚠️ **Mintable - Potential Risk**' : ''}
    `.trim();
  }
}