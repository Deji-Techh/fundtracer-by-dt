#!/usr/bin/env node
/**
 * FundTracer by DT - Professional CLI
 * Blockchain wallet forensics from your terminal.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeCommand } from './commands/analyze.js';
import { compareCommand } from './commands/compare.js';
import { portfolioCommand } from './commands/portfolio.js';
import { batchCommand } from './commands/batch.js';
import { configCommand } from './commands/config.js';
import { interactiveMode } from './commands/interactive.js';
import { getApiKeys, getSybilApiKeys } from './utils.js';

// Professional ASCII Art Banner - Dark/Glassy theme
const banner = `
${chalk.hex('#2a2a2a')('  ███████╗')}${chalk.hex('#3a3a3a')('██╗   ██╗')}${chalk.hex('#4a4a4a')('███╗   ██╗')}${chalk.hex('#5a5a5a')('██████╗ ')}${chalk.hex('#6a6a6a')('████████╗')}${chalk.hex('#7a7a7a')('██████╗ ')}${chalk.hex('#8a8a8a')(' █████╗ ')}${chalk.hex('#9a9a9a')(' ██████╗')}${chalk.hex('#aaaaaa')('███████╗')}${chalk.hex('#bbbbbb')('██████╗ ')}
${chalk.hex('#2a2a2a')('  ██╔════╝')}${chalk.hex('#3a3a3a')('██║   ██║')}${chalk.hex('#4a4a4a')('████╗  ██║')}${chalk.hex('#5a5a5a')('██╔══██╗')}${chalk.hex('#6a6a6a')('╚══██╔══╝')}${chalk.hex('#7a7a7a')('██╔══██╗')}${chalk.hex('#8a8a8a')('██╔══██╗')}${chalk.hex('#9a9a9a')('██╔════╝')}${chalk.hex('#aaaaaa')('██╔════╝')}${chalk.hex('#bbbbbb')('██╔══██╗')}
${chalk.hex('#2a2a2a')('  █████╗  ')}${chalk.hex('#3a3a3a')('██║   ██║')}${chalk.hex('#4a4a4a')('██╔██╗ ██║')}${chalk.hex('#5a5a5a')('██║  ██║')}${chalk.hex('#6a6a6a')('   ██║   ')}${chalk.hex('#7a7a7a')('██████╔╝')}${chalk.hex('#8a8a8a')('███████║')}${chalk.hex('#9a9a9a')('██║     ')}${chalk.hex('#aaaaaa')('█████╗  ')}${chalk.hex('#bbbbbb')('██████╔╝')}
${chalk.hex('#2a2a2a')('  ██╔══╝  ')}${chalk.hex('#3a3a3a')('██║   ██║')}${chalk.hex('#4a4a4a')('██║╚██╗██║')}${chalk.hex('#5a5a5a')('██║  ██║')}${chalk.hex('#6a6a6a')('   ██║   ')}${chalk.hex('#7a7a7a')('██╔══██╗')}${chalk.hex('#8a8a8a')('██╔══██║')}${chalk.hex('#9a9a9a')('██║     ')}${chalk.hex('#aaaaaa')('██╔══╝  ')}${chalk.hex('#bbbbbb')('██╔══██╗')}
${chalk.hex('#2a2a2a')('  ██║     ')}${chalk.hex('#3a3a3a')('╚██████╔╝')}${chalk.hex('#4a4a4a')('██║ ╚████║')}${chalk.hex('#5a5a5a')('██████╔╝')}${chalk.hex('#6a6a6a')('   ██║   ')}${chalk.hex('#7a7a7a')('██║  ██║')}${chalk.hex('#8a8a8a')('██║  ██║')}${chalk.hex('#9a9a9a')('╚██████╗')}${chalk.hex('#aaaaaa')('███████╗')}${chalk.hex('#bbbbbb')('██║  ██║')}
${chalk.hex('#2a2a2a')('  ╚═╝     ')}${chalk.hex('#3a3a3a')(' ╚═════╝ ')}${chalk.hex('#4a4a4a')('╚═╝  ╚═══╝')}${chalk.hex('#5a5a5a')('╚═════╝ ')}${chalk.hex('#6a6a6a')('   ╚═╝   ')}${chalk.hex('#7a7a7a')('╚═╝  ╚═╝')}${chalk.hex('#8a8a8a')('╚═╝  ╚═╝')}${chalk.hex('#9a9a9a')(' ╚═════╝')}${chalk.hex('#aaaaaa')('╚══════╝')}${chalk.hex('#bbbbbb')('╚═╝  ╚═╝')}
`;

const subtitle = chalk.hex('#888888')('                              Blockchain Wallet Forensics & Analysis Tool');

/** Show provider status */
function showProviderStatus(): void {
    const keys = getApiKeys();
    const sybilKeys = getSybilApiKeys();

    console.log(chalk.hex('#cccccc').bold('  Provider Status:'));
    console.log();

    // Core providers
    const providers = [
        { name: 'Alchemy', key: keys.alchemy, desc: 'Primary RPC Provider' },
        { name: 'Moralis', key: keys.moralis, desc: 'Fast Funding Trace' },
        { name: 'Dune', key: keys.dune, desc: 'Contract Analysis' },
    ];

    for (const p of providers) {
        if (p.key) {
            console.log(`  ${chalk.hex('#4ade80')('[OK]')} ${chalk.hex('#cccccc')(p.name.padEnd(12))} ${chalk.hex('#666666')(p.desc)}`);
        } else {
            console.log(`  ${chalk.hex('#ef4444')('[--]')} ${chalk.hex('#888888')(p.name.padEnd(12))} ${chalk.hex('#555555')('Not Configured')}`);
        }
    }

    // Sybil analysis status
    if (sybilKeys.length > 0) {
        console.log(`  ${chalk.hex('#4ade80')('[OK]')} ${chalk.hex('#cccccc')('Sybil Keys'.padEnd(12))} ${chalk.hex('#666666')(`${sybilKeys.length} keys configured`)}`);
    }
    console.log();
}

/** Show tips based on configuration */
function showTips(): void {
    const keys = getApiKeys();
    const sybilKeys = getSybilApiKeys();
    const hasAlchemy = !!keys.alchemy;
    const hasMoralis = !!keys.moralis;
    const hasDune = !!keys.dune;

    console.log(chalk.hex('#cccccc').bold('  Quick Start:'));
    console.log();

    if (!hasAlchemy) {
        console.log(chalk.hex('#fbbf24')('  Warning: No API keys configured. Run setup first:'));
        console.log(chalk.hex('#60a5fa')('    fundtracer config --set-key alchemy:YOUR_KEY'));
        console.log();
        console.log(chalk.hex('#666666')('  Get a free Alchemy key: https://dashboard.alchemy.com/'));
        return;
    }

    console.log(`  ${chalk.hex('#888888')('1.')} Analyze a wallet:  ${chalk.hex('#60a5fa')('fundtracer analyze 0x...')}`);
    console.log(`  ${chalk.hex('#888888')('2.')} Compare wallets:   ${chalk.hex('#60a5fa')('fundtracer compare 0x... 0x...')}`);
    console.log(`  ${chalk.hex('#888888')('3.')} View portfolio:    ${chalk.hex('#60a5fa')('fundtracer portfolio 0x...')}`);
    console.log(`  ${chalk.hex('#888888')('4.')} Batch analysis:    ${chalk.hex('#60a5fa')('fundtracer batch addresses.txt')}`);
    console.log(`  ${chalk.hex('#888888')('5.')} View config:       ${chalk.hex('#60a5fa')('fundtracer config --show')}`);

    // Performance tips
    if (!hasMoralis || !hasDune || sybilKeys.length < 20) {
        console.log();
        console.log(chalk.hex('#666666')('  Performance Tips:'));
        if (!hasMoralis) {
            console.log(chalk.hex('#555555')('  * Add Moralis for faster funding tracing'));
        }
        if (!hasDune) {
            console.log(chalk.hex('#555555')('  * Add Dune for faster contract analysis'));
        }
        if (sybilKeys.length < 20) {
            console.log(chalk.hex('#555555')(`  * Configure 20 API keys for ultra-fast Sybil detection (currently ${sybilKeys.length})`));
        }
    }
}

// Show banner when running without arguments or with interactive mode
const args = process.argv.slice(2);
const isInteractive = args.length === 0 || args[0] === 'interactive' || args[0] === 'i';

if (isInteractive && args.length === 0) {
    console.log(banner);
    console.log(subtitle);
    console.log();
    showProviderStatus();
    showTips();
    console.log();

    // Start interactive mode automatically
    interactiveMode();
} else {
    // Show smaller banner for commands
    if (args[0] !== '--help' && args[0] !== '-h' && args[0] !== '--version' && args[0] !== '-V') {
        console.log(chalk.hex('#888888').bold('\n  FundTracer') + chalk.hex('#555555')(' by DT\n'));
    }

    const program = new Command();

    program
        .name('fundtracer')
        .description('Blockchain wallet forensics tool for tracing funds and detecting suspicious activity')
        .version('1.0.0');

    // Analyze command
    program
        .command('analyze <address>')
        .description('Analyze a single wallet address')
        .option('-c, --chain <chain>', 'Blockchain network (ethereum, linea, arbitrum, base)', 'ethereum')
        .option('-d, --depth <number>', 'Maximum depth for funding tree', '3')
        .option('-o, --output <format>', 'Output format (table, json, tree, csv)', 'table')
        .option('--min-value <eth>', 'Minimum transaction value in ETH', '0')
        .option('--export <file>', 'Export results to file')
        .action(analyzeCommand);

    // Compare command (Sybil detection)
    program
        .command('compare <addresses...>')
        .alias('sybil')
        .description('Compare multiple wallet addresses for Sybil detection (uses 20 API keys)')
        .option('-c, --chain <chain>', 'Blockchain network', 'ethereum')
        .option('-o, --output <format>', 'Output format (table, json, csv)', 'table')
        .option('--min-cluster <number>', 'Minimum cluster size to flag', '3')
        .option('--concurrency <number>', 'Number of parallel batches (1-20)', '10')
        .option('-f, --file <file>', 'Read addresses from file')
        .option('--export <file>', 'Export results to file')
        .action(compareCommand);

    // Portfolio command
    program
        .command('portfolio <address>')
        .alias('nft')
        .description('View NFT collections and token balances for a wallet')
        .option('-c, --chain <chain>', 'Blockchain network', 'ethereum')
        .option('-o, --output <format>', 'Output format (table, json, csv)', 'table')
        .option('--export <file>', 'Export results to file')
        .option('--nfts', 'Show NFTs only', false)
        .option('--tokens', 'Show tokens only', false)
        .action(portfolioCommand);

    // Batch command
    program
        .command('batch <file>')
        .description('Analyze multiple wallets from a file (one address per line)')
        .option('-c, --chain <chain>', 'Blockchain network', 'ethereum')
        .option('-d, --depth <number>', 'Maximum depth for funding tree', '2')
        .option('-o, --output <format>', 'Output format (table, json, csv)', 'table')
        .option('--parallel <number>', 'Number of parallel analyses', '5')
        .option('--min-value <eth>', 'Minimum transaction value in ETH', '0')
        .option('--export <file>', 'Export results to file')
        .action(batchCommand);

    // Config command
    program
        .command('config')
        .description('Configure API keys and settings')
        .option('--set-key <provider:key>', 'Set API key (alchemy, moralis, dune, etherscan...)')
        .option('--show', 'Show current configuration')
        .option('--reset', 'Reset configuration to defaults')
        .action(configCommand);

    // Interactive mode
    program
        .command('interactive')
        .alias('i')
        .description('Start interactive mode with full banner')
        .action(() => {
            console.log(banner);
            console.log(subtitle);
            console.log();
            showProviderStatus();
            showTips();
            console.log();
            interactiveMode();
        });

    program.parse();
}
