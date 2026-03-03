// FundTracer CLI - Analyze Command

import chalk from 'chalk';
import Table from 'cli-table3';
import {
    WalletAnalyzer,
    ChainId,
    AnalysisResult,
} from 'fundtracer-core';
import { getApiKeys, formatEth } from '../utils.js';
import fs from 'fs';

interface AnalyzeOptions {
    chain: string;
    depth: string;
    output: 'table' | 'json' | 'tree' | 'csv';
    minValue?: string;
    export?: string;
}

const c = {
    bold: chalk.bold,
    green: chalk.green,
    red: chalk.red,
    yellow: chalk.yellow,
    gray: chalk.gray,
};

export async function analyzeCommand(address: string, options: AnalyzeOptions) {
    const chainId = options.chain as ChainId;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(c.red('Invalid address'));
        process.exit(1);
    }

    try {
        const apiKeys = getApiKeys();
        const analyzer = new WalletAnalyzer(apiKeys);
        const result = await analyzer.analyze(address, chainId, {});

        switch (options.output) {
            case 'json':
                outputJson(result, options.export);
                break;
            case 'csv':
                outputCSV(result, options.export);
                break;
            case 'tree':
                outputTree(result);
                break;
            default:
                outputTable(result);
        }

    } catch (error) {
        console.error(c.red('Error: ' + (error instanceof Error ? error.message : 'Unknown')));
        process.exit(1);
    }
}

function outputTable(result: AnalysisResult) {
    const riskColor = result.riskLevel === 'low' ? c.green : 
                      result.riskLevel === 'medium' ? c.yellow : c.red;
    const riskEmoji = result.riskLevel === 'low' ? '✓' : 
                      result.riskLevel === 'medium' ? '!' : '✗';

    console.log(c.bold('\n📊 FundTracer Analysis\n'));

    const table = new Table({
        style: { compact: true },
        colWidths: [20, 45],
    });

    table.push(
        ['Address', result.wallet?.address || 'N/A'],
        ['Chain', (result.wallet?.chain || 'N/A').toUpperCase()],
        ['Balance', result.wallet?.balanceInEth ? formatEth(result.wallet.balanceInEth) + ' ETH' : 'N/A'],
        ['Transactions', result.summary?.totalTransactions?.toLocaleString() || '0'],
    );

    console.log(table.toString());

    console.log('\n' + c.bold('Risk'));
    console.log('─'.repeat(25));
    console.log(`  ${riskEmoji} ${riskColor(result.riskLevel?.toUpperCase() || 'UNKNOWN')}  Score: ${result.overallRiskScore || 0}/100`);

    if (result.summary) {
        const sent = result.summary.totalValueSentEth || 0;
        const received = result.summary.totalValueReceivedEth || 0;
        console.log(`  Sent: ${formatEth(sent)} ETH`);
        console.log(`  Received: ${formatEth(received)} ETH`);
    }

    if (result.summary?.topFundingSources?.length > 0) {
        console.log('\n' + c.bold('Top Funders'));
        console.log('─'.repeat(25));
        result.summary.topFundingSources.slice(0, 3).forEach((f: any) => {
            console.log(`  + ${formatEth(f.valueEth)} ETH - ${f.address?.slice(0, 10)}...`);
        });
    }

    if (result.summary?.topFundingDestinations?.length > 0) {
        console.log('\n' + c.bold('Top Destinations'));
        console.log('─'.repeat(25));
        result.summary.topFundingDestinations.slice(0, 3).forEach((d: any) => {
            console.log(`  - ${formatEth(d.valueEth)} ETH - ${d.address?.slice(0, 10)}...`);
        });
    }

    console.log('');
}

function outputTree(result: AnalysisResult) {
    console.log(c.bold('\n📊 FundTracer Tree\n'));

    console.log(c.bold('Funding Sources'));
    console.log('─'.repeat(25));
    const sources = result.fundingSources as any;
    if (sources && sources.length > 0) {
        sources.slice(0, 10).forEach((node: any, i: number) => {
            const prefix = i === sources.length - 1 ? '└─ ' : '├─ ';
            console.log(`  ${prefix}${node.address?.slice(0, 14)}... ${node.totalValueInEth ? c.green(formatEth(node.totalValueInEth) + ' ETH') : ''}`);
        });
    } else {
        console.log(c.gray('  No funding sources'));
    }

    console.log('');

    console.log(c.bold('Funding Destinations'));
    console.log('─'.repeat(25));
    const destinations = result.fundingDestinations as any;
    if (destinations && destinations.length > 0) {
        destinations.slice(0, 10).forEach((node: any, i: number) => {
            const prefix = i === destinations.length - 1 ? '└─ ' : '├─ ';
            console.log(`  ${prefix}${node.address?.slice(0, 14)}... ${node.totalValueInEth ? c.red(formatEth(node.totalValueInEth) + ' ETH') : ''}`);
        });
    } else {
        console.log(c.gray('  No funding destinations'));
    }

    console.log('');
}

function outputJson(result: AnalysisResult, exportPath?: string) {
    const data = {
        address: result.wallet?.address,
        chain: result.wallet?.chain,
        balance: result.wallet?.balanceInEth,
        riskLevel: result.riskLevel,
        riskScore: result.overallRiskScore,
        totalTransactions: result.summary?.totalTransactions,
        topFunders: result.summary?.topFundingSources?.slice(0, 10),
        topDestinations: result.summary?.topFundingDestinations?.slice(0, 10),
    };

    const jsonStr = JSON.stringify(data, null, 2);

    if (exportPath) {
        fs.writeFileSync(exportPath, jsonStr);
        console.log(c.green('✓ Saved to ' + exportPath));
    } else {
        console.log(jsonStr);
    }
}

function outputCSV(result: AnalysisResult, exportPath?: string) {
    const filename = exportPath || 'analysis-' + (result.wallet?.address?.slice(2, 10) || 'wallet') + '-' + Date.now() + '.csv';

    if (!result.transactions || result.transactions.length === 0) {
        console.log(c.yellow('No transactions to export'));
        return;
    }

    const headers = ['Hash', 'Timestamp', 'From', 'To', 'Value (ETH)', 'Direction'];
    const rows = result.transactions.map((tx: any) => [
        tx.hash || '',
        tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : '',
        tx.from || '',
        tx.to || '',
        tx.valueInEth?.toString() || '0',
        tx.isIncoming ? 'in' : 'out',
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => '"' + cell + '"').join(',') + '\n';
    });

    fs.writeFileSync(filename, csv);
    console.log(c.green('✓ Saved ' + result.transactions.length + ' transactions to ' + filename));
}
