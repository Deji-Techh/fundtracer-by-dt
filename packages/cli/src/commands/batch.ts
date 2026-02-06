// ============================================================
// FundTracer CLI - Batch Command
// Analyze multiple wallets from a file efficiently
// ============================================================

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import {
    WalletAnalyzer,
    ChainId,
    AnalysisResult,
} from '@fundtracer/core';
import { 
    getApiKeys, 
    formatAddress, 
    formatEth,
    exportToCSV,
    readAddressesFromFile,
    validateAddresses,
    formatDuration 
} from '../utils.js';
import fs from 'fs';
import path from 'path';

interface BatchOptions {
    chain: string;
    depth: string;
    output: 'table' | 'json' | 'csv';
    export?: string;
    parallel: string;
    minValue?: string;
}

interface BatchResult {
    address: string;
    success: boolean;
    result?: AnalysisResult;
    error?: string;
    duration: number;
}

export async function batchCommand(file: string, options: BatchOptions) {
    // Validate file exists
    if (!fs.existsSync(file)) {
        console.error(chalk.red(`✗ File not found: ${file}`));
        process.exit(1);
    }

    const chainId = options.chain as ChainId;
    const depth = parseInt(options.depth, 10);
    const parallel = parseInt(options.parallel, 10);
    const minValue = options.minValue ? parseFloat(options.minValue) : undefined;

    // Read and validate addresses
    console.log(chalk.dim(`📄 Reading addresses from ${file}...`));
    const fileAddresses = readAddressesFromFile(file);
    const { valid: validAddresses, invalid: invalidAddresses } = validateAddresses(fileAddresses);

    if (invalidAddresses.length > 0) {
        console.log(chalk.yellow(`⚠ Ignored ${invalidAddresses.length} invalid addresses`));
    }

    if (validAddresses.length === 0) {
        console.error(chalk.red('✗ No valid addresses found in file'));
        process.exit(1);
    }

    console.log(chalk.cyan(`\n🔍 Batch Wallet Analysis`));
    console.log(chalk.dim(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(`Wallets: ${chalk.bold(validAddresses.length)}`);
    console.log(`Chain: ${chalk.bold(chainId.toUpperCase())}`);
    console.log(`Parallel: ${chalk.bold(parallel)}x`);
    console.log(`Depth: ${chalk.bold(depth)}`);
    console.log();

    const apiKeys = getApiKeys();
    if (!apiKeys.alchemy) {
        console.error(chalk.red('✗ Alchemy API key required'));
        console.log(chalk.dim('Run: fundtracer config --set-key alchemy:YOUR_KEY'));
        process.exit(1);
    }

    const results: BatchResult[] = [];
    const startTime = Date.now();

    // Process in parallel batches
    const spinner = ora({
        text: `Analyzing 0/${validAddresses.length} wallets...`,
        color: 'cyan',
    }).start();

    try {
        // Process addresses in parallel batches
        for (let i = 0; i < validAddresses.length; i += parallel) {
            const batch = validAddresses.slice(i, i + parallel);
            
            spinner.text = `Analyzing ${Math.min(i + batch.length, validAddresses.length)}/${validAddresses.length} wallets...`;

            const batchPromises = batch.map(async (address) => {
                const walletStart = Date.now();
                try {
                    const analyzer = new WalletAnalyzer(apiKeys);
                    const result = await analyzer.analyze(address, chainId, {
                        treeConfig: {
                            maxDepth: depth,
                            minValueEth: minValue,
                        },
                    });

                    return {
                        address,
                        success: true,
                        result,
                        duration: (Date.now() - walletStart) / 1000,
                    };
                } catch (error) {
                    return {
                        address,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        duration: (Date.now() - walletStart) / 1000,
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        const totalDuration = (Date.now() - startTime) / 1000;
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        spinner.succeed(`Batch analysis complete! (${formatDuration(totalDuration)})`);
        console.log();

        // Output based on format
        switch (options.output) {
            case 'json':
                outputJson(results, options.export);
                break;
            case 'csv':
                outputCSV(results, options.export);
                break;
            default:
                outputTable(results, totalDuration);
        }

        // Summary
        console.log(chalk.bold.cyan('\n═══ Summary ═══\n'));
        console.log(`Total: ${chalk.bold(results.length)} wallets`);
        console.log(`Success: ${chalk.green.bold(successCount)}`);
        if (failCount > 0) {
            console.log(`Failed: ${chalk.red.bold(failCount)}`);
        }
        console.log(`Duration: ${chalk.bold(formatDuration(totalDuration))}`);
        console.log(`Avg per wallet: ${chalk.bold(formatDuration(totalDuration / results.length))}`);

    } catch (error) {
        spinner.fail('Batch analysis failed');
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}

function outputTable(results: BatchResult[], totalDuration: number) {
    console.log(chalk.bold.cyan('═══ Analysis Results ═══\n'));

    // Risk distribution
    const riskCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
    };

    results.forEach(r => {
        if (r.success && r.result) {
            riskCounts[r.result.riskLevel]++;
        }
    });

    console.log(chalk.bold('Risk Distribution:'));
    const riskTable = new Table({
        head: ['Risk Level', 'Count', 'Percentage'],
        style: { head: ['cyan'] },
    });

    const total = results.filter(r => r.success).length;
    riskTable.push(
        [chalk.red('🔴 Critical'), riskCounts.critical, `${((riskCounts.critical/total)*100).toFixed(1)}%`],
        [chalk.red('🟠 High'), riskCounts.high, `${((riskCounts.high/total)*100).toFixed(1)}%`],
        [chalk.yellow('🟡 Medium'), riskCounts.medium, `${((riskCounts.medium/total)*100).toFixed(1)}%`],
        [chalk.green('🟢 Low'), riskCounts.low, `${((riskCounts.low/total)*100).toFixed(1)}%`],
    );
    console.log(riskTable.toString());
    console.log();

    // Individual results table
    console.log(chalk.bold.cyan(`═══ Individual Results (${results.length}) ═══\n`));
    
    const resultsTable = new Table({
        head: ['Address', 'Risk', 'Score', 'Txs', 'Duration', 'Status'],
        style: { head: ['cyan'] },
        colWidths: [16, 10, 8, 8, 10, 10],
    });

    results.forEach(r => {
        if (r.success && r.result) {
            const riskColor = r.result.riskLevel === 'critical' ? chalk.bgRed.white :
                             r.result.riskLevel === 'high' ? chalk.red :
                             r.result.riskLevel === 'medium' ? chalk.yellow :
                             chalk.green;
            
            resultsTable.push([
                formatAddress(r.address),
                riskColor(r.result.riskLevel.toUpperCase()),
                r.result.overallRiskScore.toString(),
                r.result.transactions.length.toString(),
                formatDuration(r.duration),
                chalk.green('✓'),
            ]);
        } else {
            resultsTable.push([
                formatAddress(r.address),
                chalk.gray('N/A'),
                '-',
                '-',
                formatDuration(r.duration),
                chalk.red('✗'),
            ]);
        }
    });

    console.log(resultsTable.toString());

    // Show failures if any
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
        console.log(chalk.bold.red(`\n═══ Failures (${failures.length}) ═══\n`));
        failures.forEach(f => {
            console.log(`${chalk.red('✗')} ${formatAddress(f.address)}: ${f.error}`);
        });
    }
}

function outputJson(results: BatchResult[], exportPath?: string) {
    const output = {
        summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
        },
        results: results.map(r => ({
            address: r.address,
            success: r.success,
            duration: r.duration,
            ...(r.success && r.result ? {
                riskScore: r.result.overallRiskScore,
                riskLevel: r.result.riskLevel,
                transactionCount: r.result.transactions.length,
                balance: r.result.wallet.balanceInEth,
            } : {}),
            ...(r.error ? { error: r.error } : {}),
        })),
    };

    const jsonStr = JSON.stringify(output, null, 2);

    if (exportPath) {
        fs.writeFileSync(exportPath, jsonStr);
        console.log(chalk.green(`✓ Results exported to ${exportPath}`));
    } else {
        console.log(jsonStr);
    }
}

function outputCSV(results: BatchResult[], exportPath?: string) {
    const filename = exportPath || `batch-analysis-${Date.now()}.csv`;
    
    const rows = results.map(r => ({
        address: r.address,
        success: r.success ? 'YES' : 'NO',
        risk_score: r.success && r.result ? r.result.overallRiskScore : '',
        risk_level: r.success && r.result ? r.result.riskLevel : '',
        transactions: r.success && r.result ? r.result.transactions.length : '',
        balance_eth: r.success && r.result ? r.result.wallet.balanceInEth : '',
        duration_seconds: r.duration.toFixed(2),
        error: r.error || '',
    }));

    if (rows.length === 0) {
        console.log(chalk.yellow('⚠ No results to export'));
        return;
    }

    exportToCSV(rows, filename);
    console.log(chalk.green(`✓ Results exported to ${filename}`));
    console.log(chalk.dim(`  ${rows.length} rows exported`));
}
