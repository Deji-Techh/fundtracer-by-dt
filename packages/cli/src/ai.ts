// ============================================================
// FundTracer CLI - QVAC AI Integration
// ============================================================
// Local AI integration using QVAC server (OpenAI-compatible)
// Falls back gracefully if QVAC not available
// Supports both local and hosted QVAC servers

import net from 'net';
import chalk from 'chalk';

// Check QVAC_HOST env var for custom hosted server, default to local
const QVAC_HOST = process.env.QVAC_HOST || process.env.QVAC_URL || '127.0.0.1';
const QVAC_PORT = parseInt(process.env.QVAC_PORT || '11434');
const QVAC_MODEL = process.env.QVAC_MODEL || 'fundtracer-ai';

// Detect if using hosted server (not localhost)
const isHosted = !QVAC_HOST.includes('localhost') && !QVAC_HOST.startsWith('127.');
const BASE_URL = isHosted 
    ? QVAC_HOST.replace(/\/$/, '')  // Use as-is for hosted
    : `http://${QVAC_HOST}:${QVAC_PORT}`;  // Construct for local

const c = {
    bold: chalk.bold,
    green: chalk.green,
    yellow: chalk.yellow,
    cyan: chalk.cyan,
    gray: chalk.gray,
    red: chalk.red,
};

export interface QVACMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface QVACCompletionOptions {
    model?: string;
    messages: QVACMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

export interface QVACCompletionResponse {
    id: string;
    choices: {
        message: QVACMessage;
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// System prompt for blockchain analysis
const BLOCKCHAIN_SYSTEM_PROMPT = `You are FundTracer AI, an expert blockchain forensics analyst specializing in scam detection.

## What FundTracer Does
FundTracer detects suspicious on-chain behavior:
- RAPID MOVEMENT: Funds moving quickly through many addresses (money laundering)
- SAME-BLOCK: Multiple txs in same block (bot/MEV activity)  
- SYBIL: Coordinated activity from multiple fake identities
- CIRCULAR: Funds cycling through addresses (layering)
- DUST: Spam tiny amounts to fingerprint addresses
- FRESH: Newly created wallets with immediate suspicious activity
- WASH: Artificial trading volume to manipulate prices

## Risk Scoring
- 75+ = CRITICAL (scam/juice likely)
- 50+ = HIGH risk
- 25+ = MEDIUM risk
- 0-25 = LOW risk (normal activity)

## Your Task
Analyze the wallet data and provide SPECIFIC, ACTIONABLE insights.
- If LOW RISK: Say "LOW RISK - appears to be a regular [user type]"
- If suspicious: Explain WHY with specific evidence from the data
- NEVER just restate the numbers - interpret what they mean

IMPORTANT: Provide actual analysis, not generic filler text.
CRITICAL: Never include thinking tags - just output the response directly without any internal AI thinking.
`;

export async function checkQVACAvailable(): Promise<boolean> {
    // If hosted server, just check if we can reach it
    if (isHosted) {
        try {
            const response = await fetch(`${BASE_URL}/v1/models`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    // Local server check using TCP
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 2000; // 2 second timeout

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(QVAC_PORT, QVAC_HOST);
    });
}

export async function sendCompletion(
    messages: QVACMessage[],
    options?: Partial<QVACCompletionOptions>
): Promise<QVACCompletionResponse | null> {
    const available = await checkQVACAvailable();
    if (!available) {
        return null;
    }

    try {
        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: options?.model || QVAC_MODEL,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.max_tokens ?? 500,
                stream: false,
            }),
        });

        if (!response.ok) {
            console.error(c.gray(`QVAC API error: ${response.status}`));
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(c.gray(`QVAC request failed: ${error}`));
        return null;
    }
}

export async function streamCompletion(
    messages: QVACMessage[],
    onChunk: (content: string) => void,
    options?: Partial<QVACCompletionOptions>
): Promise<boolean> {
    const available = await checkQVACAvailable();
    if (!available) {
        return false;
    }

    try {
        const response = await fetch(`http://${QVAC_HOST}:${QVAC_PORT}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: options?.model || QVAC_MODEL,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.max_tokens ?? 500,
                stream: true,
            }),
        });

        if (!response.ok) {
            return false;
        }

        if (!response.body) {
            return false;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '' && line.startsWith('data: '));

            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        onChunk(content);
                    }
                } catch {
                    // Skip invalid JSON
                }
            }
        }

        return true;
    } catch (error) {
        console.error(c.gray(`QVAC stream failed: ${error}`));
        return false;
    }
}

export async function generateWalletInsights(
    walletAddress: string,
    chain: string,
    riskScore: number,
    riskLevel: string,
    summary: {
        totalTransactions?: number;
        totalValueSentEth?: number;
        totalValueReceivedEth?: number;
        topFundingSources?: { address: string; valueEth: number }[];
        topFundingDestinations?: { address: string; valueEth: number }[];
    }
): Promise<string | null> {
    const userMessage = `
Analyze this wallet and answer these specific questions:

1. Is this a SYBIL address? (coordinated fake activity)
2. Is this related to a MIXER? (Tornado Cash style)
3. What type of user is this? (trader, whale, scammer, etc.)
4. Any specific red flags?

Data:
- Address: ${walletAddress}
- Chain: ${chain}
- Risk Score: ${riskScore}/100 (${riskLevel})
- Total Transactions: ${summary.totalTransactions || 0}
- Total Sent: ${summary.totalValueSentEth || 0} ETH
- Total Received: ${summary.totalValueReceivedEth || 0} ETH

Top Funders:
${(summary.topFundingSources || []).slice(0, 3).map((f, i) => `${i + 1}. ${f.address} (${f.valueEth} ETH)`).join('\n') || 'None'}

Top Destinations:
${(summary.topFundingDestinations || []).slice(0, 3).map((d, i) => `${i + 1}. ${d.address} (${d.valueEth} ETH)`).join('\n') || 'None'}

Answer each question specifically. If no red flags, say "No specific concerns - appears to be a regular wallet."`;

    const messages: QVACMessage[] = [
        { role: 'system', content: BLOCKCHAIN_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
    ];

    const response = await sendCompletion(messages, { max_tokens: 500 });
    if (!response) return null;

    return response.choices?.[0]?.message?.content || null;
}

export async function chatWithAI(
    userInput: string,
    history: QVACMessage[] = []
): Promise<string | null> {
    const messages: QVACMessage[] = [
        { role: 'system', content: BLOCKCHAIN_SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: userInput },
    ];

    const response = await sendCompletion(messages, { max_tokens: 500 });
    if (!response) return null;

    return response.choices?.[0]?.message?.content || null;
}

export function printQVACNotAvailable(): void {
    console.log(c.yellow('\n⚠️  QVAC not available'));
    console.log(c.gray('  AI features require a running QVAC server\n'));
    console.log(c.bold('Options:'));
    console.log();
    console.log(c.cyan('  1. Use hosted server (if available):'));
    console.log(c.gray('     fundtracer analyze 0x... --ai'));
    console.log(c.gray('     (QVAC_URL is automatically detected)'));
    console.log();
    console.log(c.cyan('  2. Run local QVAC server:'));
    console.log(c.gray('     git clone https://github.com/tetherto/qvac.git'));
    console.log(c.gray('     cd qvac && npm install'));
    console.log(c.gray('     npm run serve:openai'));
    console.log();
    console.log(c.cyan('  3. Or use our web app:'));
    console.log(c.gray('     fundtracer.xyz/app-evm'));
    console.log();
}

export function printQVACUnavailableInline(): void {
    process.stdout.write(c.gray(' (QVAC not running)'));
}