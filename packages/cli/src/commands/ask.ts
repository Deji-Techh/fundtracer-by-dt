// ============================================================
// FundTracer CLI - Ask Command
// Natural language Q&A about wallets using QVAC
// ============================================================

import chalk from 'chalk';
import { WalletAnalyzer } from 'fundtracer-core';
import { getApiKeys } from '../utils.js';
import { checkQVACAvailable, chatWithAI, printQVACNotAvailable, QVACMessage } from '../ai.js';

const c = {
    bold: chalk.bold,
    green: chalk.green,
    red: chalk.red,
    cyan: chalk.cyan,
    gray: chalk.gray,
};

interface AskOptions {
    chain?: string;
    history?: boolean;
}

export async function askCommand(question: string, options: AskOptions) {
    if (!question.trim()) {
        console.error(c.red('Please provide a question'));
        process.exit(1);
    }

    // Check if QVAC is available
    process.stdout.write('Checking for QVAC... ');
    const available = await checkQVACAvailable();

    if (!available) {
        console.log(c.red('not running'));
        printQVACNotAvailable();
        process.exit(1);
    }

    console.log(c.green('✓ connected'));

    // Check if question contains a wallet address
    const walletMatch = question.match(/0x[a-fA-F0-9]{40}/);
    let walletContext = '';

    if (walletMatch) {
        const address = walletMatch[0];
        const chain = options.chain || 'ethereum';

        console.log(c.gray(`\nAnalyzing wallet ${address.slice(0, 14)}... on ${chain}...`));

        try {
            const analyzer = new WalletAnalyzer(getApiKeys());
            const result = await analyzer.analyze(address, chain as any, {});

            // Build context from analysis
            walletContext = `
Wallet Analysis:
- Address: ${address}
- Chain: ${chain}
- Risk Score: ${result.overallRiskScore || 0}/100
- Risk Level: ${result.riskLevel || 'unknown'}
- Balance: ${result.wallet?.balanceInEth || 0} ETH
- Total Transactions: ${result.summary?.totalTransactions || 0}
- Total Sent: ${result.summary?.totalValueSentEth || 0} ETH
- Total Received: ${result.summary?.totalValueReceivedEth || 0} ETH

Top Funders (last 5):
${(result.summary?.topFundingSources || []).slice(0, 5).map((f: any) => `${f.address} sent ${f.valueEth} ETH`).join('\n') || 'None'}

Top Destinations (last 5):
${(result.summary?.topFundingDestinations || []).slice(0, 5).map((d: any) => `${d.address} sent ${d.valueEth} ETH`).join('\n') || 'None'}
`;
        } catch (e) {
            console.log(c.gray(`Could not fetch wallet data: ${e}`));
        }
    }

    // Build the question with context if available
    const fullQuestion = walletContext
        ? `Context:\n${walletContext}\n\nQuestion: ${question}`
        : question;

    console.log(c.bold('\n🤖 Thinking...\n'));

    const history: QVACMessage[] = [];
    const response = await chatWithAI(fullQuestion, history);

    if (response) {
        console.log(c.cyan(response));
    } else {
        console.log(c.red('Failed to get response from QVAC'));
        process.exit(1);
    }

    console.log('');
}