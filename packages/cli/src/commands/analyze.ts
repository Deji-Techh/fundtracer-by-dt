// ============================================================
// FundTracer CLI - Analyze Command
// ============================================================

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import {
    WalletAnalyzer,
    ChainId,
    AnalysisResult,
    FundingNode,
    getChainConfig,
} from '@fundtracer/core';
import { getApiKeys, formatAddress, formatEth, formatDate, exportToCSV } from '../utils.js';
import fs from 'fs';

interface AnalyzeOptions {
    chain: string;
    depth: string;
    output: 'table' | 'json' | 'tree' | 'csv';
    minValue?: string;
    export?: string;
}

export async function analyzeCommand(address: string, options: AnalyzeOptions) {
    const chainId = options.chain as ChainId;
    const depth = parseInt(options.depth, 10);
    const minValue = options.minValue ? parseFloat(options.minValue) : undefined;

    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(chalk.red('✗ Invalid wallet address format'));
        process.exit(1);
    }

    // Validate chain
    try {
        getChainConfig(chainId);
    } catch {
        console.error(chalk.red(`✗ Unsupported chain: ${chainId}`));
        console.log(chalk.dim('Supported chains: ethereum, linea, arbitrum, base'));
        process.exit(1);
    }

    const spinner = ora({
        text: 'Initializing analyzer...',
        color: 'cyan',
    }).start();

    try {
        const apiKeys = getApiKeys();
        const analyzer = new WalletAnalyzer(apiKeys, (progress) => {
            spinner.text = `${progress.stage}: ${progress.message}`;
        });

        const result = await analyzer.analyze(address, chainId, {
            treeConfig: {
                maxDepth: depth,
                minValueEth: minValue,
            },
        });

        spinner.succeed('Analysis complete!');
        console.log();

        // Output based on format
        switch (options.output) {
            case 'json':
                outputJson(result, options.export);
                break;
            case 'tree':
                outputTree(result);
                break;
            case 'csv':
                outputCSV(result, options.export);
                break;
            default:
                outputTable(result);
        }

        // Export if requested and not already handled
        if (options.export && options.output !== 'json' && options.output !== 'csv') {
            fs.writeFileSync(options.export, JSON.stringify(result, null, 2));
            console.log(chalk.green(`\n✓ Results exported to ${options.export}`));
        }

    } catch (error) {
        spinner.fail('Analysis failed');
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}

function outputTable(result: AnalysisResult) {
    // Wallet Info
    console.log(chalk.bold.cyan('═══ Wallet Information ═══'));
    const infoTable = new Table({
        style: { head: ['cyan'] },
    });

    infoTable.push(
        { 'Address': result.wallet.address },
        { 'Chain': result.wallet.chain.toUpperCase() },
        { 'Balance': `${formatEth(result.wallet.balanceInEth)} ETH` },
        { 'Total Transactions': result.summary.totalTransactions.toString() },
        { 'Is Contract': result.wallet.isContract ? 'Yes' : 'No' },
    );
    console.log(infoTable.toString());
    console.log();

    // Risk Score
    const riskColor =
        result.riskLevel === 'critical' ? chalk.bgRed.white :
            result.riskLevel === 'high' ? chalk.red :
                result.riskLevel === 'medium' ? chalk.yellow :
                    chalk.green;

    console.log(chalk.bold.cyan('═══ Risk Assessment ═══'));
    console.log(`Risk Score: ${riskColor.bold(` ${result.overallRiskScore}/100 `)} (${riskColor(result.riskLevel.toUpperCase())})`);
    console.log();

    // Suspicious indicators
    if (result.suspiciousIndicators.length > 0) {
        console.log(chalk.bold.yellow('⚠ Suspicious Activity Detected:'));
        const suspTable = new Table({
            head: ['Type', 'Severity', 'Description'],
            style: { head: ['yellow'] },
        });

        result.suspiciousIndicators.forEach(ind => {
            const sevColor =
                ind.severity === 'critical' || ind.severity === 'high' ? chalk.red :
                    ind.severity === 'medium' ? chalk.yellow : chalk.dim;

            suspTable.push([
                ind.type.replace(/_/g, ' '),
                sevColor(ind.severity),
                ind.description.slice(0, 50),
            ]);
        });
        console.log(suspTable.toString());
        console.log();
    }

    // Summary stats
    console.log(chalk.bold.cyan('═══ Transaction Summary ═══'));
    const statsTable = new Table({
        style: { head: ['cyan'] },
    });

    statsTable.push(
        { 'Successful': chalk.green(result.summary.successfulTxs.toString()) },
        { 'Failed': chalk.red(result.summary.failedTxs.toString()) },
        { 'Total Received': chalk.green(`+${formatEth(result.summary.totalValueReceivedEth)} ETH`) },
        { 'Total Sent': chalk.red(`-${formatEth(result.summary.totalValueSentEth)} ETH`) },
        { 'Unique Addresses': result.summary.uniqueInteractedAddresses.toString() },
        { 'Activity Period': `${result.summary.activityPeriodDays} days` },
    );
    console.log(statsTable.toString());
    console.log();

    // Top funding sources
    if (result.summary.topFundingSources.length > 0) {
        console.log(chalk.bold.cyan('═══ Top Funding Sources ═══'));
        const sourcesTable = new Table({
            head: ['Address', 'Value'],
            style: { head: ['cyan'] },
        });

        result.summary.topFundingSources.forEach(source => {
            sourcesTable.push([
                formatAddress(source.address),
                chalk.green(`+${formatEth(source.valueEth)} ETH`),
            ]);
        });
        console.log(sourcesTable.toString());
        console.log();
    }

    // Top destinations
    if (result.summary.topFundingDestinations.length > 0) {
        console.log(chalk.bold.cyan('═══ Top Destinations ═══'));
        const destsTable = new Table({
            head: ['Address', 'Value'],
            style: { head: ['cyan'] },
        });

        result.summary.topFundingDestinations.forEach(dest => {
            destsTable.push([
                formatAddress(dest.address),
                chalk.red(`-${formatEth(dest.valueEth)} ETH`),
            ]);
        });
        console.log(destsTable.toString());
        console.log();
    }

    // Projects
    if (result.projectsInteracted.length > 0) {
        console.log(chalk.bold.cyan('═══ Projects Interacted ═══'));
        const projectsTable = new Table({
            head: ['Project', 'Category', 'Interactions'],
            style: { head: ['cyan'] },
        });

        result.projectsInteracted.slice(0, 5).forEach(proj => {
            projectsTable.push([
                proj.projectName || formatAddress(proj.contractAddress),
                proj.category,
                proj.interactionCount.toString(),
            ]);
        });
        console.log(projectsTable.toString());
    }
}

function outputTree(result: AnalysisResult) {
    console.log(chalk.bold.cyan('\n═══ Funding Sources Tree ═══\n'));
    printTreeNode(result.fundingSources, '', true);

    console.log(chalk.bold.cyan('\n═══ Funding Destinations Tree ═══\n'));
    printTreeNode(result.fundingDestinations, '', true);
}

function printTreeNode(node: FundingNode, prefix: string, isLast: boolean) {
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';

    const riskColor =
        node.suspiciousScore > 50 ? chalk.red :
            node.suspiciousScore > 25 ? chalk.yellow :
                chalk.green;

    const valueStr = node.totalValueInEth > 0
        ? chalk.dim(` (${formatEth(node.totalValueInEth)} ETH)`)
        : '';

    console.log(
        prefix +
        (prefix ? connector : '') +
        riskColor(formatAddress(node.address)) +
        valueStr
    );

    node.children.forEach((child, index) => {
        const newPrefix = prefix + (prefix ? extension : '');
        printTreeNode(child, newPrefix, index === node.children.length - 1);
    });
}

function outputJson(result: AnalysisResult, exportPath?: string) {
    const jsonStr = JSON.stringify(result, null, 2);

    if (exportPath) {
        fs.writeFileSync(exportPath, jsonStr);
        console.log(chalk.green(`✓ Results exported to ${exportPath}`));
    } else {
        console.log(jsonStr);
    }
}

function outputCSV(result: AnalysisResult, exportPath?: string) {
    const filename = exportPath || `analysis-${result.wallet.address.slice(0, 8)}-${Date.now()}.csv`;
    
    // Create rows for transactions
    const rows = result.transactions.map(tx => ({
        hash: tx.hash,
        timestamp: new Date(tx.timestamp * 1000).toISOString(),
        from: tx.from,
        to: tx.to || '',
        value_eth: tx.valueInEth,
        gas_cost_eth: tx.gasCostInEth,
        status: tx.status,
        category: tx.category,
        method: tx.methodName || tx.methodId || '',
        direction: tx.isIncoming ? 'incoming' : 'outgoing',
    }));

    if (rows.length === 0) {
        console.log(chalk.yellow('⚠ No transactions to export'));
        return;
    }

    exportToCSV(rows, filename);
    console.log(chalk.green(`✓ Results exported to ${filename}`));
    console.log(chalk.dim(`  ${rows.length} transactions exported`));
}
