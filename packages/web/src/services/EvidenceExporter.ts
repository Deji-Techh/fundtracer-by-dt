/**
 * EvidenceExporter - Export analysis results with tamper-evident hashing
 * Creates court-admissible evidence packages with SHA-256 integrity
 */

import { WalletFeatures } from './FeatureExtractor';
import { Cluster, Connection } from './ClusteringEngine';
import { AnalysisSnapshot, Campaign } from './CaseManager';

export interface EvidencePack {
  metadata: {
    version: string;
    exportedAt: number;
    exporter: string;
    caseId?: string;
    caseName?: string;
    analyst?: string;
  };
  
  summary: {
    walletCount: number;
    clusterCount: number;
    highRiskClusters: number;
    campaignsDetected: number;
    exportFormat: 'full' | 'summary' | 'legal';
  };
  
  wallets: EvidenceWallet[];
  clusters: EvidenceCluster[];
  campaigns: EvidenceCampaign[];
  connections: EvidenceConnection[];
  
  integrity: {
    algorithm: 'SHA-256';
    hash: string;
    signature?: string;
  };
  
  explorerLinks: {
    base: string;
    chain: string;
  };
}

export interface EvidenceWallet {
  address: string;
  chain: string;
  clusterId?: string;
  suspicionScore: number;
  riskLevel: string;
  
  features: {
    funders: Array<{
      address: string;
      amount: string;
      timestamp: number;
      txHash: string;
      blockNumber: number;
      explorerLink: string;
    }>;
    
    tokens: Array<{
      contract: string;
      symbol: string;
      interactions: number;
    }>;
    
    spenders: Array<{
      address: string;
      protocol?: string;
      count: number;
    }>;
    
    topRecipients: Array<{
      address: string;
      amount: string;
      percentage: number;
    }>;
    
    counterparties: Array<{
      address: string;
      type: string;
      count: number;
    }>;
    
    burstParticipation: string[];
  };
  
  explorerProfile: string;
}

export interface EvidenceCluster {
  id: string;
  wallets: string[];
  walletCount: number;
  suspicionScore: number;
  riskLevel: string;
  
  reasons: string[];
  
  features: {
    avgConsolidation: number;
    avgCounterpartyScore: number;
    sharedSpenders: string[];
    sharedTokens: string[];
    burstParticipation: number;
  };
  
  evidence: {
    sharedFunders?: Array<{
      address: string;
      walletsFunded: string[];
      totalAmount: string;
      txHashes: string[];
    }>;
    
    timeCorrelation?: {
      description: string;
      timeWindow: string;
      walletCount: number;
    };
    
    behavioralSimilarity?: {
      score: number;
      features: string[];
    };
  };
}

export interface EvidenceCampaign {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: string;
  walletCount: number;
  eventCount: number;
  walletAddresses: string[];
  description: string;
}

export interface EvidenceConnection {
  from: string;
  to: string;
  clusterId: string;
  strength: number;
  
  evidence: {
    type: string;
    confidence: number;
    description: string;
    
    transactions?: Array<{
      txHash: string;
      blockNumber: number;
      timestamp: number;
      explorerLink: string;
    }>;
    
    details?: Record<string, any>;
  };
}

export type ExportFormat = 'json' | 'csv' | 'pdf' | 'legal';

export class EvidenceExporter {
  private chain: string;
  private explorerBase: string;

  constructor(chain: string = 'linea') {
    this.chain = chain;
    this.explorerBase = this.getExplorerBase();
  }

  /**
   * Export analysis to evidence pack with tamper-evident hash
   */
  async export(
    snapshot: AnalysisSnapshot,
    format: ExportFormat = 'json',
    options: {
      caseId?: string;
      caseName?: string;
      analyst?: string;
      includeTransactions?: boolean;
    } = {}
  ): Promise<Blob | string> {
    const evidence = await this.buildEvidencePack(snapshot, options);
    
    switch (format) {
      case 'json':
        return this.exportJSON(evidence);
      
      case 'csv':
        return this.exportCSV(evidence);
      
      case 'legal':
        return this.exportLegalFormat(evidence);
      
      default:
        return this.exportJSON(evidence);
    }
  }

  /**
   * Build comprehensive evidence pack
   */
  private async buildEvidencePack(
    snapshot: AnalysisSnapshot,
    options: any
  ): Promise<EvidencePack> {
    const walletMap = new Map(snapshot.features.map(f => [f.address, f]));
    
    // Build evidence wallets
    const wallets: EvidenceWallet[] = snapshot.features.map(f => ({
      address: f.address,
      chain: f.chain,
      clusterId: snapshot.clusters.find(c => c.wallets.includes(f.address))?.id,
      suspicionScore: f.suspicionScore,
      riskLevel: f.riskLevel,
      
      features: {
        funders: f.funders.map(funder => ({
          ...funder,
          explorerLink: `${this.explorerBase}/tx/${funder.txHash}`
        })),
        
        tokens: f.tokens.slice(0, 10).map(t => ({
          contract: t.contract,
          symbol: t.symbol,
          interactions: t.interactions
        })),
        
        spenders: f.spenders.slice(0, 5).map(s => ({
          address: s.address,
          protocol: s.protocols[0],
          count: s.count
        })),
        
        topRecipients: f.topRecipients.slice(0, 5),
        
        counterparties: f.counterparties.slice(0, 10),
        
        burstParticipation: f.burstEvents.map(b => b.id)
      },
      
      explorerProfile: `${this.explorerBase}/address/${f.address}`
    }));

    // Build evidence clusters
    const clusters: EvidenceCluster[] = snapshot.clusters.map(c => {
      const clusterFeatures = snapshot.features.filter(f => c.wallets.includes(f.address));
      
      return {
        id: c.id,
        wallets: c.wallets,
        walletCount: c.wallets.length,
        suspicionScore: c.suspicionScore,
        riskLevel: c.riskLevel,
        reasons: c.reasons,
        features: c.feature,
        
        evidence: {
          sharedFunders: this.extractSharedFundersEvidence(clusterFeatures),
          timeCorrelation: this.extractTimeCorrelation(clusterFeatures),
          behavioralSimilarity: {
            score: c.suspicionScore,
            features: ['token_overlap', 'shared_spenders', 'burst_synchronization']
          }
        }
      };
    });

    // Build evidence connections
    const connections: EvidenceConnection[] = [];
    for (const cluster of snapshot.clusters) {
      for (const conn of cluster.connections) {
        connections.push({
          from: conn.from,
          to: conn.to,
          clusterId: cluster.id,
          strength: conn.strength,
          
          evidence: {
            type: conn.evidence.type,
            confidence: conn.evidence.confidence,
            description: conn.evidence.description,
            
            transactions: conn.evidence.txHashes?.map(tx => ({
              txHash: tx,
              blockNumber: 0, // Would need to fetch
              timestamp: 0,
              explorerLink: `${this.explorerBase}/tx/${tx}`
            })),
            
            details: conn.evidence.details
          }
        });
      }
    }

    // Build evidence pack
    const pack: EvidencePack = {
      metadata: {
        version: '2.0.0',
        exportedAt: Date.now(),
        exporter: 'FundTracer Sybil Forensics',
        caseId: options.caseId,
        caseName: options.caseName,
        analyst: options.analyst
      },
      
      summary: {
        walletCount: snapshot.walletCount,
        clusterCount: snapshot.clusters.length,
        highRiskClusters: snapshot.clusters.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length,
        campaignsDetected: snapshot.campaigns?.length || 0,
        exportFormat: options.includeTransactions ? 'full' : 'summary'
      },
      
      wallets,
      clusters,
      campaigns: (snapshot.campaigns || []).map(c => ({
        id: c.id,
        name: c.name,
        startTime: c.startTime,
        endTime: c.endTime,
        duration: this.formatDuration(c.endTime - c.startTime),
        walletCount: c.walletCount,
        eventCount: c.eventCount,
        walletAddresses: c.walletAddresses,
        description: c.description
      })),
      
      connections,
      
      integrity: {
        algorithm: 'SHA-256',
        hash: '' // Computed below
      },
      
      explorerLinks: {
        base: this.explorerBase,
        chain: this.chain
      }
    };

    // Compute tamper-evident hash
    pack.integrity.hash = await this.computeHash(pack);
    
    return pack;
  }

  /**
   * Compute SHA-256 hash of evidence for tamper detection
   */
  private async computeHash(pack: EvidencePack): Promise<string> {
    // Create deterministic string (sorted keys)
    const sortedPack = this.sortObjectKeys(pack);
    const evidenceString = JSON.stringify(sortedPack);
    
    // Compute hash using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(evidenceString);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify evidence integrity
   */
  async verifyIntegrity(pack: EvidencePack): Promise<boolean> {
    const originalHash = pack.integrity.hash;
    
    // Temporarily remove hash for verification
    const packCopy = { ...pack };
    packCopy.integrity = { ...pack.integrity, hash: '' };
    
    const computedHash = await this.computeHash(packCopy);
    
    return computedHash === originalHash;
  }

  /**
   * Export as formatted JSON
   */
  private exportJSON(pack: EvidencePack): Blob {
    const jsonString = JSON.stringify(pack, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Export as CSV (summary only)
   */
  private exportCSV(pack: EvidencePack): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Cluster ID,Risk Level,Suspicion Score,Wallet Count,Wallets,Reasons');
    
    // Data rows
    for (const cluster of pack.clusters) {
      const wallets = cluster.wallets.join('; ');
      const reasons = cluster.reasons.join('; ');
      lines.push(`${cluster.id},${cluster.riskLevel},${cluster.suspicionScore},${cluster.walletCount},"${wallets}","${reasons}"`);
    }
    
    return lines.join('\n');
  }

  /**
   * Export in legal format with chain of custody
   */
  private exportLegalFormat(pack: EvidencePack): Blob {
    const report = this.generateLegalReport(pack);
    return new Blob([report], { type: 'text/markdown' });
  }

  /**
   * Generate legal-grade investigation report
   */
  private generateLegalReport(pack: EvidencePack): string {
    const date = new Date(pack.metadata.exportedAt).toISOString();
    
    return `# Blockchain Forensics Investigation Report

## Document Information
- **Report ID**: ${pack.metadata.caseId || 'N/A'}
- **Case Name**: ${pack.metadata.caseName || 'N/A'}
- **Analyst**: ${pack.metadata.analyst || 'N/A'}
- **Generated**: ${date}
- **Integrity Hash**: ${pack.integrity.hash}
- **Chain**: ${pack.explorerLinks.chain}

## Executive Summary
This report presents the findings of a Sybil network analysis conducted on ${pack.summary.walletCount} wallet addresses. The analysis identified ${pack.summary.clusterCount} distinct clusters with varying levels of coordination suspicion.

### Key Findings
- **Total Wallets Analyzed**: ${pack.summary.walletCount}
- **Clusters Detected**: ${pack.summary.clusterCount}
- **High Risk Clusters**: ${pack.summary.highRiskClusters}
- **Coordinated Campaigns**: ${pack.summary.campaignsDetected}

## Methodology
The analysis employed multiple clustering algorithms:
1. **HDBSCAN** (Hierarchical Density-Based Clustering)
2. **Louvain Community Detection**
3. **Ensemble Clustering** (consensus between algorithms)

### Evidence Types Examined
- Funding source patterns
- Token interaction profiles
- DEX/router approval patterns
- Temporal activity synchronization
- Counterparty overlap
- Fund consolidation patterns

## Detailed Findings

${pack.clusters.map(c => `
### Cluster ${c.id}
**Risk Level**: ${c.riskLevel.toUpperCase()}
**Suspicion Score**: ${c.suspicionScore}/100
**Wallet Count**: ${c.walletCount}

**Evidence**:
${c.reasons.map(r => `- ${r}`).join('\n')}

**Wallets**:
${c.wallets.map(w => `- ${w}`).join('\n')}
`).join('\n---\n')}

## Chain of Custody
- **Evidence Hash**: ${pack.integrity.hash}
- **Hash Algorithm**: SHA-256
- **Verification**: This hash can be used to verify the integrity of this report

## Legal Disclaimer
This report was generated using automated blockchain analysis tools. The findings represent statistical correlations and behavioral patterns that may indicate coordinated activity. All wallet addresses and transaction hashes are publicly available on the blockchain.

## Appendix: Explorer Links
Base Explorer: ${pack.explorerLinks.base}

---
*Generated by FundTracer Sybil Forensics v${pack.metadata.version}*
`;
  }

  /**
   * Extract shared funders evidence
   */
  private extractSharedFundersEvidence(features: WalletFeatures[]): EvidenceCluster['evidence']['sharedFunders'] {
    const funderMap = new Map<string, { wallets: string[]; totalAmount: bigint; txHashes: string[] }>();
    
    for (const f of features) {
      for (const funder of f.funders) {
        if (!funderMap.has(funder.address)) {
          funderMap.set(funder.address, { wallets: [], totalAmount: BigInt(0), txHashes: [] });
        }
        
        const entry = funderMap.get(funder.address)!;
        entry.wallets.push(f.address);
        entry.totalAmount += BigInt(funder.amount);
        entry.txHashes.push(funder.txHash);
      }
    }
    
    return Array.from(funderMap.entries())
      .filter(([_, data]) => data.wallets.length >= 2)
      .map(([address, data]) => ({
        address,
        walletsFunded: data.wallets,
        totalAmount: data.totalAmount.toString(),
        txHashes: data.txHashes
      }));
  }

  /**
   * Extract time correlation evidence
   */
  private extractTimeCorrelation(features: WalletFeatures[]): EvidenceCluster['evidence']['timeCorrelation'] {
    const firstActivities = features.map(f => f.firstActivity).filter(t => t > 0);
    
    if (firstActivities.length < 2) return undefined;
    
    const minTime = Math.min(...firstActivities);
    const maxTime = Math.max(...firstActivities);
    const window = maxTime - minTime;
    
    if (window < 86400) { // Less than 24 hours
      return {
        description: `Wallets created within ${this.formatDuration(window)}`,
        timeWindow: `${new Date(minTime * 1000).toISOString()} to ${new Date(maxTime * 1000).toISOString()}`,
        walletCount: features.length
      };
    }
    
    return undefined;
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  /**
   * Sort object keys recursively for deterministic hashing
   */
  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = this.sortObjectKeys(obj[key]);
          return sorted;
        }, {} as any);
    }
    
    return obj;
  }

  /**
   * Get explorer base URL for chain
   */
  private getExplorerBase(): string {
    const explorers: Record<string, string> = {
      'ethereum': 'https://etherscan.io',
      'linea': 'https://lineascan.build',
      'arbitrum': 'https://arbiscan.io',
      'optimism': 'https://optimistic.etherscan.io',
      'polygon': 'https://polygonscan.com',
      'base': 'https://basescan.org'
    };
    
    return explorers[this.chain] || explorers['linea'];
  }

  /**
   * Trigger download of evidence file
   */
  downloadEvidence(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default EvidenceExporter;
