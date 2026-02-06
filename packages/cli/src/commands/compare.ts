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
            console.log(chalk.dim(`📄 Loaded ${fileAddresses.length} addresses from ${options.file}`));
        } catch (error) {
            console.error(chalk.red(`✗ Failed to read file: ${options.file}`));
            process.exit(1);
        }
    }

    // Validate addresses
    const { valid: validAddresses, invalid: invalidAddresses } = validateAddresses(allAddresses);

    if (invalidAddresses.length > 0) {
        console.log(chalk.yellow(`⚠ Ignored ${invalidAddresses.length} invalid addresses`));
    }

    if (validAddresses.length < 2) {
        console.error(chalk.red('✗ Please provide at least 2 valid addresses to compare'));
        console.log(chalk.dim('Usage: fundtracer compare 0xAddr1 0xAddr2 0xAddr3'));
        console.log(chalk.dim('   or: fundtracer compare --file addresses.txt'));
        process.exit(1);
    }

    // Get API keys
    const apiKeys = getSybilApiKeys();
    const standardKeys = getApiKeys();

    if (apiKeys.length === 0) {
        console.error(chalk.red('✗ No API keys configured for Sybil analysis'));
        console.log(chalk.dim('Run: fundtracer config --set-key alchemy:YOUR_KEY'));
        process.exit(1);
    }

    console.log(chalk.cyan(`\n🔍 Sybil Detection Analysis`));
    console.log(chalk.dim(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(`Wallets: ${chalk.bold(validAddresses.length)}`);
    console.log(`API Keys: ${chalk.bold(apiKeys.length)} (for parallel processing)`);
    console.log(`Concurrency: ${chalk.bold(concurrency)}x`);
    console.log(`Min Cluster Size: ${chalk.bold(minClusterSize)}`);
    console.log();

    const spinner = ora({
        text: 'Initializing optimized analyzer...',
        color: 'cyan',
    }).start();

    let lastProgress = 0;

    try {
        const analyzer = new OptimizedSybilAnalyzer(
            chainId,
            apiKeys,
            {
                moralisKey: standardKeys.moralis || '',
                covalentKey: standardKeys.dune || '', // Using dune key as covalent fallback
                concurrency: concurrency,
                progressCallback: (progress: AnalysisProgress) => {
                    lastProgress = progress.percentage;
                    spinner.text = `${getProgressEmoji(progress.stage)} ${progress.stage}: ${progress.percentage}% (${progress.processed}/${progress.total})`;
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

        spinner.succeed(`Analysis complete in ${formatDuration(duration)}!`);
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
        spinner.fail('Analysis failed');
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}

function getProgressEmoji(stage: string): string {
    switch (stage) {
        case 'funding': return '💰';
        case 'clustering': return '🔍';
        case 'complete': return '✅';
        default: return '⏳';
    }
}

function outputTable(result: SybilAnalysisResult, duration: number) {
    // Summary Header
    console.log(chalk.bold.cyan('═══ Sybil Analysis Results ═══\n'));
    
    // Risk Assessment
    const highRiskClusters = result.clusters.filter(c => c.sybilScore >= 80);
    const mediumRiskClusters = result.clusters.filter(c => c.sybilScore >= 50 && c.sybilScore < 80);
    const totalWalletsInClusters = result.clusters.reduce((sum, c) => sum + c.wallets.length, 0);
    
    if (highRiskClusters.length > 0) {
        console.log(chalk.bgRed.white.bold(' ⚠ HIGH RISK: Sybil Activity Detected '));
    } else if (mediumRiskClusters.length > 0) {
        console.log(chalk.bgYellow.black.bold(' ⚠ MEDIUM RISK: Suspicious Patterns Found '));
    } else {
        console.log(chalk.bgGreen.black.bold(' ✅ LOW RISK: No Sybil Patterns Detected '));
    }
    console.log();

    // Stats Table
    const statsTable = new Table({
        style: { head: ['cyan'] },
    });

    statsTable.push(
        { 'Wallets Analyzed': result.totalInteractors.toString() },
        { 'Clusters Found': result.clusters.length.toString() },
        { 'Wallets in Clusters': `${totalWalletsInClusters} (${((totalWalletsInClusters/result.totalInteractors)*100).toFixed(1)}%)` },
        { 'High Risk Clusters': chalk.red(highRiskClusters.length.toString()) },
        { 'Medium Risk Clusters': chalk.yellow(mediumRiskClusters.length.toString()) },
        { 'Analysis Time': formatDuration(duration) },
    );
    console.log(statsTable.toString());
    console.log();

    // Risk Distribution
    if (result.summary) {
        console.log(chalk.bold.cyan('═══ Risk Distribution ═══\n'));
        const riskTable = new Table({
            head: ['Risk Level', 'Wallets', 'Percentage'],
            style: { head: ['cyan'] },
        });

        const highRisk = result.summary.highRiskWallets || 0;
        const mediumRisk = result.summary.mediumRiskWallets || 0;
        const lowRisk = result.summary.lowRiskWallets || (result.totalInteractors - highRisk - mediumRisk);
        const total = result.totalInteractors;

        riskTable.push(
            [chalk.red('🔴 High Risk'), highRisk.toString(), `${((highRisk/total)*100).toFixed(1)}%`],
            [chalk.yellow('🟡 Medium Risk'), mediumRisk.toString(), `${((mediumRisk/total)*100).toFixed(1)}%`],
            [chalk.green('🟢 Low Risk'), lowRisk.toString(), `${((lowRisk/total)*100).toFixed(1)}%`],
        );
        console.log(riskTable.toString());
        console.log();
    }

    // Clusters Details
    if (result.clusters.length > 0) {
        console.log(chalk.bold.cyan(`═══ Detected Clusters (${result.clusters.length}) ═══\n`));
        
        // Sort by sybil score (highest first)
        const sortedClusters = [...result.clusters].sort((a, b) => b.sybilScore - a.sybilScore);

        sortedClusters.forEach((cluster, index) => {
            const riskColor = cluster.sybilScore >= 80 ? chalk.red :
                             cluster.sybilScore >= 50 ? chalk.yellow : chalk.green;
            
            console.log(chalk.bold(`Cluster #${index + 1}`));
            console.log(`  Sybil Score: ${riskColor.bold(`${cluster.sybilScore}/100`)}`);
            console.log(`  Wallets: ${cluster.wallets.length}`);
            console.log(`  Funding Source: ${chalk.dim(formatAddress(cluster.fundingSource))}`);
            
            if (cluster.flags && cluster.flags.length > 0) {
                console.log(`  Flags: ${cluster.flags.join(', ')}`);
            }
            
            // Show first 5 wallets
            const displayWallets = cluster.wallets.slice(0, 5);
            console.log(`  Addresses:`);
            displayWallets.forEach(wallet => {
                console.log(`    ${chalk.dim('•')} ${formatAddress(wallet.address)}`);
            });
            
            if (cluster.wallets.length > 5) {
                console.log(`    ${chalk.dim(`... and ${cluster.wallets.length - 5} more`)}`);
            }
            
            console.log();
        });
    }

    // Flagged Clusters Summary
    if (result.flaggedClusters && result.flaggedClusters.length > 0) {
        console.log(chalk.bold.yellow(`═══ Flagged for Review (${result.flaggedClusters.length}) ═══\n`));
        
        const flaggedTable = new Table({
            head: ['Cluster', 'Score', 'Wallets', 'Source'],
            style: { head: ['yellow'] },
        });

        result.flaggedClusters.forEach((cluster, idx) => {
            const scoreColor = cluster.sybilScore >= 80 ? chalk.red :
                              cluster.sybilScore >= 50 ? chalk.yellow : chalk.green;
            
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
        console.log(chalk.green(`✓ Results exported to ${exportPath}`));
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
        console.log(chalk.yellow('⚠ No clusters to export'));
        return;
    }

    exportToCSV(rows, filename);
    console.log(chalk.green(`✓ Results exported to ${filename}`));
    console.log(chalk.dim(`  ${rows.length} rows exported`));
}
