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

export async function batchCommand(file: string, options: BatchOptions) {
    // Validate file exists
    if (!fs.existsSync(file)) {
        console.error(colors.error(`Error: File not found: ${file}`));
        process.exit(1);
    }

    const chainId = options.chain as ChainId;
    const depth = parseInt(options.depth, 10);
    const parallel = parseInt(options.parallel, 10);
    const minValue = options.minValue ? parseFloat(options.minValue) : undefined;

    // Read and validate addresses
    console.log(colors.muted(`Reading addresses from ${file}...`));
    const fileAddresses = readAddressesFromFile(file);
    const { valid: validAddresses, invalid: invalidAddresses } = validateAddresses(fileAddresses);

    if (invalidAddresses.length > 0) {
        console.log(colors.warning(`Ignored ${invalidAddresses.length} invalid addresses`));
    }

    if (validAddresses.length === 0) {
        console.error(colors.error('Error: No valid addresses found in file'));
        process.exit(1);
    }

    console.log(colors.primary.bold('\nBatch Wallet Analysis'));
    console.log(colors.border('═'.repeat(60)));
    console.log(`Wallets: ${colors.secondary(validAddresses.length.toString())}`);
    console.log(`Chain: ${colors.secondary(chainId.toUpperCase())}`);
    console.log(`Parallel: ${colors.secondary(parallel.toString())}x`);
    console.log(`Depth: ${colors.secondary(depth.toString())}`);
    console.log();

    const apiKeys = getApiKeys();
    if (!apiKeys.alchemy) {
        console.error(colors.error('Error: Alchemy API key required'));
        console.log(colors.muted('Run: fundtracer config --set-key alchemy:YOUR_KEY'));
        process.exit(1);
    }

    const results: BatchResult[] = [];
    const startTime = Date.now();

    // Process in parallel batches
    const spinner = ora({
        text: colors.secondary(`Analyzing 0/${validAddresses.length} wallets...`),
        color: 'gray',
    }).start();

    try {
        // Process addresses in parallel batches
        for (let i = 0; i < validAddresses.length; i += parallel) {
            const batch = validAddresses.slice(i, i + parallel);
            
            spinner.text = colors.secondary(`Analyzing ${Math.min(i + batch.length, validAddresses.length)}/${validAddresses.length} wallets...`);

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

        spinner.succeed(colors.success(`Batch analysis complete (${formatDuration(totalDuration)})`));
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
        console.log(colors.primary.bold('\nSummary'));
        console.log(colors.border('─'.repeat(60)));
        console.log(`Total: ${colors.primary(results.length.toString())} wallets`);
        console.log(`Success: ${colors.success(successCount.toString())}`);
        if (failCount > 0) {
            console.log(`Failed: ${colors.error(failCount.toString())}`);
        }
        console.log(`Duration: ${colors.primary(formatDuration(totalDuration))}`);
        console.log(`Avg per wallet: ${colors.primary(formatDuration(totalDuration / results.length))}`);

    } catch (error) {
        spinner.fail(colors.error('Batch analysis failed'));
        console.error(colors.error(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}

function outputTable(results: BatchResult[], totalDuration: number) {
    console.log(colors.primary.bold('Analysis Results'));
    console.log(colors.border('═'.repeat(60)));
    console.log();

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

    console.log(colors.secondary.bold('Risk Distribution:'));
    const riskTable = new Table({
        head: [colors.secondary('Risk Level'), colors.secondary('Count'), colors.secondary('Percentage')],
        style: { head: ['gray'] },
        chars: {
            'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
            'right': '│', 'right-mid': '┤', 'middle': '│',
        },
    });

    const total = results.filter(r => r.success).length;
    riskTable.push(
        [colors.error('Critical'), riskCounts.critical.toString(), `${((riskCounts.critical/total)*100).toFixed(1)}%`],
        [colors.high('High'), riskCounts.high.toString(), `${((riskCounts.high/total)*100).toFixed(1)}%`],
        [colors.medium('Medium'), riskCounts.medium.toString(), `${((riskCounts.medium/total)*100).toFixed(1)}%`],
        [colors.low('Low'), riskCounts.low.toString(), `${((riskCounts.low/total)*100).toFixed(1)}%`],
    );
    console.log(riskTable.toString());
    console.log();

    // Individual results table
    console.log(colors.secondary.bold(`Individual Results (${results.length})`));
    console.log(colors.border('─'.repeat(60)));
    console.log();
    
    const resultsTable = new Table({
        head: [colors.secondary('Address'), colors.secondary('Risk'), colors.secondary('Score'), colors.secondary('Txs'), colors.secondary('Duration'), colors.secondary('Status')],
        style: { head: ['gray'] },
        colWidths: [16, 10, 8, 8, 10, 10],
        chars: {
            'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
            'right': '│', 'right-mid': '┤', 'middle': '│',
        },
    });

    results.forEach(r => {
        if (r.success && r.result) {
            const riskColor = r.result.riskLevel === 'critical' ? colors.critical :
                             r.result.riskLevel === 'high' ? colors.high :
                             r.result.riskLevel === 'medium' ? colors.medium :
                             colors.low;
            
            resultsTable.push([
                formatAddress(r.address),
                riskColor(r.result.riskLevel.toUpperCase()),
                r.result.overallRiskScore.toString(),
                r.result.transactions.length.toString(),
                formatDuration(r.duration),
                colors.success('OK'),
            ]);
        } else {
            resultsTable.push([
                formatAddress(r.address),
                colors.muted('N/A'),
                '-',
                '-',
                formatDuration(r.duration),
                colors.error('FAIL'),
            ]);
        }
    });

    console.log(resultsTable.toString());

    // Show failures if any
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
        console.log(colors.error.bold(`\nFailures (${failures.length})`));
        console.log(colors.border('─'.repeat(60)));
        console.log();
        failures.forEach(f => {
            console.log(`${colors.error('[FAIL]')} ${formatAddress(f.address)}: ${f.error}`);
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
        console.log(colors.success(`Results exported to ${exportPath}`));
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
        console.log(colors.warning('No results to export'));
        return;
    }

    exportToCSV(rows, filename);
    console.log(colors.success(`Results exported to ${filename}`));
    console.log(colors.muted(`  ${rows.length} rows exported`));
}
