/**
 * useSybilWorker - React hook for Web Worker-based Sybil analysis
 * Provides non-blocking analysis for large datasets
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { WalletFeatures } from '../services/FeatureExtractor';
import { Cluster } from '../services/ClusteringEngine';
import { Campaign } from '../services/CaseManager';

interface WorkerState {
  status: 'idle' | 'extracting' | 'clustering' | 'complete' | 'error';
  progress: number;
  message: string;
}

interface WorkerResult {
  features: WalletFeatures[];
  clusters: Cluster[];
  campaigns: Campaign[];
}

export function useSybilWorker() {
  const [state, setState] = useState<WorkerState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  
  const [result, setResult] = useState<WorkerResult | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    // Create worker from the worker file
    workerRef.current = new Worker(
      new URL('../workers/sybilAnalysis.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'PROGRESS':
          setState({
            status: payload.phase,
            progress: payload.progress,
            message: payload.message
          });
          break;

        case 'COMPLETE':
          if (payload.phase === 'extracting') {
            // Features extracted, now cluster
            setState({
              status: 'clustering',
              progress: 50,
              message: 'Running clustering algorithms...'
            });
            
            workerRef.current?.postMessage({
              type: 'CLUSTER',
              payload: { features: payload.features }
            });
          } else if (payload.phase === 'clustering') {
            // Both phases complete
            setState({
              status: 'complete',
              progress: 100,
              message: 'Analysis complete!'
            });
            
            // Detect campaigns from features
            const campaigns = detectCampaigns(payload.features);
            
            setResult({
              features: payload.features,
              clusters: payload.clusters,
              campaigns
            });
          }
          break;

        case 'ERROR':
          setState({
            status: 'error',
            progress: 0,
            message: payload.message
          });
          break;
      }
    };

    // Cleanup
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const analyze = useCallback((
    addresses: string[],
    chain: string = 'linea'
  ) => {
    setState({ status: 'extracting', progress: 0, message: 'Starting analysis...' });
    setResult(null);

    workerRef.current?.postMessage({
      type: 'EXTRACT_FEATURES',
      payload: { addresses, chain }
    });
  }, []);

  const abort = useCallback(() => {
    workerRef.current?.postMessage({ type: 'ABORT' });
    setState({ status: 'idle', progress: 0, message: 'Analysis aborted' });
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, message: '' });
    setResult(null);
  }, []);

  return {
    state,
    result,
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
    if (bursts.length >= 3) {
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

export default useSybilWorker;
