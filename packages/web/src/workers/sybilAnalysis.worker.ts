/**
 * sybilAnalysis.worker.ts
 * Web Worker for background Sybil analysis processing
 * Prevents UI freezing during heavy computation
 */

import { FeatureExtractor, WalletFeatures } from './FeatureExtractor';
import { EnsembleClustering, Cluster } from './ClusteringEngine';

// Worker message types
interface WorkerMessage {
  type: 'EXTRACT_FEATURES' | 'CLUSTER' | 'ABORT';
  payload: any;
}

interface WorkerResponse {
  type: 'PROGRESS' | 'COMPLETE' | 'ERROR';
  payload: any;
}

// State
let abortController: AbortController | null = null;

// Message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'EXTRACT_FEATURES':
        await handleExtractFeatures(payload);
        break;
      
      case 'CLUSTER':
        await handleCluster(payload);
        break;
      
      case 'ABORT':
        abortController?.abort();
        break;
      
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error: any) {
    self.postMessage({
      type: 'ERROR',
      payload: { message: error.message }
    } as WorkerResponse);
  }
};

/**
 * Handle feature extraction in worker
 */
async function handleExtractFeatures(payload: {
  addresses: string[];
  chain: string;
}) {
  abortController = new AbortController();
  
  const { addresses, chain } = payload;
  
  // Create extractor with progress callback
  const extractor = new FeatureExtractor(chain, (progress) => {
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        phase: 'extracting',
        progress,
        message: `Extracting features... ${Math.round(progress)}%`
      }
    } as WorkerResponse);
  });

  // Check for abort
  if (abortController.signal.aborted) {
    throw new Error('Analysis aborted');
  }

  // Extract features in batches
  const features: WalletFeatures[] = [];
  const batchSize = 10;
  
  for (let i = 0; i < addresses.length; i += batchSize) {
    if (abortController.signal.aborted) {
      throw new Error('Analysis aborted');
    }
    
    const batch = addresses.slice(i, i + batchSize);
    const batchFeatures = await Promise.all(
      batch.map(addr => extractor.extractFeatures(addr))
    );
    
    features.push(...batchFeatures.filter((f): f is WalletFeatures => f !== null));
    
    // Report progress
    const progress = ((i + batch.length) / addresses.length) * 100;
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        phase: 'extracting',
        progress,
        message: `Analyzed ${i + batch.length}/${addresses.length} wallets`
      }
    } as WorkerResponse);
    
    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  self.postMessage({
    type: 'COMPLETE',
    payload: {
      phase: 'extracting',
      features
    }
  } as WorkerResponse);
}

/**
 * Handle clustering in worker
 */
async function handleCluster(payload: {
  features: WalletFeatures[];
}) {
  abortController = new AbortController();
  
  const { features } = payload;
  
  self.postMessage({
    type: 'PROGRESS',
    payload: {
      phase: 'clustering',
      progress: 0,
      message: 'Running HDBSCAN clustering...'
    }
  } as WorkerResponse);

  if (abortController.signal.aborted) {
    throw new Error('Analysis aborted');
  }

  // Run clustering
  const clustering = new EnsembleClustering();
  
  // Report intermediate progress
  self.postMessage({
    type: 'PROGRESS',
    payload: {
      phase: 'clustering',
      progress: 50,
      message: 'Running Louvain community detection...'
    }
  } as WorkerResponse);

  const clusters = await clustering.cluster(features);

  self.postMessage({
    type: 'COMPLETE',
    payload: {
      phase: 'clustering',
      clusters
    }
  } as WorkerResponse);
}

// Export for TypeScript
export {};
