/**
 * CaseManager - IndexedDB-based case management for Sybil investigations
 * Local storage for private investigations with export/import capabilities
 */

import Dexie, { Table } from 'dexie';
import { WalletFeatures } from './FeatureExtractor';
import { Cluster } from './ClusteringEngine';

// Database schema
export interface InvestigationCase {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  targetContract?: string;
  targetChain: string;
  status: 'open' | 'in-progress' | 'closed' | 'archived';
  tags: string[];
  
  // Analysis snapshots for diff/re-run
  snapshots: AnalysisSnapshot[];
  
  // User annotations
  notes: CaseNote[];
  pinnedClusters: string[];
}

export interface AnalysisSnapshot {
  id: string;
  timestamp: number;
  walletCount: number;
  features: WalletFeatures[];
  clusters: Cluster[];
  campaigns: Campaign[];
  summary: {
    totalClusters: number;
    highRiskWallets: number;
    mediumRiskWallets: number;
    campaignsDetected: number;
  };
}

export interface Campaign {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  walletCount: number;
  eventCount: number;
  walletAddresses: string[];
  description: string;
}

export interface CaseNote {
  id: string;
  timestamp: number;
  text: string;
  author: string;
  attachedTo?: {
    type: 'wallet' | 'cluster' | 'transaction' | 'campaign';
    id: string;
  };
}

export interface DiffReport {
  timestamp: number;
  previousSnapshotId: string;
  currentSnapshotId: string;
  
  wallets: {
    added: WalletFeatures[];
    removed: WalletFeatures[];
    count: { before: number; after: number; delta: number };
  };
  
  clusters: {
    new: Cluster[];
    dissolved: Cluster[];
    changed: Array<{
      clusterId: string;
      walletDelta: number;
      scoreDelta: number;
      newWallets: string[];
      leftWallets: string[];
    }>;
  };
  
  behaviorChanges: Array<{
    wallet: string;
    changes: string[];
  }>;
}

// Dexie database class
class SybilDatabase extends Dexie {
  cases!: Table<InvestigationCase>;
  snapshots!: Table<AnalysisSnapshot>;
  
  constructor() {
    super('SybilForensicsDB');
    
    this.version(1).stores({
      cases: 'id, name, status, createdAt, updatedAt, *tags',
      snapshots: 'id, timestamp, caseId'
    });
  }
}

const db = new SybilDatabase();

/**
 * CaseManager - Main interface for case operations
 */
export class CaseManager {
  /**
   * Create a new investigation case
   */
  async createCase(
    name: string,
    description: string = '',
    targetContract?: string,
    targetChain: string = 'linea'
  ): Promise<InvestigationCase> {
    const caseId = `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newCase: InvestigationCase = {
      id: caseId,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      targetContract,
      targetChain,
      status: 'open',
      tags: [],
      snapshots: [],
      notes: [],
      pinnedClusters: []
    };
    
    await db.cases.add(newCase);
    return newCase;
  }

  /**
   * Get all cases
   */
  async getAllCases(): Promise<InvestigationCase[]> {
    return await db.cases
      .orderBy('updatedAt')
      .reverse()
      .toArray();
  }

  /**
   * Get case by ID
   */
  async getCase(caseId: string): Promise<InvestigationCase | undefined> {
    return await db.cases.get(caseId);
  }

  /**
   * Update case
   */
  async updateCase(
    caseId: string,
    updates: Partial<Omit<InvestigationCase, 'id' | 'createdAt'>>
  ): Promise<void> {
    await db.cases.update(caseId, {
      ...updates,
      updatedAt: Date.now()
    });
  }

  /**
   * Delete case
   */
  async deleteCase(caseId: string): Promise<void> {
    // Delete all associated snapshots
    const snapshots = await db.snapshots
      .where('caseId')
      .equals(caseId)
      .toArray();
    
    await db.snapshots.bulkDelete(snapshots.map(s => s.id));
    await db.cases.delete(caseId);
  }

  /**
   * Save analysis snapshot
   */
  async saveSnapshot(
    caseId: string,
    snapshot: Omit<AnalysisSnapshot, 'id'>
  ): Promise<AnalysisSnapshot> {
    const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullSnapshot: AnalysisSnapshot = {
      ...snapshot,
      id: snapshotId
    };
    
    await db.snapshots.add(fullSnapshot);
    
    // Update case
    const case_ = await this.getCase(caseId);
    if (case_) {
      case_.snapshots.push(fullSnapshot);
      await this.updateCase(caseId, { snapshots: case_.snapshots });
    }
    
    return fullSnapshot;
  }

  /**
   * Get snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<AnalysisSnapshot | undefined> {
    return await db.snapshots.get(snapshotId);
  }

  /**
   * Get all snapshots for a case
   */
  async getCaseSnapshots(caseId: string): Promise<AnalysisSnapshot[]> {
    const case_ = await this.getCase(caseId);
    if (!case_) return [];
    
    // Load full snapshots from DB
    const snapshotIds = case_.snapshots.map(s => s.id);
    const snapshots = await db.snapshots
      .where('id')
      .anyOf(snapshotIds)
      .toArray();
    
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate diff between two snapshots
   */
  async generateDiff(
    previousSnapshotId: string,
    currentSnapshotId: string
  ): Promise<DiffReport | null> {
    const previous = await this.getSnapshot(previousSnapshotId);
    const current = await this.getSnapshot(currentSnapshotId);
    
    if (!previous || !current) return null;
    
    // Build lookup maps
    const prevWalletMap = new Map(previous.features.map(f => [f.address, f]));
    const currWalletMap = new Map(current.features.map(f => [f.address, f]));
    
    const prevClusterMap = new Map(previous.clusters.map(c => [c.id, c]));
    const currClusterMap = new Map(current.clusters.map(c => [c.id, c]));
    
    // Find added/removed wallets
    const addedWallets = current.features.filter(f => !prevWalletMap.has(f.address));
    const removedWallets = previous.features.filter(f => !currWalletMap.has(f.address));
    
    // Find new/dissolved/changed clusters
    const newClusters = current.clusters.filter(c => !prevClusterMap.has(c.id));
    const dissolvedClusters = previous.clusters.filter(c => !currClusterMap.has(c.id));
    
    const changedClusters = current.clusters
      .map(curr => {
        const prev = prevClusterMap.get(curr.id);
        if (!prev) return null;
        
        const newWallets = curr.wallets.filter(w => !prev.wallets.includes(w));
        const leftWallets = prev.wallets.filter(w => !curr.wallets.includes(w));
        
        if (newWallets.length === 0 && leftWallets.length === 0 && 
            Math.abs(curr.suspicionScore - prev.suspicionScore) < 5) {
          return null; // No significant change
        }
        
        return {
          clusterId: curr.id,
          walletDelta: curr.wallets.length - prev.wallets.length,
          scoreDelta: curr.suspicionScore - prev.suspicionScore,
          newWallets,
          leftWallets
        };
      })
      .filter(Boolean) as DiffReport['clusters']['changed'];
    
    // Detect behavior changes
    const behaviorChanges = current.features
      .map(curr => {
        const prev = prevWalletMap.get(curr.address);
        if (!prev) return null;
        
        const changes: string[] = [];
        
        // Check for new funders
        const newFunders = curr.funders.filter(
          f => !prev.funders.some(pf => pf.address === f.address)
        );
        if (newFunders.length > 0) {
          changes.push(`New funding from ${newFunders[0].address.slice(0, 6)}...`);
        }
        
        // Check for new tokens
        const newTokens = curr.tokens.filter(
          t => !prev.tokens.some(pt => pt.contract === t.contract)
        );
        if (newTokens.length > 0) {
          changes.push(`Interacted with ${newTokens.length} new token(s)`);
        }
        
        // Check score change
        if (Math.abs(curr.suspicionScore - prev.suspicionScore) > 10) {
          const direction = curr.suspicionScore > prev.suspicionScore ? 'increased' : 'decreased';
          changes.push(`Risk score ${direction} by ${Math.abs(curr.suspicionScore - prev.suspicionScore)}`);
        }
        
        // Check for new burst participation
        const newBursts = curr.burstEvents.filter(
          b => !prev.burstEvents.some(pb => pb.id === b.id)
        );
        if (newBursts.length > 0) {
          changes.push(`Participated in ${newBursts.length} new burst(s)`);
        }
        
        return changes.length > 0 ? { wallet: curr.address, changes } : null;
      })
      .filter(Boolean) as DiffReport['behaviorChanges'];
    
    return {
      timestamp: Date.now(),
      previousSnapshotId,
      currentSnapshotId,
      wallets: {
        added: addedWallets,
        removed: removedWallets,
        count: {
          before: previous.walletCount,
          after: current.walletCount,
          delta: current.walletCount - previous.walletCount
        }
      },
      clusters: {
        new: newClusters,
        dissolved: dissolvedClusters,
        changed: changedClusters
      },
      behaviorChanges
    };
  }

  /**
   * Add note to case
   */
  async addNote(
    caseId: string,
    text: string,
    author: string = 'analyst',
    attachedTo?: CaseNote['attachedTo']
  ): Promise<CaseNote> {
    const note: CaseNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      text,
      author,
      attachedTo
    };
    
    const case_ = await this.getCase(caseId);
    if (case_) {
      case_.notes.push(note);
      await this.updateCase(caseId, { notes: case_.notes });
    }
    
    return note;
  }

  /**
   * Pin cluster to case
   */
  async pinCluster(caseId: string, clusterId: string): Promise<void> {
    const case_ = await this.getCase(caseId);
    if (case_ && !case_.pinnedClusters.includes(clusterId)) {
      case_.pinnedClusters.push(clusterId);
      await this.updateCase(caseId, { pinnedClusters: case_.pinnedClusters });
    }
  }

  /**
   * Unpin cluster
   */
  async unpinCluster(caseId: string, clusterId: string): Promise<void> {
    const case_ = await this.getCase(caseId);
    if (case_) {
      case_.pinnedClusters = case_.pinnedClusters.filter(id => id !== clusterId);
      await this.updateCase(caseId, { pinnedClusters: case_.pinnedClusters });
    }
  }

  /**
   * Search cases by tag or name
   */
  async searchCases(query: string): Promise<InvestigationCase[]> {
    const allCases = await this.getAllCases();
    const lowerQuery = query.toLowerCase();
    
    return allCases.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Export case to JSON
   */
  async exportCase(caseId: string): Promise<string> {
    const case_ = await this.getCase(caseId);
    if (!case_) throw new Error('Case not found');
    
    const snapshots = await this.getCaseSnapshots(caseId);
    
    const exportData = {
      version: '2.0',
      exportedAt: Date.now(),
      case: case_,
      snapshots
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import case from JSON
   */
  async importCase(jsonString: string): Promise<InvestigationCase> {
    const data = JSON.parse(jsonString);
    
    if (!data.case) {
      throw new Error('Invalid case export format');
    }
    
    // Generate new IDs to avoid conflicts
    const newCaseId = `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const importedCase: InvestigationCase = {
      ...data.case,
      id: newCaseId,
      name: `${data.case.name} (imported)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      snapshots: []
    };
    
    await db.cases.add(importedCase);
    
    // Import snapshots with new IDs
    if (data.snapshots && Array.isArray(data.snapshots)) {
      for (const snapshot of data.snapshots) {
        const newSnapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const importedSnapshot: AnalysisSnapshot = {
          ...snapshot,
          id: newSnapshotId
        };
        
        await db.snapshots.add(importedSnapshot);
        importedCase.snapshots.push(importedSnapshot);
      }
      
      await this.updateCase(newCaseId, { snapshots: importedCase.snapshots });
    }
    
    return importedCase;
  }

  /**
   * Get storage stats
   */
  async getStorageStats(): Promise<{
    caseCount: number;
    snapshotCount: number;
    totalSize: string;
  }> {
    const caseCount = await db.cases.count();
    const snapshotCount = await db.snapshots.count();
    
    // Estimate size
    const cases = await db.cases.toArray();
    const snapshots = await db.snapshots.toArray();
    
    const totalBytes = JSON.stringify(cases).length + JSON.stringify(snapshots).length;
    const totalSize = totalBytes > 1024 * 1024 
      ? `${(totalBytes / 1024 / 1024).toFixed(2)} MB`
      : `${(totalBytes / 1024).toFixed(2)} KB`;
    
    return { caseCount, snapshotCount, totalSize };
  }

  /**
   * Auto-save snapshot (call periodically during analysis)
   */
  async autoSave(
    caseId: string,
    snapshot: Omit<AnalysisSnapshot, 'id'>,
    maxSnapshots: number = 10
  ): Promise<void> {
    // Get existing snapshots
    const existing = await this.getCaseSnapshots(caseId);
    
    // Remove old snapshots if exceeding limit
    if (existing.length >= maxSnapshots) {
      const toDelete = existing.slice(maxSnapshots - 1);
      await db.snapshots.bulkDelete(toDelete.map(s => s.id));
    }
    
    // Save new snapshot
    await this.saveSnapshot(caseId, snapshot);
  }
}

// Export singleton instance
export const caseManager = new CaseManager();

export default caseManager;
