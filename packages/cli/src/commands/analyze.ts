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
    getLegacyChainConfig,
} from 'fundtracer-core';
import { getApiKeys, formatAddress, formatEth, exportToCSV } from '../utils.js';
import fs from 'fs';

interface AnalyzeOptions {
    chain: string;
    depth: string;
    output: 'table' | 'json' | 'tree' | 'csv';
    minValue?: string;
    export?: string;
}

// Professional color scheme
const colors = {
    primary: chalk.hex('#888888'),
    secondary: chalk.hex('#666666'),
    accent: chalk.hex('#60a5fa'),
    success: chalk.hex('#4ade80'),
    warning: chalk.hex('#fbbf24'),
    error: chalk.hex('#ef4444'),
    muted: chalk.hex('#555555'),
    border: chalk.hex('#333333'),
};

export async function analyzeCommand(address: string, options: AnalyzeOptions) {
    const chainId = options.chain as ChainId;
    const depth = parseInt(options.depth, 10);
    const minValue = options.minValue ? parseFloat(options.minValue) : undefined;

    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(colors.error('Error: Invalid wallet address format'));
        process.exit(1);
    }

    // Validate chain
    try {
        getLegacyChainConfig(chainId as any);
    } catch {
        console.error(colors.error(`Error: Unsupported chain: ${chainId}`));
        console.log(colors.muted('Supported chains: ethereum, linea, arbitrum, base'));
        process.exit(1);
    }

    const spinner = ora({
        text: colors.secondary('Initializing analyzer...'),
        color: 'gray',
    }).start();

    try {
        const apiKeys = getApiKeys();
        const analyzer = new WalletAnalyzer(apiKeys, (progress) => {
            spinner.text = colors.secondary(`${progress.stage}: ${progress.message}`);
        });

        const result = await analyzer.analyze(address, chainId, {
            treeConfig: {
                maxDepth: depth,
                minValueEth: minValue,
            },
        });

        spinner.succeed(colors.success('Analysis complete'));
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
            console.log(colors.success(`\nResults exported to ${options.export}`));
        }

    } catch (error) {
        spinner.fail(colors.error('Analysis failed'));
        console.error(colors.error(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}

function outputTable(result: AnalysisResult) {
    // Wallet Info
    console.log(colors.primary.bold('Wallet Information'));
    console.log(colors.border('─'.repeat(60)));
    const infoTable = new Table({
        style: { head: ['gray'] },
        chars: {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
            'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
            'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
            'right': '', 'right-mid': '', 'middle': ' ',
        },
    });

    infoTable.push(
        { [colors.secondary('Address')]: result.wallet.address },
        { [colors.secondary('Chain')]: result.wallet.chain.toUpperCase() },
        { [colors.secondary('Balance')]: `${formatEth(result.wallet.balanceInEth)} ETH` },
        { [colors.secondary('Total Transactions')]: result.summary.totalTransactions.toString() },
        { [colors.secondary('Is Contract')]: result.wallet.isContract ? 'Yes' : 'No' },
    );
    console.log(infoTable.toString());
    console.log();

    // Risk Score
    const riskColor =
        result.riskLevel === 'critical' ? colors.error.bold :
            result.riskLevel === 'high' ? colors.error :
                result.riskLevel === 'medium' ? colors.warning :
                    colors.success;

    console.log(colors.primary.bold('Risk Assessment'));
    console.log(colors.border('─'.repeat(60)));
    console.log(`Risk Score: ${riskColor(`${result.overallRiskScore}/100`)} (${riskColor(result.riskLevel.toUpperCase())})`);
    console.log();

    // Suspicious indicators
    if (result.suspiciousIndicators.length > 0) {
        console.log(colors.warning.bold('Suspicious Activity Detected:'));
        const suspTable = new Table({
            head: [colors.secondary('Type'), colors.secondary('Severity'), colors.secondary('Description')],
            style: { head: ['yellow'] },
            chars: {
                'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
                'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
                'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
                'right': '│', 'right-mid': '┤', 'middle': '│',
            },
        });

        result.suspiciousIndicators.forEach(ind => {
            const sevColor =
                ind.severity === 'critical' || ind.severity === 'high' ? colors.error :
                    ind.severity === 'medium' ? colors.warning : colors.muted;

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
    console.log(colors.primary.bold('Transaction Summary'));
    console.log(colors.border('─'.repeat(60)));
    const statsTable = new Table({
        style: { head: ['gray'] },
        chars: {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
            'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
            'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
            'right': '', 'right-mid': '', 'middle': ' ',
        },
    });

    statsTable.push(
        { [colors.secondary('Successful')]: colors.success(result.summary.successfulTxs.toString()) },
        { [colors.secondary('Failed')]: colors.error(result.summary.failedTxs.toString()) },
        { [colors.secondary('Total Received')]: colors.success(`+${formatEth(result.summary.totalValueReceivedEth)} ETH`) },
        { [colors.secondary('Total Sent')]: colors.error(`-${formatEth(result.summary.totalValueSentEth)} ETH`) },
        { [colors.secondary('Unique Addresses')]: result.summary.uniqueInteractedAddresses.toString() },
        { [colors.secondary('Activity Period')]: `${result.summary.activityPeriodDays} days` },
    );
    console.log(statsTable.toString());
    console.log();

    // Top funding sources
    if (result.summary.topFundingSources.length > 0) {
        console.log(colors.primary.bold('Top Funding Sources'));
        console.log(colors.border('─'.repeat(60)));
        const sourcesTable = new Table({
            head: [colors.secondary('Address'), colors.secondary('Value')],
            style: { head: ['gray'] },
            chars: {
                'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
                'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
                'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
                'right': '│', 'right-mid': '┤', 'middle': '│',
            },
        });

        result.summary.topFundingSources.forEach(source => {
            sourcesTable.push([
                formatAddress(source.address),
                colors.success(`+${formatEth(source.valueEth)} ETH`),
            ]);
        });
        console.log(sourcesTable.toString());
        console.log();
    }

    // Top destinations
    if (result.summary.topFundingDestinations.length > 0) {
        console.log(colors.primary.bold('Top Destinations'));
        console.log(colors.border('─'.repeat(60)));
        const destsTable = new Table({
            head: [colors.secondary('Address'), colors.secondary('Value')],
            style: { head: ['gray'] },
            chars: {
                'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
                'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
                'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
                'right': '│', 'right-mid': '┤', 'middle': '│',
            },
        });

        result.summary.topFundingDestinations.forEach(dest => {
            destsTable.push([
                formatAddress(dest.address),
                colors.error(`-${formatEth(dest.valueEth)} ETH`),
            ]);
        });
        console.log(destsTable.toString());
        console.log();
    }

    // Projects
    if (result.projectsInteracted.length > 0) {
        console.log(colors.primary.bold('Projects Interacted'));
        console.log(colors.border('─'.repeat(60)));
        const projectsTable = new Table({
            head: [colors.secondary('Project'), colors.secondary('Category'), colors.secondary('Interactions')],
            style: { head: ['gray'] },
            chars: {
                'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
                'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
                'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
                'right': '│', 'right-mid': '┤', 'middle': '│',
            },
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
    console.log(colors.primary.bold('\nFunding Sources Tree'));
    console.log(colors.border('─'.repeat(60)));
    printTreeNode(result.fundingSources as any, '', true);

    console.log(colors.primary.bold('\nFunding Destinations Tree'));
    console.log(colors.border('─'.repeat(60)));
    printTreeNode(result.fundingDestinations as any, '', true);
}

function printTreeNode(node: FundingNode | any, prefix: string, isLast: boolean) {
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';

    const riskColor =
        (node as any).suspiciousScore > 50 ? colors.error :
            (node as any).suspiciousScore > 25 ? colors.warning :
                colors.success;

    const valueStr = (node as any).totalValueInEth > 0
        ? colors.muted(` (${formatEth((node as any).totalValueInEth)} ETH)`)
        : '';

    console.log(
        prefix +
        (prefix ? connector : '') +
        riskColor(formatAddress(node.address)) +
        valueStr
    );

    (node as any).children?.forEach((child: any, index: number) => {
        const newPrefix = prefix + (prefix ? extension : '');
        printTreeNode(child, newPrefix, index === (node as any).children?.length - 1);
    });
}

function outputJson(result: AnalysisResult, exportPath?: string) {
    const jsonStr = JSON.stringify(result, null, 2);

    if (exportPath) {
        fs.writeFileSync(exportPath, jsonStr);
        console.log(colors.success(`Results exported to ${exportPath}`));
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
        console.log(colors.warning('No transactions to export'));
        return;
    }

    exportToCSV(rows, filename);
    console.log(colors.success(`Results exported to ${filename}`));
    console.log(colors.muted(`  ${rows.length} transactions exported`));
}
