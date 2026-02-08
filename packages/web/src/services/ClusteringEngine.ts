/**
 * ClusteringEngine - Multi-algorithm clustering for wallet analysis
 * Client-side implementations of HDBSCAN and Louvain clustering
 */

import { WalletFeatures } from './FeatureExtractor';

export interface Cluster {
  id: string;
  wallets: string[];
  centroid: number[];
  suspicionScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  reasons: string[];
  feature: {
    avgConsolidation: number;
    avgCounterpartyScore: number;
    sharedSpenders: string[];
    sharedTokens: string[];
    burstParticipation: number;
  };
  connections: Connection[];
}

export interface Connection {
  from: string;
  to: string;
  strength: number;
  evidence: {
    type: 'shared_funder' | 'shared_spender' | 'token_overlap' | 
          'time_burst' | 'counterparty' | 'consolidation' | 'similar_behavior';
    confidence: number;
    description: string;
    txHashes?: string[];
    details?: any;
  };
}

/**
 * HDBSCAN (Hierarchical Density-Based Spatial Clustering)
 * Client-side implementation optimized for wallet features
 */
export class HDBSCANClustering {
  private minClusterSize: number;
  private minSamples: number;

  constructor(minClusterSize: number = 3, minSamples: number = 2) {
    this.minClusterSize = minClusterSize;
    this.minSamples = minSamples;
  }

  cluster(features: WalletFeatures[]): Cluster[] {
    if (features.length < this.minClusterSize) {
      return [];
    }

    // Convert features to feature vectors
    const vectors = features.map(f => this.toFeatureVector(f));
    
    // Compute distance matrix
    const distances = this.computeDistanceMatrix(vectors);
    
    // Build minimum spanning tree
    const mst = this.buildMST(distances);
    
    // Compute reachability distances
    const reachability = this.computeReachability(distances, mst);
    
    // Build hierarchy
    const hierarchy = this.buildHierarchy(reachability);
    
    // Extract clusters
    return this.extractClusters(hierarchy, features);
  }

  private toFeatureVector(f: WalletFeatures): number[] {
    // Normalize features to 0-1 range
    return [
      // Funding pattern
      f.funders.length > 0 ? 1 / Math.min(5, f.funders.length) : 0,
      
      // Token diversity
      Math.min(f.tokens.length / 10, 1),
      
      // Spender diversity
      Math.min(f.spenders.length / 5, 1),
      
      // Consolidation
      f.consolidationScore / 100,
      
      // Counterparty interactions
      f.sharedCounterpartyScore / 100,
      
      // Activity timing (normalized)
      f.uniqueDaysActive > 0 ? Math.min(f.uniqueDaysActive / 30, 1) : 0,
      
      // Burst participation
      f.burstEvents.length > 0 ? Math.min(f.burstEvents.length / 3, 1) : 0,
      
      // Transaction volume
      Math.min(f.totalTransactions / 100, 1)
    ];
  }

  private computeDistanceMatrix(vectors: number[][]): number[][] {
    const n = vectors.length;
    const distances: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.euclideanDistance(vectors[i], vectors[j]);
        distances[i][j] = dist;
        distances[j][i] = dist;
      }
    }
    
    return distances;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  private buildMST(distances: number[][]): Array<{from: number; to: number; weight: number}> {
    const n = distances.length;
    const mst: Array<{from: number; to: number; weight: number}> = [];
    const visited = new Set<number>();
    
    // Start from node 0
    visited.add(0);
    
    while (visited.size < n) {
      let minEdge = { from: -1, to: -1, weight: Infinity };
      
      // Find minimum edge connecting visited to unvisited
      for (const from of visited) {
        for (let to = 0; to < n; to++) {
          if (!visited.has(to) && distances[from][to] < minEdge.weight) {
            minEdge = { from, to, weight: distances[from][to] };
          }
        }
      }
      
      if (minEdge.to !== -1) {
        mst.push(minEdge);
        visited.add(minEdge.to);
      }
    }
    
    return mst;
  }

  private computeReachability(
    distances: number[][],
    mst: Array<{from: number; to: number; weight: number}>
  ): number[] {
    const n = distances.length;
    const reachability = new Array(n).fill(Infinity);
    
    // For each point, find distance to kth nearest neighbor
    const k = this.minSamples;
    
    for (let i = 0; i < n; i++) {
      const neighbors = distances[i]
        .map((d, idx) => ({ dist: d, idx }))
        .filter(n => n.idx !== i)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, k);
      
      if (neighbors.length >= k) {
        reachability[i] = neighbors[k - 1].dist;
      }
    }
    
    return reachability;
  }

  private buildHierarchy(reachability: number[]): Array<{level: number; points: number[]}> {
    const n = reachability.length;
    const hierarchy: Array<{level: number; points: number[]}> = [];
    const sorted = reachability
      .map((r, i) => ({ reachability: r, index: i }))
      .sort((a, b) => a.reachability - b.reachability);
    
    let currentLevel = -1;
    let currentPoints: number[] = [];
    
    for (const point of sorted) {
      if (point.reachability !== currentLevel) {
        if (currentPoints.length > 0) {
          hierarchy.push({ level: currentLevel, points: [...currentPoints] });
        }
        currentLevel = point.reachability;
        currentPoints = [point.index];
      } else {
        currentPoints.push(point.index);
      }
    }
    
    if (currentPoints.length > 0) {
      hierarchy.push({ level: currentLevel, points: currentPoints });
    }
    
    return hierarchy;
  }

  private extractClusters(
    hierarchy: Array<{level: number; points: number[]}>,
    features: WalletFeatures[]
  ): Cluster[] {
    const clusters: Cluster[] = [];
    
    for (const level of hierarchy) {
      if (level.points.length >= this.minClusterSize && level.level < Infinity) {
        const clusterFeatures = level.points.map(i => features[i]);
        const wallets = clusterFeatures.map(f => f.address);
        
        clusters.push({
          id: `hdbscan-${clusters.length}`,
          wallets,
          centroid: this.computeCentroid(clusterFeatures),
          suspicionScore: this.calculateSuspicionScore(clusterFeatures),
          riskLevel: this.determineRiskLevel(clusterFeatures),
          reasons: this.generateReasons(clusterFeatures),
          feature: this.computeClusterFeatures(clusterFeatures),
          connections: []
        });
      }
    }
    
    return clusters;
  }

  private computeCentroid(features: WalletFeatures[]): number[] {
    const vectors = features.map(f => this.toFeatureVector(f));
    const n = vectors.length;
    const dim = vectors[0].length;
    
    const centroid = new Array(dim).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += v[i];
      }
    }
    
    return centroid.map(sum => sum / n);
  }

  private calculateSuspicionScore(features: WalletFeatures[]): number {
    let score = 0;
    
    // Cluster size factor
    const sizeFactor = Math.min(features.length / 20, 1) * 20;
    score += sizeFactor;
    
    // Average consolidation
    const avgConsolidation = features.reduce((sum, f) => sum + f.consolidationScore, 0) / features.length;
    score += (avgConsolidation / 100) * 15;
    
    // Token similarity
    const tokenSets = features.map(f => new Set(f.tokenFingerprint.split(',')));
    const similarity = this.calculateJaccardSimilarity(tokenSets);
    score += similarity * 20;
    
    // Shared funders
    const funderSets = features.map(f => new Set(f.funders.map(funder => funder.address)));
    const sharedFunders = this.calculateIntersection(funderSets);
    if (sharedFunders.size > 0) score += 25;
    
    // Burst participation
    const burstRate = features.filter(f => f.burstEvents.length > 0).length / features.length;
    score += burstRate * 20;
    
    return Math.min(100, score);
  }

  private determineRiskLevel(features: WalletFeatures[]): 'critical' | 'high' | 'medium' | 'low' {
    const score = this.calculateSuspicionScore(features);
    
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private generateReasons(features: WalletFeatures[]): string[] {
    const reasons: string[] = [];
    
    if (features.length >= 10) {
      reasons.push(`Large cluster (${features.length} wallets)`);
    }
    
    const sharedFunders = this.findSharedFunders(features);
    if (sharedFunders.length > 0) {
      reasons.push(`Shared funders: ${sharedFunders.slice(0, 3).join(', ')}`);
    }
    
    const avgConsolidation = features.reduce((sum, f) => sum + f.consolidationScore, 0) / features.length;
    if (avgConsolidation > 60) {
      reasons.push('High consolidation to shared recipients');
    }
    
    const burstRate = features.filter(f => f.burstEvents.length > 0).length / features.length;
    if (burstRate > 0.5) {
      reasons.push('Coordinated activity bursts detected');
    }
    
    return reasons;
  }

  private computeClusterFeatures(features: WalletFeatures[]) {
    return {
      avgConsolidation: features.reduce((sum, f) => sum + f.consolidationScore, 0) / features.length,
      avgCounterpartyScore: features.reduce((sum, f) => sum + f.sharedCounterpartyScore, 0) / features.length,
      sharedSpenders: this.findSharedSpenders(features),
      sharedTokens: this.findSharedTokens(features),
      burstParticipation: features.filter(f => f.burstEvents.length > 0).length / features.length
    };
  }

  private calculateJaccardSimilarity(sets: Set<string>[]): number {
    if (sets.length < 2) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const intersection = new Set([...sets[i]].filter(x => sets[j].has(x)));
        const union = new Set([...sets[i], ...sets[j]]);
        
        if (union.size > 0) {
          totalSimilarity += intersection.size / union.size;
          comparisons++;
        }
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateIntersection(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) return new Set();
    
    let intersection = new Set(sets[0]);
    for (let i = 1; i < sets.length; i++) {
      intersection = new Set([...intersection].filter(x => sets[i].has(x)));
    }
    
    return intersection;
  }

  private findSharedFunders(features: WalletFeatures[]): string[] {
    const funderSets = features.map(f => new Set(f.funders.map(funder => funder.address)));
    const shared = this.calculateIntersection(funderSets);
    return Array.from(shared);
  }

  private findSharedSpenders(features: WalletFeatures[]): string[] {
    const spenderSets = features.map(f => new Set(f.spenders.map(s => s.address)));
    const shared = this.calculateIntersection(spenderSets);
    return Array.from(shared).slice(0, 5);
  }

  private findSharedTokens(features: WalletFeatures[]): string[] {
    const tokenSets = features.map(f => new Set(f.tokenFingerprint.split(',')));
    const shared = this.calculateIntersection(tokenSets);
    return Array.from(shared).slice(0, 5);
  }
}

/**
 * Louvain Community Detection
 * Optimized graph-based clustering
 */
export class LouvainClustering {
  private resolution: number;

  constructor(resolution: number = 1.0) {
    this.resolution = resolution;
  }

  cluster(features: WalletFeatures[]): Cluster[] {
    // Build similarity graph
    const graph = this.buildGraph(features);
    
    // Run Louvain algorithm
    const communities = this.louvain(graph);
    
    // Convert to clusters
    return this.communitiesToClusters(communities, features);
  }

  private buildGraph(features: WalletFeatures[]): Map<number, Map<number, number>> {
    const graph = new Map<number, Map<number, number>>();
    
    for (let i = 0; i < features.length; i++) {
      graph.set(i, new Map());
      
      for (let j = i + 1; j < features.length; j++) {
        const similarity = this.calculateSimilarity(features[i], features[j]);
        
        if (similarity > 0.3) { // Threshold for edge
          graph.get(i)!.set(j, similarity);
          
          if (!graph.has(j)) {
            graph.set(j, new Map());
          }
          graph.get(j)!.set(i, similarity);
        }
      }
    }
    
    return graph;
  }

  private calculateSimilarity(a: WalletFeatures, b: WalletFeatures): number {
    let score = 0;
    let factors = 0;
    
    // Token overlap
    const tokensA = new Set(a.tokenFingerprint.split(','));
    const tokensB = new Set(b.tokenFingerprint.split(','));
    const tokenIntersection = new Set([...tokensA].filter(x => tokensB.has(x)));
    const tokenUnion = new Set([...tokensA, ...tokensB]);
    if (tokenUnion.size > 0) {
      score += (tokenIntersection.size / tokenUnion.size) * 0.25;
      factors++;
    }
    
    // Spender overlap
    const spendersA = new Set(a.spenderFingerprint.split(','));
    const spendersB = new Set(b.spenderFingerprint.split(','));
    const spenderIntersection = new Set([...spendersA].filter(x => spendersB.has(x)));
    if (spendersA.size > 0 || spendersB.size > 0) {
      score += (spenderIntersection.size / Math.max(spendersA.size, spendersB.size, 1)) * 0.25;
      factors++;
    }
    
    // Shared funders
    const fundersA = new Set(a.funders.map(f => f.address));
    const fundersB = new Set(b.funders.map(f => f.address));
    const sharedFunders = new Set([...fundersA].filter(x => fundersB.has(x)));
    if (sharedFunders.size > 0) {
      score += 0.25;
      factors++;
    }
    
    // Temporal similarity (activity patterns)
    const timeDiff = Math.abs(a.firstActivity - b.firstActivity);
    if (timeDiff < 86400) { // Within 24 hours
      score += 0.15;
      factors++;
    }
    
    // Burst overlap
    const burstOverlap = a.burstEvents.some(be => 
      b.burstEvents.some(be2 => be.id === be2.id)
    );
    if (burstOverlap) {
      score += 0.20;
      factors++;
    }
    
    return factors > 0 ? score : 0;
  }

  private louvain(graph: Map<number, Map<number, number>>): Map<number, number> {
    // Simplified Louvain implementation
    const n = graph.size;
    const communities = new Map<number, number>();
    
    // Initialize: each node in its own community
    for (let i = 0; i < n; i++) {
      communities.set(i, i);
    }
    
    let modularity = this.calculateModularity(graph, communities);
    let improved = true;
    let iterations = 0;
    const maxIterations = 10;
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      for (const [node, currentCommunity] of communities) {
        const neighborCommunities = this.getNeighborCommunities(node, graph, communities);
        
        let bestCommunity = currentCommunity;
        let bestGain = 0;
        
        for (const [community, weight] of neighborCommunities) {
          const gain = this.calculateModularityGain(node, community, graph, communities, weight);
          
          if (gain > bestGain) {
            bestGain = gain;
            bestCommunity = community;
          }
        }
        
        if (bestCommunity !== currentCommunity) {
          communities.set(node, bestCommunity);
          improved = true;
        }
      }
      
      const newModularity = this.calculateModularity(graph, communities);
      if (newModularity - modularity < 0.0001) {
        break;
      }
      modularity = newModularity;
    }
    
    return communities;
  }

  private getNeighborCommunities(
    node: number,
    graph: Map<number, Map<number, number>>,
    communities: Map<number, number>
  ): Map<number, number> {
    const neighborCommunities = new Map<number, number>();
    const neighbors = graph.get(node) || new Map();
    
    for (const [neighbor, weight] of neighbors) {
      const community = communities.get(neighbor)!;
      neighborCommunities.set(community, (neighborCommunities.get(community) || 0) + weight);
    }
    
    return neighborCommunities;
  }

  private calculateModularity(
    graph: Map<number, Map<number, number>>,
    communities: Map<number, number>
  ): number {
    let modularity = 0;
    const m = this.getTotalWeight(graph);
    
    if (m === 0) return 0;
    
    for (const [i, neighbors] of graph) {
      const ki = this.getNodeWeight(i, graph);
      
      for (const [j, weight] of neighbors) {
        if (communities.get(i) === communities.get(j)) {
          const kj = this.getNodeWeight(j, graph);
          modularity += weight - (ki * kj) / (2 * m);
        }
      }
    }
    
    return modularity / (2 * m);
  }

  private calculateModularityGain(
    node: number,
    newCommunity: number,
    graph: Map<number, Map<number, number>>,
    communities: Map<number, number>,
    weightToCommunity: number
  ): number {
    const m = this.getTotalWeight(graph);
    const ki = this.getNodeWeight(node, graph);
    
    // Sum of weights to nodes in new community
    let sumIn = weightToCommunity;
    
    // Total weight of new community
    let sumTot = 0;
    for (const [n, comm] of communities) {
      if (comm === newCommunity && n !== node) {
        sumTot += this.getNodeWeight(n, graph);
      }
    }
    
    return (sumIn - ki * sumTot / (2 * m));
  }

  private getTotalWeight(graph: Map<number, Map<number, number>>): number {
    let total = 0;
    for (const neighbors of graph.values()) {
      for (const weight of neighbors.values()) {
        total += weight;
      }
    }
    return total / 2; // Each edge counted twice
  }

  private getNodeWeight(node: number, graph: Map<number, Map<number, number>>): number {
    let weight = 0;
    const neighbors = graph.get(node);
    if (neighbors) {
      for (const w of neighbors.values()) {
        weight += w;
      }
    }
    return weight;
  }

  private communitiesToClusters(
    communities: Map<number, number>,
    features: WalletFeatures[]
  ): Cluster[] {
    // Group by community
    const communityMap = new Map<number, number[]>();
    
    for (const [node, community] of communities) {
      if (!communityMap.has(community)) {
        communityMap.set(community, []);
      }
      communityMap.get(community)!.push(node);
    }
    
    // Create clusters
    const clusters: Cluster[] = [];
    
    for (const [communityId, nodes] of communityMap) {
      if (nodes.length >= 3) { // Min cluster size
        const clusterFeatures = nodes.map(i => features[i]);
        const wallets = clusterFeatures.map(f => f.address);
        
        // Calculate centroid
        const hdbscan = new HDBSCANClustering();
        
        clusters.push({
          id: `louvain-${communityId}`,
          wallets,
          centroid: [], // Will be computed later
          suspicionScore: hdbscan['calculateSuspicionScore'](clusterFeatures),
          riskLevel: hdbscan['determineRiskLevel'](clusterFeatures),
          reasons: hdbscan['generateReasons'](clusterFeatures),
          feature: hdbscan['computeClusterFeatures'](clusterFeatures),
          connections: []
        });
      }
    }
    
    return clusters;
  }
}

/**
 * Ensemble Clustering Engine
 * Combines multiple algorithms for robust clustering
 */
export class EnsembleClustering {
  async cluster(features: WalletFeatures[]): Promise<Cluster[]> {
    if (features.length < 3) {
      return [];
    }

    // Run both algorithms
    const hdbscan = new HDBSCANClustering(3, 2);
    const louvain = new LouvainClustering(1.0);
    
    const [hdbscanClusters, louvainClusters] = await Promise.all([
      Promise.resolve(hdbscan.cluster(features)),
      Promise.resolve(louvain.cluster(features))
    ]);
    
    // Ensemble: Wallets clustered by both algorithms are high-confidence
    const ensembleClusters = this.mergeClusters(
      hdbscanClusters,
      louvainClusters,
      features
    );
    
    // Add connections between wallets
    this.addConnections(ensembleClusters, features);
    
    // Calculate final suspicion scores
    this.finalizeClusters(ensembleClusters);
    
    return ensembleClusters.sort((a, b) => b.suspicionScore - a.suspicionScore);
  }

  private mergeClusters(
    hdbscanClusters: Cluster[],
    louvainClusters: Cluster[],
    features: WalletFeatures[]
  ): Cluster[] {
    const walletToClusters = new Map<string, Set<string>>();
    
    // Map wallets to clusters from each algorithm
    for (const cluster of [...hdbscanClusters, ...louvainClusters]) {
      for (const wallet of cluster.wallets) {
        if (!walletToClusters.has(wallet)) {
          walletToClusters.set(wallet, new Set());
        }
        walletToClusters.get(wallet)!.add(cluster.id);
      }
    }
    
    // Group wallets that appear together in multiple clusters
    const clusterGroups = new Map<string, string[]>();
    
    for (const [wallet, clusters] of walletToClusters) {
      const clusterKey = Array.from(clusters).sort().join(',');
      
      if (!clusterGroups.has(clusterKey)) {
        clusterGroups.set(clusterKey, []);
      }
      clusterGroups.get(clusterKey)!.push(wallet);
    }
    
    // Create final clusters (only those with agreement)
    const finalClusters: Cluster[] = [];
    let clusterId = 0;
    
    for (const [clusterKey, wallets] of clusterGroups) {
      if (wallets.length >= 3) {
        const clusterFeatures = features.filter(f => wallets.includes(f.address));
        const hdbscan = new HDBSCANClustering();
        
        finalClusters.push({
          id: `ensemble-${clusterId++}`,
          wallets,
          centroid: [],
          suspicionScore: hdbscan['calculateSuspicionScore'](clusterFeatures),
          riskLevel: hdbscan['determineRiskLevel'](clusterFeatures),
          reasons: this.enhanceReasons(
            hdbscan['generateReasons'](clusterFeatures),
            clusterKey.includes(',')
          ),
          feature: hdbscan['computeClusterFeatures'](clusterFeatures),
          connections: []
        });
      }
    }
    
    return finalClusters;
  }

  private enhanceReasons(reasons: string[], multiAlgorithm: boolean): string[] {
    const enhanced = [...reasons];
    
    if (multiAlgorithm) {
      enhanced.unshift('✓ Confirmed by multiple clustering algorithms');
    }
    
    return enhanced;
  }

  private addConnections(clusters: Cluster[], features: WalletFeatures[]) {
    const featureMap = new Map(features.map(f => [f.address, f]));
    
    for (const cluster of clusters) {
      cluster.connections = [];
      
      // Find connections between wallets in cluster
      for (let i = 0; i < cluster.wallets.length; i++) {
        for (let j = i + 1; j < cluster.wallets.length; j++) {
          const walletA = cluster.wallets[i];
          const walletB = cluster.wallets[j];
          const featuresA = featureMap.get(walletA)!;
          const featuresB = featureMap.get(walletB)!;
          
          const connection = this.findConnection(featuresA, featuresB);
          if (connection) {
            cluster.connections.push(connection);
          }
        }
      }
    }
  }

  private findConnection(a: WalletFeatures, b: WalletFeatures): Connection | null {
    // Check for shared funders
    const fundersA = new Set(a.funders.map(f => f.address));
    const fundersB = new Set(b.funders.map(f => f.address));
    const sharedFunders = new Set([...fundersA].filter(x => fundersB.has(x)));
    
    if (sharedFunders.size > 0) {
      const funder = Array.from(sharedFunders)[0];
      const funderData = a.funders.find(f => f.address === funder);
      
      return {
        from: a.address,
        to: b.address,
        strength: sharedFunders.size * 0.3,
        evidence: {
          type: 'shared_funder',
          confidence: Math.min(95, 60 + sharedFunders.size * 10),
          description: `Both wallets funded by ${funder.slice(0, 6)}...${funder.slice(-4)}`,
          txHashes: funderData ? [funderData.txHash] : undefined,
          details: {
            funderAddress: funder,
            amountA: a.funders.find(f => f.address === funder)?.amount,
            amountB: b.funders.find(f => f.address === funder)?.amount
          }
        }
      };
    }
    
    // Check for shared spenders
    const spendersA = new Set(a.spenders.map(s => s.address));
    const spendersB = new Set(b.spenders.map(s => s.address));
    const sharedSpenders = new Set([...spendersA].filter(x => spendersB.has(x)));
    
    if (sharedSpenders.size > 0) {
      const spender = Array.from(sharedSpenders)[0];
      const spenderData = a.spenders.find(s => s.address === spender);
      
      return {
        from: a.address,
        to: b.address,
        strength: sharedSpenders.size * 0.25,
        evidence: {
          type: 'shared_spender',
          confidence: Math.min(90, 50 + sharedSpenders.size * 15),
          description: `Both wallets approved ${spenderData?.protocols[0] || 'unknown protocol'}`,
          details: {
            spenderAddress: spender,
            protocol: spenderData?.protocols[0],
            approvalCountA: spenderData?.count,
            approvalCountB: b.spenders.find(s => s.address === spender)?.count
          }
        }
      };
    }
    
    // Check for token overlap
    const tokensA = new Set(a.tokenFingerprint.split(','));
    const tokensB = new Set(b.tokenFingerprint.split(','));
    const sharedTokens = new Set([...tokensA].filter(x => tokensB.has(x)));
    
    if (sharedTokens.size >= 3) {
      return {
        from: a.address,
        to: b.address,
        strength: Math.min(0.3, sharedTokens.size * 0.05),
        evidence: {
          type: 'token_overlap',
          confidence: Math.min(85, 40 + sharedTokens.size * 5),
          description: `${sharedTokens.size} shared token contracts`,
          details: {
            sharedTokenCount: sharedTokens.size,
            jaccardSimilarity: sharedTokens.size / new Set([...tokensA, ...tokensB]).size
          }
        }
      };
    }
    
    // Check for burst overlap
    const sharedBursts = a.burstEvents.filter(be => 
      b.burstEvents.some(be2 => be.id === be2.id)
    );
    
    if (sharedBursts.length > 0) {
      return {
        from: a.address,
        to: b.address,
        strength: sharedBursts.length * 0.2,
        evidence: {
          type: 'time_burst',
          confidence: Math.min(95, 70 + sharedBursts.length * 10),
          description: `Participated in ${sharedBursts.length} coordinated activity burst(s)`,
          details: {
            burstIds: sharedBursts.map(b => b.id),
            timeWindows: sharedBursts.map(b => ({
              start: b.startTime,
              end: b.endTime
            }))
          }
        }
      };
    }
    
    // Check for behavioral similarity (fallback)
    const similarity = this.calculateBehavioralSimilarity(a, b);
    if (similarity > 0.7) {
      return {
        from: a.address,
        to: b.address,
        strength: similarity * 0.15,
        evidence: {
          type: 'similar_behavior',
          confidence: Math.round(similarity * 100),
          description: 'High behavioral similarity detected',
          details: {
            similarityScore: similarity,
            features: ['token_profile', 'activity_pattern', 'spender_set']
          }
        }
      };
    }
    
    return null;
  }

  private calculateBehavioralSimilarity(a: WalletFeatures, b: WalletFeatures): number {
    let score = 0;
    let factors = 0;
    
    // Token profile similarity
    const tokensA = new Set(a.tokens.map(t => t.symbol));
    const tokensB = new Set(b.tokens.map(t => t.symbol));
    const tokenIntersect = new Set([...tokensA].filter(x => tokensB.has(x)));
    const tokenUnion = new Set([...tokensA, ...tokensB]);
    if (tokenUnion.size > 0) {
      score += (tokenIntersect.size / tokenUnion.size) * 0.3;
      factors++;
    }
    
    // Activity timing similarity
    if (Math.abs(a.firstActivity - b.firstActivity) < 86400) {
      score += 0.25;
      factors++;
    }
    
    // Spender similarity
    const spendersA = new Set(a.spenders.map(s => s.address));
    const spendersB = new Set(b.spenders.map(s => s.address));
    const spenderIntersect = new Set([...spendersA].filter(x => spendersB.has(x)));
    if (spendersA.size > 0 || spendersB.size > 0) {
      score += (spenderIntersect.size / Math.max(spendersA.size, spendersB.size, 1)) * 0.25;
      factors++;
    }
    
    // Token profile overlap
    if (a.tokenProfile.some(p => b.tokenProfile.includes(p))) {
      score += 0.2;
      factors++;
    }
    
    return factors > 0 ? score : 0;
  }

  private finalizeClusters(clusters: Cluster[]) {
    for (const cluster of clusters) {
      // Boost score if many connections
      const connectionBoost = Math.min(10, cluster.connections.length * 0.5);
      cluster.suspicionScore = Math.min(100, cluster.suspicionScore + connectionBoost);
      
      // Update risk level based on final score
      if (cluster.suspicionScore >= 80) cluster.riskLevel = 'critical';
      else if (cluster.suspicionScore >= 60) cluster.riskLevel = 'high';
      else if (cluster.suspicionScore >= 40) cluster.riskLevel = 'medium';
      else cluster.riskLevel = 'low';
    }
  }
}

export default {
  HDBSCANClustering,
  LouvainClustering,
  EnsembleClustering
};
