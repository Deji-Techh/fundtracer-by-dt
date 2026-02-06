// ============================================================
// FundTracer CLI - Compare Command (Updated with OptimizedSybilAnalyzer)
// ============================================================

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import {
    OptimizedSybilAnalyzer,
    ChainId,
    SybilAnalysisResult,
    SybilCluster,
    AnalysisProgress,
} from '@fundtracer/core';
import { 
    getApiKeys, 
    getSybilApiKeys, 
    formatAddress, 
    formatEth,
    exportToCSV,
    validateAddresses,
    readAddressesFromFile,
    formatDuration 
} from '../utils.js';
import fs from 'fs';

interface CompareOptions {
    chain: string;
    depth: string;
    output: 'table' | 'json' | 'csv';
    file?: string;
    export?: string;
    minCluster?: string;
    concurrency?: string;
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
    critical: chalk.hex('#dc2626'),
    high: chalk.hex('#ea580c'),
    medium: chalk.hex('#ca8a04'),
    low: chalk.hex('#16a34a'),
};

export async function compareCommand(addresses: string[], options: CompareOptions) {
    const chainId = options.chain as ChainId;
    const minClusterSize = parseInt(options.minCluster || '3', 10);
    const concurrency = parseInt(options.concurrency || '10', 10);

    // Collect addresses from arguments and/or file
    let allAddresses = [...addresses];
    
    if (options.file) {
        try {
            const fileAddresses = readAddressesFromFile(options.file);
            allAddresses.push(...fileAddresses);
            console.log(colors.muted(`Loaded ${fileAddresses.length} addresses from ${options.file}`));
        } catch (error) {
            console.error(colors.error(`Failed to read file: ${options.file}`));
            process.exit(1);
        }
    }

    // Validate addresses
    const { valid: validAddresses, invalid: invalidAddresses } = validateAddresses(allAddresses);

    if (invalidAddresses.length > 0) {
        console.log(colors.warning(`Ignored ${invalidAddresses.length} invalid addresses`));
    }

    if (validAddresses.length < 2) {
        console.error(colors.error('Please provide at least 2 valid addresses to compare'));
        console.log(colors.muted('Usage: fundtracer compare 0xAddr1 0xAddr2 0xAddr3'));
        console.log(colors.muted('   or: fundtracer compare --file addresses.txt'));
        process.exit(1);
    }

    // Get API keys
    const apiKeys = getSybilApiKeys();
    const standardKeys = getApiKeys();

    if (apiKeys.length === 0) {
        console.error(colors.error('No API keys configured for Sybil analysis'));
        console.log(colors.muted('Run: fundtracer config --set-key alchemy:YOUR_KEY'));
        process.exit(1);
    }

    console.log(colors.primary.bold('\nSybil Detection Analysis'));
    console.log(colors.border('═'.repeat(60)));
    console.log(`Wallets: ${colors.secondary(validAddresses.length.toString())}`);
    console.log(`API Keys: ${colors.secondary(apiKeys.length.toString())} (parallel processing)`);
    console.log(`Concurrency: ${colors.secondary(concurrency.toString())}x`);
    console.log(`Min Cluster Size: ${colors.secondary(minClusterSize.toString())}`);
    console.log();

    const spinner = ora({
        text: colors.secondary('Initializing optimized analyzer...'),
        color: 'gray',
    }).start();

    let lastProgress = 0;

    try {
        const analyzer = new OptimizedSybilAnalyzer(
            chainId,
            apiKeys,
            {
                moralisKey: standardKeys.moralis || '',
                covalentKey: standardKeys.dune || '',
                concurrency: concurrency,
                progressCallback: (progress: AnalysisProgress) => {
                    lastProgress = progress.percentage;
                    spinner.text = colors.secondary(`${progress.stage}: ${progress.percentage}% (${progress.processed}/${progress.total})`);
                }
            }
        );

        const startTime = Date.now();

        const result = await analyzer.analyzeContract(
            'sybil-analysis',
            validAddresses,
            {
                minClusterSize: minClusterSize,
                concurrency: concurrency,
            }
        );

        const duration = (Date.now() - startTime) / 1000;

        spinner.succeed(colors.success(`Analysis complete in ${formatDuration(duration)}`));
        console.log();

        // Output based on format
        switch (options.output) {
            case 'json':
                outputJson(result, options.export);
                break;
            case 'csv':
                outputCSV(result, options.export);
                break;
            default:
                outputTable(result, duration);
        }

    } catch (error) {
        spinner.fail(colors.error('Analysis failed'));
        console.error(colors.error(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}

function outputTable(result: SybilAnalysisResult, duration: number) {
    // Summary Header
    console.log(colors.primary.bold('Sybil Analysis Results'));
    console.log(colors.border('═'.repeat(60)));
    console.log();
    
    // Risk Assessment
    const highRiskClusters = result.clusters.filter(c => c.sybilScore >= 80);
    const mediumRiskClusters = result.clusters.filter(c => c.sybilScore >= 50 && c.sybilScore < 80);
    const totalWalletsInClusters = result.clusters.reduce((sum, c) => sum + c.wallets.length, 0);
    
    if (highRiskClusters.length > 0) {
        console.log(colors.critical.bold('HIGH RISK: Sybil Activity Detected'));
    } else if (mediumRiskClusters.length > 0) {
        console.log(colors.medium.bold('MEDIUM RISK: Suspicious Patterns Found'));
    } else {
        console.log(colors.low.bold('LOW RISK: No Sybil Patterns Detected'));
    }
    console.log();

    // Stats Table
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
        { [colors.secondary('Wallets Analyzed')]: result.totalInteractors.toString() },
        { [colors.secondary('Clusters Found')]: result.clusters.length.toString() },
        { [colors.secondary('Wallets in Clusters')]: `${totalWalletsInClusters} (${((totalWalletsInClusters/result.totalInteractors)*100).toFixed(1)}%)` },
        { [colors.secondary('High Risk Clusters')]: colors.error(highRiskClusters.length.toString()) },
        { [colors.secondary('Medium Risk Clusters')]: colors.warning(mediumRiskClusters.length.toString()) },
        { [colors.secondary('Analysis Time')]: formatDuration(duration) },
    );
    console.log(statsTable.toString());
    console.log();

    // Risk Distribution
    if (result.summary) {
        console.log(colors.primary.bold('Risk Distribution'));
        console.log(colors.border('─'.repeat(60)));
        console.log();
        const riskTable = new Table({
            head: [colors.secondary('Risk Level'), colors.secondary('Wallets'), colors.secondary('Percentage')],
            style: { head: ['gray'] },
            chars: {
                'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
                'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
                'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
                'right': '│', 'right-mid': '┤', 'middle': '│',
            },
        });

        const highRisk = result.summary.highRiskWallets || 0;
        const mediumRisk = result.summary.mediumRiskWallets || 0;
        const lowRisk = result.summary.lowRiskWallets || (result.totalInteractors - highRisk - mediumRisk);
        const total = result.totalInteractors;

        riskTable.push(
            [colors.error('High Risk'), highRisk.toString(), `${((highRisk/total)*100).toFixed(1)}%`],
            [colors.warning('Medium Risk'), mediumRisk.toString(), `${((mediumRisk/total)*100).toFixed(1)}%`],
            [colors.success('Low Risk'), lowRisk.toString(), `${((lowRisk/total)*100).toFixed(1)}%`],
        );
        console.log(riskTable.toString());
        console.log();
    }

    // Clusters Details
    if (result.clusters.length > 0) {
        console.log(colors.primary.bold(`Detected Clusters (${result.clusters.length})`));
        console.log(colors.border('─'.repeat(60)));
        console.log();
        
        // Sort by sybil score (highest first)
        const sortedClusters = [...result.clusters].sort((a, b) => b.sybilScore - a.sybilScore);

        sortedClusters.forEach((cluster, index) => {
            const riskColor = cluster.sybilScore >= 80 ? colors.error :
                             cluster.sybilScore >= 50 ? colors.warning : colors.success;
            
            console.log(colors.secondary.bold(`Cluster #${index + 1}`));
            console.log(`  Sybil Score: ${riskColor.bold(`${cluster.sybilScore}/100`)}`);
            console.log(`  Wallets: ${cluster.wallets.length}`);
            console.log(`  Funding Source: ${colors.muted(formatAddress(cluster.fundingSource))}`);
            
            if (cluster.flags && cluster.flags.length > 0) {
                console.log(`  Flags: ${cluster.flags.join(', ')}`);
            }
            
            // Show first 5 wallets
            const displayWallets = cluster.wallets.slice(0, 5);
            console.log(`  Addresses:`);
            displayWallets.forEach(wallet => {
                console.log(`    ${colors.muted('-')} ${formatAddress(wallet.address)}`);
            });
            
            if (cluster.wallets.length > 5) {
                console.log(`    ${colors.muted(`... and ${cluster.wallets.length - 5} more`)}`);
            }
            
            console.log();
        });
    }

    // Flagged Clusters Summary
    if (result.flaggedClusters && result.flaggedClusters.length > 0) {
        console.log(colors.warning.bold(`Flagged for Review (${result.flaggedClusters.length})`));
        console.log(colors.border('─'.repeat(60)));
        console.log();
        
        const flaggedTable = new Table({
            head: [colors.secondary('Cluster'), colors.secondary('Score'), colors.secondary('Wallets'), colors.secondary('Source')],
            style: { head: ['yellow'] },
            chars: {
                'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
                'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
                'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
                'right': '│', 'right-mid': '┤', 'middle': '│',
            },
        });

        result.flaggedClusters.forEach((cluster, idx) => {
            const scoreColor = cluster.sybilScore >= 80 ? colors.error :
                              cluster.sybilScore >= 50 ? colors.warning : colors.success;
            
            flaggedTable.push([
                `#${idx + 1}`,
                scoreColor(cluster.sybilScore.toString()),
                cluster.wallets.length.toString(),
                formatAddress(cluster.fundingSource),
            ]);
        });

        console.log(flaggedTable.toString());
        console.log();
    }
}

function outputJson(result: SybilAnalysisResult, exportPath?: string) {
    const jsonStr = JSON.stringify(result, null, 2);

    if (exportPath) {
        fs.writeFileSync(exportPath, jsonStr);
        console.log(colors.success(`Results exported to ${exportPath}`));
    } else {
        console.log(jsonStr);
    }
}

function outputCSV(result: SybilAnalysisResult, exportPath?: string) {
    const filename = exportPath || `sybil-analysis-${Date.now()}.csv`;
    
    // Flatten clusters into CSV rows
    const rows: any[] = [];
    
    result.clusters.forEach((cluster, clusterIdx) => {
        cluster.wallets.forEach(wallet => {
            rows.push({
                cluster_id: clusterIdx + 1,
                sybil_score: cluster.sybilScore,
                risk_level: cluster.sybilScore >= 80 ? 'HIGH' : cluster.sybilScore >= 50 ? 'MEDIUM' : 'LOW',
                wallet_address: wallet.address,
                funding_source: cluster.fundingSource,
                funding_amount: wallet.fundingAmount,
                funding_tx: wallet.fundingTxHash || '',
                flags: cluster.flags?.join('; ') || '',
                analyzed_at: result.analyzedAt,
            });
        });
    });

    if (rows.length === 0) {
        console.log(colors.warning('No clusters to export'));
        return;
    }

    exportToCSV(rows, filename);
    console.log(colors.success(`Results exported to ${filename}`));
    console.log(colors.muted(`  ${rows.length} rows exported`));
}
