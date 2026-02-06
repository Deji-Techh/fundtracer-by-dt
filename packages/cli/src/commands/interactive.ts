/**
 * FundTracer CLI - Interactive Mode
 * Full REPL experience for blockchain forensics.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ChainId, getEnabledChains } from '@fundtracer/core';
import { analyzeCommand } from './analyze.js';
import { compareCommand } from './compare.js';
import { portfolioCommand } from './portfolio.js';
import { batchCommand } from './batch.js';

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

// Symbol for back option
const BACK_OPTION = { name: colors.muted('← Back'), value: '__BACK__' };

export async function interactiveCommand() {
    while (true) {
        try {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: colors.primary('>'),
                    prefix: '',
                    choices: [
                        { name: 'Analyze a wallet', value: 'analyze' },
                        { name: 'Compare wallets (Sybil detection)', value: 'compare' },
                        { name: 'View NFT Portfolio', value: 'portfolio' },
                        { name: 'Batch analyze from file', value: 'batch' },
                        { name: 'Configure API keys', value: 'config' },
                        { name: 'Help', value: 'help' },
                        { name: 'Exit', value: 'exit' },
                    ],
                },
            ]);

            if (action === 'exit') {
                console.log(colors.muted('\nSession ended.\n'));
                process.exit(0);
            }

            if (action === 'help') {
                showHelp();
                continue;
            }

            switch (action) {
                case 'analyze':
                    await interactiveAnalyze();
                    break;
                case 'compare':
                    await interactiveCompare();
                    break;
                case 'portfolio':
                    await interactivePortfolio();
                    break;
                case 'batch':
                    await interactiveBatch();
                    break;
                case 'config':
                    await interactiveConfig();
                    break;
            }
        } catch (error: any) {
            // Handle ESC key or Ctrl+C - return to main menu silently
            if (error?.message?.includes('User force closed') || error?.message?.includes('canceled')) {
                console.log(colors.muted('\n[ESC] Returning to main menu...\n'));
                continue;
            }
            console.log(colors.error(`\nError: ${error?.message || 'Unknown error'}\n`));
        }

        console.log('');
    }
}

function showHelp() {
    console.log(`
${colors.primary.bold('FundTracer CLI - Available Commands:')}

  ${colors.accent('analyze <address>')}     Analyze a single wallet's funding sources
  ${colors.accent('compare <addresses...>')} Compare wallets for Sybil patterns
  ${colors.accent('portfolio <address>')}   View NFT collections and token balances
  ${colors.accent('batch <file>')}          Analyze multiple wallets from a file
  ${colors.accent('config')}                Configure API keys and settings
  ${colors.accent('interactive')}           Start this interactive mode

${colors.primary.bold('Navigation:')}
  - Use arrow keys to navigate menus
  - Press Enter to select
  - Press ESC or select "← Back" to return to previous menu
  - Press Ctrl+C to exit immediately

${colors.primary.bold('Supported Chains:')}
  ethereum, linea, arbitrum, base, optimism, polygon

${colors.primary.bold('Detection Capabilities:')}
  - Rapid fund movement (flash loans, MEV)
  - Same-block transactions (bot activity)
  - Circular fund flows (wash trading)
  - Sybil farming patterns
  - Fresh wallet detection

${colors.muted('Documentation: https://github.com/Deji-Tech/fundtracer-by-dt')}
`);
}

async function interactiveAnalyze() {
    const chains = getEnabledChains();

    try {
        // Step 1: Get address
        const { address } = await inquirer.prompt([
            {
                type: 'input',
                name: 'address',
                message: 'Enter wallet address (ESC to go back):',
                validate: (input) => {
                    if (!input) return 'Please enter a valid Ethereum address (0x...) or press ESC';
                    if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                    return 'Please enter a valid Ethereum address (0x...)';
                },
            },
        ]);

        // Step 2: Select chain
        const { chain } = await inquirer.prompt([
            {
                type: 'list',
                name: 'chain',
                message: 'Select blockchain:',
                choices: [
                    ...chains.map(c => ({ name: c.name, value: c.id })),
                    BACK_OPTION
                ],
            },
        ]);

        if (chain === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        // Step 3: Select depth
        const { depth } = await inquirer.prompt([
            {
                type: 'list',
                name: 'depth',
                message: 'Funding tree depth:',
                choices: [
                    { name: '1 - Quick scan', value: '1' },
                    { name: '2 - Standard', value: '2' },
                    { name: '3 - Deep (recommended)', value: '3' },
                    { name: '5 - Very deep (slower)', value: '5' },
                    BACK_OPTION
                ],
                default: '3',
            },
        ]);

        if (depth === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        // Step 4: Select output format
        const { output } = await inquirer.prompt([
            {
                type: 'list',
                name: 'output',
                message: 'Output format:',
                choices: [
                    { name: 'Table - Easy to read', value: 'table' },
                    { name: 'Tree - Visualize funding flow', value: 'tree' },
                    { name: 'JSON - Machine readable', value: 'json' },
                    { name: 'CSV - Spreadsheet format', value: 'csv' },
                    BACK_OPTION
                ],
            },
        ]);

        if (output === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        console.log();
        await analyzeCommand(address, { chain, depth, output });
    } catch (error: any) {
        if (error?.message?.includes('User force closed') || error?.message?.includes('canceled')) {
            console.log(colors.muted('\n[ESC] Returning to main menu...\n'));
            return;
        }
        throw error;
    }
}

async function interactiveCompare() {
    const chains = getEnabledChains();
    const addresses: string[] = [];

    console.log(colors.muted('Enter wallet addresses for Sybil detection\n'));

    try {
        // Collect addresses with ability to go back
        while (true) {
            const promptNum = addresses.length + 1;
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: `Wallet #${promptNum}:`,
                    choices: [
                        { name: 'Enter address', value: 'enter' },
                        ...(addresses.length >= 2 ? [{ name: 'Continue to analysis', value: 'continue' }] : []),
                        ...(addresses.length > 0 ? [BACK_OPTION] : []),
                        { name: colors.muted('Cancel'), value: 'cancel' },
                    ],
                },
            ]);

            if (action === 'cancel') {
                console.log(colors.muted('\nCancelled.\n'));
                return;
            }

            if (action === '__BACK__') {
                addresses.pop(); // Remove last address
                continue;
            }

            if (action === 'continue') {
                break;
            }

            // Enter address
            const { address } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'address',
                    message: `Address #${promptNum}:`,
                    validate: (input) => {
                        if (!input) return 'Please enter an address';
                        if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                        return 'Invalid address format';
                    },
                },
            ]);

            addresses.push(address);
            console.log(colors.success(`  Added: ${address.slice(0, 10)}...`));
        }

        // Select chain
        const { chain } = await inquirer.prompt([
            {
                type: 'list',
                name: 'chain',
                message: 'Select blockchain:',
                choices: [
                    ...chains.map(c => ({ name: c.name, value: c.id })),
                    BACK_OPTION
                ],
            },
        ]);

        if (chain === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        console.log();
        await compareCommand(addresses, {
            chain,
            depth: '2',
            output: 'table',
            minCluster: '3',
            concurrency: '10',
        });
    } catch (error: any) {
        if (error?.message?.includes('User force closed') || error?.message?.includes('canceled')) {
            console.log(colors.muted('\n[ESC] Returning to main menu...\n'));
            return;
        }
        throw error;
    }
}

async function interactivePortfolio() {
    const chains = getEnabledChains();

    try {
        // Step 1: Get address
        const { address } = await inquirer.prompt([
            {
                type: 'input',
                name: 'address',
                message: 'Enter wallet address (ESC to go back):',
                validate: (input) => {
                    if (!input) return 'Please enter a valid Ethereum address (0x...)';
                    if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                    return 'Invalid address format';
                },
            },
        ]);

        // Step 2: Select chain
        const { chain } = await inquirer.prompt([
            {
                type: 'list',
                name: 'chain',
                message: 'Select blockchain:',
                choices: [
                    ...chains.map(c => ({ name: c.name, value: c.id })),
                    BACK_OPTION
                ],
            },
        ]);

        if (chain === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        // Step 3: Select what to display
        const { views } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'views',
                message: 'What to display:',
                choices: [
                    { name: 'Token balances', value: 'tokens', checked: true },
                    { name: 'NFTs', value: 'nfts' },
                ],
            },
        ]);

        // Step 4: Select output format
        const { output } = await inquirer.prompt([
            {
                type: 'list',
                name: 'output',
                message: 'Output format:',
                choices: [
                    { name: 'Table - Easy to read', value: 'table' },
                    { name: 'JSON - Machine readable', value: 'json' },
                    { name: 'CSV - Spreadsheet format', value: 'csv' },
                    BACK_OPTION
                ],
            },
        ]);

        if (output === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        console.log();
        await portfolioCommand(address, {
            chain,
            output,
            nfts: views.includes('nfts'),
            tokens: views.includes('tokens'),
            transactions: false,
        });
    } catch (error: any) {
        if (error?.message?.includes('User force closed') || error?.message?.includes('canceled')) {
            console.log(colors.muted('\n[ESC] Returning to main menu...\n'));
            return;
        }
        throw error;
    }
}

async function interactiveBatch() {
    const chains = getEnabledChains();

    try {
        // Step 1: Get file path
        const { filepath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'filepath',
                message: 'Enter path to file with addresses (ESC to go back):',
                validate: (input) => {
                    if (!input) return 'Please enter a file path';
                    return true;
                },
            },
        ]);

        // Step 2: Select chain
        const { chain } = await inquirer.prompt([
            {
                type: 'list',
                name: 'chain',
                message: 'Select blockchain:',
                choices: [
                    ...chains.map(c => ({ name: c.name, value: c.id })),
                    BACK_OPTION
                ],
            },
        ]);

        if (chain === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        // Step 3: Select depth
        const { depth } = await inquirer.prompt([
            {
                type: 'list',
                name: 'depth',
                message: 'Analysis depth:',
                choices: [
                    { name: '1 - Quick scan', value: '1' },
                    { name: '2 - Standard', value: '2' },
                    { name: '3 - Deep', value: '3' },
                    BACK_OPTION
                ],
                default: '2',
            },
        ]);

        if (depth === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        // Step 4: Select parallel processing
        const { parallel } = await inquirer.prompt([
            {
                type: 'list',
                name: 'parallel',
                message: 'Parallel processing:',
                choices: [
                    { name: '3 wallets at a time', value: '3' },
                    { name: '5 wallets at a time', value: '5' },
                    { name: '10 wallets at a time (fast)', value: '10' },
                    BACK_OPTION
                ],
                default: '5',
            },
        ]);

        if (parallel === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        console.log();
        await batchCommand(filepath, {
            chain,
            depth,
            output: 'table',
            parallel,
        });
    } catch (error: any) {
        if (error?.message?.includes('User force closed') || error?.message?.includes('canceled')) {
            console.log(colors.muted('\n[ESC] Returning to main menu...\n'));
            return;
        }
        throw error;
    }
}

async function interactiveConfig() {
    const providers = [
        { name: 'Alchemy (Primary RPC - Required)', value: 'alchemy' },
        { name: 'Moralis (10x faster funding trace)', value: 'moralis' },
        { name: 'Dune (Fast contract analysis)', value: 'dune' },
        { name: 'Etherscan (Ethereum fallback)', value: 'etherscan' },
        BACK_OPTION,
    ];

    try {
        const { provider } = await inquirer.prompt([
            {
                type: 'list',
                name: 'provider',
                message: 'Select provider to configure:',
                choices: providers,
            },
        ]);

        if (provider === '__BACK__') {
            console.log(colors.muted('\nReturning...\n'));
            return;
        }

        const { apiKey } = await inquirer.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: `Enter API key for ${provider} (ESC to cancel):`,
                mask: '*',
            },
        ]);

        if (apiKey) {
            const { configCommand } = await import('./config.js');
            await configCommand({ setKey: `${provider}:${apiKey}` });
        }
    } catch (error: any) {
        if (error?.message?.includes('User force closed') || error?.message?.includes('canceled')) {
            console.log(colors.muted('\n[ESC] Returning to main menu...\n'));
            return;
        }
        throw error;
    }
}
