// ============================================================
// FundTracer CLI - QVAC Embeddings Client
// Uses QVAC embeddings for wallet similarity and semantic search
// ============================================================

import net from 'net';
import chalk from 'chalk';

const QVAC_HOST = process.env.QVAC_HOST || '127.0.0.1';
const QVAC_PORT = parseInt(process.env.QVAC_PORT || '11434');

const c = {
    green: chalk.green,
    yellow: chalk.yellow,
    cyan: chalk.cyan,
    gray: chalk.gray,
    red: chalk.red,
};

export interface EmbeddingResult {
    embedding: number[];
    model: string;
}

export async function checkEmbeddingsAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(QVAC_PORT, QVAC_HOST);
    });
}

export async function generateEmbedding(text: string, model: string = 'NQ-WEMBED-E5-MULTI-V1'): Promise<number[] | null> {
    const available = await checkEmbeddingsAvailable();
    if (!available) {
        console.log(c.gray('Embeddings not available'));
        return null;
    }

    try {
        const response = await fetch(`http://${QVAC_HOST}:${QVAC_PORT}/v1/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                input: text
            })
        });

        if (!response.ok) {
            console.log(c.gray('Embedding API error: ' + response.status));
            return null;
        }

        const data = await response.json();
        return data.data?.[0]?.embedding || null;
    } catch (error) {
        console.log(c.gray('Embedding failed: ' + error));
        return null;
    }
}

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function findSimilarWallets(
    targetEmbedding: number[],
    walletEmbeddings: { address: string; embedding: number[]; chain: string }[],
    topK: number = 5
): Promise<{ address: string; chain: string; similarity: number }[]> {
    const results = walletEmbeddings.map(w => ({
        address: w.address,
        chain: w.chain,
        similarity: cosineSimilarity(targetEmbedding, w.embedding)
    }));
    
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
}

export function printEmbeddingsNotAvailable(): void {
    console.log(c.yellow('\n⚠️  Embeddings not available'));
    console.log(c.gray('  Run: fundtracer qvac-setup\n'));
}