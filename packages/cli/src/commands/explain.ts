// ============================================================
// FundTracer CLI - Explain Command
// AI-powered wallet explanation using QVAC
// ============================================================

import chalk from 'chalk';
import ora from 'ora';
import { WalletAnalyzer } from 'fundtracer-core';
import { getApiKeys } from '../utils.js';
import { checkQVACAvailable, generateWalletInsights, printQVACNotAvailable } from '../ai.js';

const c = {
    bold: chalk.bold,
    green: chalk.green,
    red: chalk.red,
    cyan: chalk.cyan,
    gray: chalk.gray,
    yellow: chalk.yellow,
};

interface ExplainOptions {
    chain?: string;
    depth?: string;
}

export async function explainCommand(address: string, options: ExplainOptions) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(c.red('Invalid address'));
        process.exit(1);
    }

    const chain = options.chain || 'ethereum';

    // Check if QVAC is available
    process.stdout.write('Checking for QVAC... ');
    const available = await checkQVACAvailable();

    if (!available) {
        console.log(c.red('not running'));
        printQVACNotAvailable();
        process.exit(1);
    }

    console.log(c.green('✓ connected'));

    // First, get the wallet analysis
    console.log(c.gray(`\nFetching wallet data from ${chain}...`));

    const analyzer = new WalletAnalyzer(getApiKeys());
    const loading = ora('Analyzing wallet...').start();

    let result;
    try {
        result = await analyzer.analyze(address, chain as any, {});
        loading.succeed();
    } catch (e) {
        loading.fail();
        console.error(c.red('Failed to analyze wallet: ' + e));
        process.exit(1);
    }

    // Print basic info
    console.log(c.bold(`\n📊 Wallet: ${address.slice(0, 14)}...`));
    console.log(c.gray(`  Chain: ${chain}`));
    console.log(c.gray(`  Risk: ${result.riskLevel || 'unknown'} (${result.overallRiskScore || 0}/100)`));
    console.log(c.gray(`  Balance: ${result.wallet?.balanceInEth || 0} ETH`));
    console.log(c.gray(`  Txs: ${result.summary?.totalTransactions || 0}\n`));

    // Now get AI explanation
    console.log(c.bold('🤖 AI Analysis'));
    console.log('─'.repeat(25));

    const aiLoading = ora('Generating explanation...').start();

    const insights = await generateWalletInsights(
        address,
        chain,
        result.overallRiskScore || 0,
        result.riskLevel || 'unknown',
        {
            totalTransactions: result.summary?.totalTransactions,
            totalValueSentEth: result.summary?.totalValueSentEth,
            totalValueReceivedEth: result.summary?.totalValueReceivedEth,
            topFundingSources: result.summary?.topFundingSources?.map((f: any) => ({
                address: f.address,
                valueEth: f.valueEth,
            })),
            topFundingDestinations: result.summary?.topFundingDestinations?.map((d: any) => ({
                address: d.address,
                valueEth: d.valueEth,
            })),
        }
    );

    aiLoading.stop();

    if (insights) {
        console.log(c.cyan(insights));
    } else {
        console.log(c.yellow('Could not generate AI explanation'));
    }

    console.log('');
}