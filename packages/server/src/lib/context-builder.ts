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

/** Full analysis result fields used by report context builder */
interface RawTransaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string | null;
  valueInEth: number;
  status: string;
  method?: string;
}

interface RawSuspiciousIndicator {
  type: string;
  severity: string;
  score: number;
  description: string;
  evidence?: string[];
}

interface RawProjectInteraction {
  contractAddress: string;
  projectName?: string;
  category: string;
  interactionCount: number;
  totalValueInEth: number;
}

interface RawFundingNode {
  address: string;
  amount: string;
  valueInEth?: number;
  children?: RawFundingNode[];
}

interface EntityInfo {
  name: string;
  category: string;
  confidence: number;
  verified: boolean;
  tags?: string[];
}

export interface ReportInput {
  address: string;
  chain: string;
  balanceInEth?: number;
  isContract?: boolean;
  riskScore?: number;
  riskLevel?: string;
  summary?: {
    totalTransactions?: number;
    successfulTxs?: number;
    failedTxs?: number;
    totalValueSentEth?: number;
    totalValueReceivedEth?: number;
    uniqueInteractedAddresses?: number;
    activityPeriodDays?: number;
    averageTxPerDay?: number;
    topFundingSources?: Array<{ address: string; valueEth: number }>;
    topFundingDestinations?: Array<{ address: string; valueEth: number }>;
  };
  transactions?: RawTransaction[];
  suspiciousIndicators?: RawSuspiciousIndicator[];
  projectsInteracted?: RawProjectInteraction[];
  sameBlockTransactions?: Array<{ blockNumber: number; isSuspicious: boolean; reason?: string }>;
  fundingSources?: RawFundingNode;
  fundingDestinations?: RawFundingNode;
  entity?: EntityInfo;
  entityMap?: Record<string, EntityInfo>;
}

/**
 * buildReportContext - Rich context block (3000-5000 tokens) optimized for AI report generation.
 * Includes: wallet overview, transaction breakdown, counterparties, entities,
 * suspicious indicators, funding tree, timeline, and risk profile.
 */
export function buildReportContext(input: ReportInput): string {
  const sections: string[] = [];
  const s = input.summary;
  const chain = input.chain.toUpperCase();

  // ---- SECTION 1: Wallet Overview ----
  let overview = `WALLET REPORT DATA\n`;
  overview += `==================\n\n`;
  overview += `Address: ${input.address}\n`;
  overview += `Chain: ${chain}\n`;
  overview += `Balance: ${input.balanceInEth !== undefined ? input.balanceInEth.toFixed(6) + ' ETH' : 'N/A'}\n`;
  overview += `Type: ${input.isContract ? 'Contract' : 'EOA (Externally Owned Account)'}\n`;
  overview += `Overall Risk: ${input.riskLevel || 'N/A'} (${input.riskScore ?? 'N/A'}/100)\n`;

  // Entity info
  if (input.entity) {
    overview += `\nIdentified Entity: ${input.entity.name}\n`;
    overview += `Entity Category: ${input.entity.category}\n`;
    overview += `Entity Confidence: ${Math.round(input.entity.confidence * 100)}%\n`;
    overview += `Entity Verified: ${input.entity.verified ? 'Yes' : 'No'}\n`;
    if (input.entity.tags?.length) {
      overview += `Entity Tags: ${input.entity.tags.join(', ')}\n`;
    }
  }
  sections.push(overview);

  // ---- SECTION 2: Activity Summary ----
  if (s) {
    let activity = `\n--- Activity Summary ---\n`;
    activity += `Total Transactions: ${s.totalTransactions ?? 'N/A'}\n`;
    activity += `Successful: ${s.successfulTxs ?? 'N/A'}\n`;
    activity += `Failed: ${s.failedTxs ?? 'N/A'}\n`;
    activity += `Total Value Received: ${s.totalValueReceivedEth !== undefined ? s.totalValueReceivedEth.toFixed(4) + ' ETH' : 'N/A'}\n`;
    activity += `Total Value Sent: ${s.totalValueSentEth !== undefined ? s.totalValueSentEth.toFixed(4) + ' ETH' : 'N/A'}\n`;
    activity += `Unique Counterparties: ${s.uniqueInteractedAddresses ?? 'N/A'}\n`;
    activity += `Activity Period: ${s.activityPeriodDays ?? 'N/A'} days\n`;
    activity += `Avg Transactions/Day: ${s.averageTxPerDay ?? 'N/A'}\n`;
    sections.push(activity);
  }

  // ---- SECTION 3: Top Counterparties ----
  if (s?.topFundingSources?.length || s?.topFundingDestinations?.length) {
    let ct = `\n--- Top Counterparties ---\n`;
    if (s.topFundingSources?.length) {
      ct += `\nTop Funding Sources (incoming):\n`;
      for (const src of s.topFundingSources.slice(0, 10)) {
        const entityLabel = input.entityMap?.[src.address.toLowerCase()]
          ? ` [${input.entityMap[src.address.toLowerCase()].name}]`
          : '';
        ct += `  - ${src.address}${entityLabel}: ${src.valueEth.toFixed(4)} ETH\n`;
      }
    }
    if (s.topFundingDestinations?.length) {
      ct += `\nTop Destinations (outgoing):\n`;
      for (const dest of s.topFundingDestinations.slice(0, 10)) {
        const entityLabel = input.entityMap?.[dest.address.toLowerCase()]
          ? ` [${input.entityMap[dest.address.toLowerCase()].name}]`
          : '';
        ct += `  - ${dest.address}${entityLabel}: ${dest.valueEth.toFixed(4)} ETH\n`;
      }
    }
    sections.push(ct);
  }

  // ---- SECTION 4: Entity Interaction Map ----
  if (input.entityMap && Object.keys(input.entityMap).length > 0) {
    let em = `\n--- Entity Recognition (${Object.keys(input.entityMap).length} addresses matched) ---\n`;
    for (const [addr, ent] of Object.entries(input.entityMap)) {
      if (ent) {
        em += `  ${addr.slice(0, 8)}...${addr.slice(-6)} → ${ent.name} (${ent.category}, ${Math.round(ent.confidence * 100)}% confidence)\n`;
      }
    }
    sections.push(em);
  }

  // ---- SECTION 5: Projects Interacted ----
  if (input.projectsInteracted?.length) {
    let pi = `\n--- Projects / Protocols Interacted ---\n`;
    for (const p of input.projectsInteracted) {
      pi += `  - ${p.projectName || p.contractAddress.slice(0, 10) + '...'}: ${p.category}, ${p.interactionCount} interactions, ${p.totalValueInEth.toFixed(2)} ETH\n`;
    }
    sections.push(pi);
  }

  // ---- SECTION 6: Suspicious Indicators ----
  if (input.suspiciousIndicators?.length) {
    let si = `\n--- Suspicious Activity Indicators (${input.suspiciousIndicators.length} found) ---\n`;
    for (const ind of input.suspiciousIndicators) {
      si += `\n[${ind.severity.toUpperCase()}] ${ind.type.replace(/_/g, ' ')} (+${ind.score} pts)\n`;
      si += `  ${ind.description}\n`;
      if (ind.evidence?.length) {
        ind.evidence.slice(0, 5).forEach(e => si += `  Evidence: ${e}\n`);
      }
    }
    sections.push(si);
  }

  // ---- SECTION 7: Funding Tree Summary ----
  function flattenFundingTree(node: RawFundingNode | undefined, depth: number = 0, maxDepth: number = 2): string {
    if (!node || !node.address) return '';
    let indent = '  '.repeat(depth);
    let result = `${indent}${node.address} (${node.amount || node.valueInEth ? (node.valueInEth?.toFixed(4) + ' ETH' || node.amount) : 'unknown'})\n`;
    if (depth < maxDepth && node.children?.length) {
      for (const child of node.children) {
        result += flattenFundingTree(child, depth + 1, maxDepth);
      }
    } else if (depth >= maxDepth && node.children?.length) {
      result += `${indent}  ... ${node.children.length} more sub-nodes\n`;
    }
    return result;
  }

  if (input.fundingSources?.address || input.fundingDestinations?.address) {
    let ft = `\n--- Funding Tree ---\n`;
    if (input.fundingSources?.address) {
      ft += `\nSources (funds flowing IN):\n`;
      ft += flattenFundingTree(input.fundingSources);
    }
    if (input.fundingDestinations?.address) {
      ft += `\nDestinations (funds flowing OUT):\n`;
      ft += flattenFundingTree(input.fundingDestinations);
    }
    sections.push(ft);
  }

  // ---- SECTION 8: Recent Transactions ----
  if (input.transactions?.length) {
    let tx = `\n--- Recent Transactions (last ${Math.min(input.transactions.length, 30)}) ---\n`;
    const recent = input.transactions.slice(-30).reverse();
    for (const t of recent) {
      const dir = t.from.toLowerCase() === input.address.toLowerCase() ? 'OUT' : 'IN';
      tx += `  [${dir}] ${t.hash.slice(0, 10)}... ${t.valueInEth.toFixed(4)} ETH → ${t.to?.slice(0, 10) + '...' || 'contract_creation'} (${t.status})\n`;
    }
    if (input.transactions.length > 30) {
      tx += `  ... ${input.transactions.length - 30} more transactions\n`;
    }
    sections.push(tx);
  }

  // ---- SECTION 9: Same-Block Activity ----
  if (input.sameBlockTransactions?.length) {
    let sb = `\n--- Same-Block Activity (${input.sameBlockTransactions.length} groups) ---\n`;
    for (const group of input.sameBlockTransactions) {
      sb += `  Block #${group.blockNumber}: ${group.isSuspicious ? 'SUSPICIOUS - ' + (group.reason || '') : 'Normal'}\n`;
    }
    sections.push(sb);
  }

  // ---- SECTION 10: Risk Profile Summary ----
  let risk = `\n--- Risk Profile ---\n`;
  risk += `Overall Score: ${input.riskScore ?? 'N/A'}/100\n`;
  risk += `Risk Level: ${input.riskLevel || 'N/A'}\n`;
  risk += `Suspicious Indicators: ${input.suspiciousIndicators?.length || 0}\n`;
  risk += `Total Value Moved: ${(input.summary?.totalValueSentEth ?? 0) + (input.summary?.totalValueReceivedEth ?? 0) > 0
    ? ((input.summary?.totalValueSentEth ?? 0) + (input.summary?.totalValueReceivedEth ?? 0)).toFixed(2) + ' ETH'
    : 'N/A'}\n`;
  sections.push(risk);

  return sections.join('\n');
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

// Format analysis data for display in chat with tabular format
export function formatAnalysisForDisplay(data: AnalysisData, addressType: 'wallet' | 'contract'): string {
  if (addressType === 'wallet') {
    const w = data as WalletAnalysis;
    
    let table = `| Field | Value |\n| --- | --- |\n| Address | \`${w.address?.slice(0, 8)}...${w.address?.slice(-6)}\` |\n| Chain | ${w.chain || 'N/A'} |\n| Risk Score | ${w.riskScore ?? 'N/A'}/100 (${w.riskLevel || 'Unknown'}) |\n| Balance | ${w.balance || 'N/A'} |\n| Total Txns | ${w.totalTransactions?.toLocaleString() || 'N/A'} |\n| Unique Addrs | ${w.uniqueAddresses?.toLocaleString() || 'N/A'} |\n| First Seen | ${w.firstSeen || 'N/A'} |\n| Last Active | ${w.lastSeen || 'N/A'} |`;
    
    if (w.tokenHoldings && w.tokenHoldings.length > 0) {
      table += `\n\n**Token Holdings**\n| Token | Balance | Value |\n| --- | --- | --- |`;
      for (const token of w.tokenHoldings.slice(0, 5)) {
        table += `\n| ${token.symbol || 'Unknown'} | ${token.balance || 'N/A'} | ${token.value || 'N/A'} |`;
      }
    }
    
    if (w.topInteractions && w.topInteractions.length > 0) {
      table += `\n\n**Top Interactions**\n| Project | Address | Count |\n| --- | --- | --- |`;
      for (const interaction of w.topInteractions.slice(0, 8)) {
        table += `\n| ${interaction.label || 'Unknown'} | \`${interaction.address?.slice(0, 6)}...${interaction.address?.slice(-4)}\` | ${interaction.count || 0} |`;
      }
    }
    
    if (w.flags && w.flags.length > 0) {
      table += `\n\n**Risk Flags**\n${w.flags.map(f => `- ${f}`).join('\n')}`;
    }
    
    if (w.sybilCluster?.detected) {
      table += `\n\n⚠️ **Sybil Cluster Detected:** ${w.sybilCluster.clusterSize} wallets with ${w.sybilCluster.similarityScore}% similarity`;
    }
    
    return table;
  } else {
    const c = data as ContractAnalysis;
    
    let table = `| Field | Value |\n| --- | --- |\n| Address | \`${c.address?.slice(0, 8)}...${c.address?.slice(-6)}\` |\n| Chain | ${c.chain || 'N/A'} |\n| Name | ${c.name || 'Unknown'} |\n| Type | ${c.contractType || 'Unknown'} |\n| Verified | ${c.verified ? 'Yes' : 'No'} |\n| Risk Level | ${c.riskLevel || 'Unknown'} |\n| Deployer | ${c.deployer ? `${c.deployer.slice(0, 8)}...${c.deployer.slice(-4)}` : 'N/A'} |\n| Created | ${c.createdAt || 'N/A'} |`;
    
    if (c.holders) {
      table += `\n| Holders | ${c.holders.toLocaleString()} |`;
    }
    if (c.transfers) {
      table += `\n| Transfers | ${c.transfers.toLocaleString()} |`;
    }
    if (c.totalInteractions) {
      table += `\n| Interactions | ${c.totalInteractions.toLocaleString()} |`;
    }
    
    if (c.isHoneypot) {
      table += `\n\n⚠️ **Honeypot Risk Detected**`;
    }
    if (c.isMintable) {
      table += `\n⚠️ **Mintable - Potential Risk**`;
    }
    if (c.isPaused) {
      table += `\n⚠️ **Contract Paused**`;
    }
    if (c.securityFindings && c.securityFindings.length > 0) {
      table += `\n\n**Security Findings**\n${c.securityFindings.map(f => `- ${f}`).join('\n')}`;
    }
    
    return table;
  }
}