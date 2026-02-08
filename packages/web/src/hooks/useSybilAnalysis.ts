/**
 * useSybilAnalysis - React hook for advanced Sybil detection
 * Integrates FeatureExtractor, ClusteringEngine, and CaseManager
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { FeatureExtractor, WalletFeatures } from '../services/FeatureExtractor';
import { EnsembleClustering, Cluster } from '../services/ClusteringEngine';
import { caseManager, InvestigationCase, AnalysisSnapshot, Campaign } from '../services/CaseManager';

interface AnalysisState {
  status: 'idle' | 'extracting' | 'clustering' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface AnalysisResult {
  features: WalletFeatures[];
  clusters: Cluster[];
  campaigns: Campaign[];
  snapshot?: AnalysisSnapshot;
}

export function useSybilAnalysis(caseId?: string) {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [currentCase, setCurrentCase] = useState<InvestigationCase | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load case on mount
  useEffect(() => {
    if (caseId) {
      caseManager.getCase(caseId).then(setCurrentCase);
    }
  }, [caseId]);

  const analyze = useCallback(async (
    addresses: string[],
    chain: string = 'linea',
    options: {
      onProgress?: (message: string, progress: number) => void;
      saveSnapshot?: boolean;
    } = {}
  ): Promise<AnalysisResult | null> => {
    // Reset state
    setState({ status: 'extracting', progress: 0, message: 'Initializing analysis...' });
    setResult(null);
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Phase 1: Feature Extraction
      setState({ status: 'extracting', progress: 10, message: 'Extracting wallet features...' });
      
      const extractor = new FeatureExtractor(chain, (progress) => {
        const overallProgress = 10 + (progress * 0.4); // 10-50%
        setState({ 
          status: 'extracting', 
          progress: overallProgress, 
          message: `Extracting features... ${Math.round(progress)}%` 
        });
        options.onProgress?.('Extracting wallet features...', overallProgress);
      });
      
      // Check for abort
      if (abortControllerRef.current.signal.aborted) {
        throw new Error('Analysis aborted');
      }
      
      const features = await extractor.extractFeaturesBatch(
        addresses,
        (completed, total) => {
          const progress = (completed / total) * 100;
          const overallProgress = 10 + (progress * 0.4);
          setState({
            status: 'extracting',
            progress: overallProgress,
            message: `Analyzing wallets... ${completed}/${total}`
          });
        }
      );
      
      if (features.length === 0) {
        throw new Error('No valid wallet data extracted');
      }
      
      // Phase 2: Clustering
      setState({ status: 'clustering', progress: 50, message: 'Running clustering algorithms...' });
      options.onProgress?.('Running HDBSCAN and Louvain clustering...', 50);
      
      const clustering = new EnsembleClustering();
      const clusters = await clustering.cluster(features);
      
      setState({ status: 'clustering', progress: 80, message: 'Detecting campaigns...' });
      options.onProgress?.('Detecting coordinated campaigns...', 80);
      
      // Phase 3: Campaign Detection
      const campaigns = detectCampaigns(features);
      
      // Build result
      const analysisResult: AnalysisResult = {
        features,
        clusters,
        campaigns
      };
      
      // Phase 4: Save snapshot (optional)
      if (options.saveSnapshot && caseId) {
        setState({ status: 'clustering', progress: 90, message: 'Saving results...' });
        
        const snapshot = await caseManager.saveSnapshot(caseId, {
          timestamp: Date.now(),
          walletCount: features.length,
          features,
          clusters,
          campaigns,
          summary: {
            totalClusters: clusters.length,
            highRiskWallets: features.filter(f => f.riskLevel === 'high' || f.riskLevel === 'critical').length,
            mediumRiskWallets: features.filter(f => f.riskLevel === 'medium').length,
            campaignsDetected: campaigns.length
          }
        });
        
        analysisResult.snapshot = snapshot;
      }
      
      setState({ status: 'complete', progress: 100, message: 'Analysis complete!' });
      setResult(analysisResult);
      
      return analysisResult;
      
    } catch (error: any) {
      if (error.message === 'Analysis aborted') {
        setState({ status: 'idle', progress: 0, message: 'Analysis aborted' });
      } else {
        setState({ status: 'error', progress: 0, message: error.message });
      }
      return null;
    }
  }, [caseId]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  }, []);

  return {
    state,
    result,
    currentCase,
    analyze,
    abort,
    reset
  };
}

/**
 * Detect coordinated campaigns from wallet features
 */
function detectCampaigns(features: WalletFeatures[]): Campaign[] {
  // Collect all burst events across all wallets
  const allBursts: Array<{
    id: string;
    wallet: string;
    startTime: number;
    endTime: number;
  }> = [];
  
  for (const feature of features) {
    for (const burst of feature.burstEvents) {
      allBursts.push({
        id: burst.id,
        wallet: feature.address,
        startTime: burst.startTime,
        endTime: burst.endTime
      });
    }
  }
  
  // Group by burst ID
  const burstGroups = new Map<string, typeof allBursts>();
  for (const burst of allBursts) {
    if (!burstGroups.has(burst.id)) {
      burstGroups.set(burst.id, []);
    }
    burstGroups.get(burst.id)!.push(burst);
  }
  
  // Convert to campaigns
  const campaigns: Campaign[] = [];
  let campaignIndex = 0;
  
  for (const [burstId, bursts] of burstGroups) {
    if (bursts.length >= 3) { // Min 3 wallets for a campaign
      const startTime = Math.min(...bursts.map(b => b.startTime));
      const endTime = Math.max(...bursts.map(b => b.endTime));
      
      campaigns.push({
        id: `campaign-${campaignIndex++}`,
        name: `Campaign ${String.fromCharCode(65 + campaignIndex - 1)}`,
        startTime,
        endTime,
        walletCount: bursts.length,
        eventCount: bursts.length,
        walletAddresses: bursts.map(b => b.wallet),
        description: `Coordinated activity burst with ${bursts.length} wallets participating`
      });
    }
  }
  
  return campaigns.sort((a, b) => b.walletCount - a.walletCount);
}

export default useSybilAnalysis;
