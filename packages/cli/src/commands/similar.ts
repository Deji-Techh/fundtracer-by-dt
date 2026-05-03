// ============================================================
// FundTracer CLI - Similar Command
// Find wallets similar to a given address using QVAC
// ============================================================

import chalk from 'chalk';
import ora from 'ora';
import { WalletAnalyzer } from 'fundtracer-core';
import { ChainId } from 'fundtracer-core';
import { getApiKeys } from '../utils.js';
import { checkQVACAvailable, printQVACNotAvailable, sendCompletion, QVACMessage } from '../ai.js';

const c = {
    bold: chalk.bold,
    green: chalk.green,
    red: chalk.red,
    cyan: chalk.cyan,
    gray: chalk.gray,
    yellow: chalk.yellow,
};

interface SimilarOptions {
    chain?: string;
    top?: number;
}

function cleanText(text: string): string {
    let result = text;
    const openTag = '<think>';
    const closeTag = '</think>';
    let start = result.indexOf(openTag);
    while (start !== -1) {
        const end = result.indexOf(closeTag, start);
        if (end === -1) break;
        result = result.slice(0, start) + result.slice(end + closeTag.length);
        start = result.indexOf(openTag, start);
    }
    return result.trim();
}

export async function similarCommand(address: string, options: SimilarOptions) {
    const chain = options.chain || 'ethereum';
    const topK = options.top || 5;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(c.red('Invalid Ethereum address'));
        process.exit(1);
    }
    
    // Check QVAC availability
    process.stdout.write('Checking QVAC... ');
    const qvacAvail = await checkQVACAvailable();
    if (!qvacAvail) {
        console.log(c.red('not running'));
        printQVACNotAvailable();
        process.exit(1);
    }
    console.log(c.green('✓'));
    
    // Get target wallet data
    console.log(c.gray('\nFetching wallet data...'));
    const analyzer = new WalletAnalyzer(getApiKeys());
    const loading = ora('Analyzing wallet...').start();
    
    let result;
    try {
        result = await analyzer.analyze(address, chain as ChainId, {});
        loading.succeed();
    } catch (e) {
        loading.fail();
        console.error(c.red('Failed to fetch wallet: ' + e));
        process.exit(1);
    }
    
    // Display target wallet info
    console.log(c.bold('\n📊 Target Wallet'));
    console.log(c.cyan('  Address: ') + address.slice(0, 14) + '...');
    console.log(c.gray('  Chain: ') + chain);
    console.log(c.gray('  Balance: ') + (result.wallet?.balanceInEth || 0).toFixed(4) + ' ETH');
    console.log(c.gray('  Txs: ') + (result.summary?.totalTransactions || 0));
    console.log(c.gray('  Risk: ') + (result.riskLevel || 'unknown') + ' (' + (result.overallRiskScore || 0) + '/100)');
    
    // Build profile summary
    const txCount = result.summary?.totalTransactions || 0;
    const sentEth = result.summary?.totalValueSentEth || 0;
    const recvEth = result.summary?.totalValueReceivedEth || 0;
    const contracts = result.summary?.uniqueContractsInteractedWith || 0;
    
    const profile = [
        txCount > 0 ? txCount + ' transactions' : '',
        sentEth > 0 ? 'sent ' + sentEth.toFixed(2) + ' ETH' : '',
        recvEth > 0 ? 'received ' + recvEth.toFixed(2) + ' ETH' : '',
        contracts > 0 ? 'interacted with ' + contracts + ' contracts' : '',
        result.riskLevel ? 'risk: ' + result.riskLevel : '',
    ].filter(Boolean).join(', ');
    
    // Use QVAC for similarity analysis
    const aiLoading = ora('Finding similar wallet types...').start();
    
    const systemPrompt = 'You are a blockchain forensics expert. Given a wallet profile, identify 5 types of wallets that would show SIMILAR on-chain behavior. Consider transaction volume, value flow, contract interactions, and risk profile. Respond with a simple list, one per line.';
    
    const userPrompt = 'Find wallets similar to this target:\nAddress: ' + address + '\nChain: ' + chain + '\nProfile: ' + profile + '\n\nWhat types of wallets show similar behavior? List top 5 with brief reason.';
    
    const messages: QVACMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];
    
    const response = await sendCompletion(messages, { max_tokens: 300 });
    
    aiLoading.stop();
    
    if (response && response.choices && response.choices[0]?.message?.content) {
        const content = response.choices[0].message.content;
        const cleaned = cleanText(content);
        
        console.log(c.bold('\n🔍 Similar Wallet Types'));
        console.log(c.gray('-'.repeat(40)));
        console.log(c.cyan(cleaned));
    } else {
        console.log(c.yellow('\n⚠️  Could not generate similarity analysis'));
    }
    
    console.log(c.gray('\n💡 Note: AI pattern matching to find similar behavior types\n'));
}