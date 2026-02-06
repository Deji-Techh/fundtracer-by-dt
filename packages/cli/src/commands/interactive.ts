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

export async function interactiveCommand() {
    while (true) {
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

        try {
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
        } catch (error) {
            console.log(colors.error(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
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

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'address',
            message: 'Enter wallet address:',
            validate: (input) => {
                if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
                    return true;
                }
                return 'Please enter a valid Ethereum address (0x...)';
            },
        },
        {
            type: 'list',
            name: 'chain',
            message: 'Select blockchain:',
            choices: chains.map(c => ({ name: c.name, value: c.id })),
        },
        {
            type: 'list',
            name: 'depth',
            message: 'Funding tree depth:',
            choices: [
                { name: '1 - Quick scan', value: '1' },
                { name: '2 - Standard', value: '2' },
                { name: '3 - Deep (recommended)', value: '3' },
                { name: '5 - Very deep (slower)', value: '5' },
            ],
            default: '3',
        },
        {
            type: 'list',
            name: 'output',
            message: 'Output format:',
            choices: [
                { name: 'Table - Easy to read', value: 'table' },
                { name: 'Tree - Visualize funding flow', value: 'tree' },
                { name: 'JSON - Machine readable', value: 'json' },
                { name: 'CSV - Spreadsheet format', value: 'csv' },
            ],
        },
    ]);

    console.log();
    await analyzeCommand(answers.address, {
        chain: answers.chain,
        depth: answers.depth,
        output: answers.output,
    });
}

async function interactiveCompare() {
    const chains = getEnabledChains();
    const addresses: string[] = [];

    console.log(colors.muted('Enter wallet addresses for Sybil detection (empty to finish):\n'));

    let i = 1;
    while (true) {
        const { address } = await inquirer.prompt([
            {
                type: 'input',
                name: 'address',
                message: `Wallet #${i}:`,
                validate: (input) => {
                    if (input === '') {
                        if (addresses.length < 2) {
                            return 'Please enter at least 2 addresses';
                        }
                        return true;
                    }
                    if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
                        return true;
                    }
                    return 'Please enter a valid address or leave empty to finish';
                },
            },
        ]);

        if (address === '') break;
        addresses.push(address);
        i++;
    }

    const { chain } = await inquirer.prompt([
        {
            type: 'list',
            name: 'chain',
            message: 'Select blockchain:',
            choices: chains.map(c => ({ name: c.name, value: c.id })),
        },
    ]);

    console.log();
    await compareCommand(addresses, {
        chain,
        depth: '2',
        output: 'table',
        minCluster: '3',
        concurrency: '10',
    });
}

async function interactivePortfolio() {
    const chains = getEnabledChains();

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'address',
            message: 'Enter wallet address:',
            validate: (input) => {
                if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
                    return true;
                }
                return 'Please enter a valid Ethereum address (0x...)';
            },
        },
        {
            type: 'list',
            name: 'chain',
            message: 'Select blockchain:',
            choices: chains.map(c => ({ name: c.name, value: c.id })),
        },
        {
            type: 'checkbox',
            name: 'views',
            message: 'What to display:',
            choices: [
                { name: 'Token balances', value: 'tokens', checked: true },
                { name: 'NFTs', value: 'nfts' },
            ],
        },
        {
            type: 'list',
            name: 'output',
            message: 'Output format:',
            choices: [
                { name: 'Table - Easy to read', value: 'table' },
                { name: 'JSON - Machine readable', value: 'json' },
                { name: 'CSV - Spreadsheet format', value: 'csv' },
            ],
        },
    ]);

    console.log();
    await portfolioCommand(answers.address, {
        chain: answers.chain,
        output: answers.output,
        nfts: answers.views.includes('nfts'),
        tokens: answers.views.includes('tokens'),
        transactions: false,
    });
}

async function interactiveBatch() {
    const chains = getEnabledChains();

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'filepath',
            message: 'Enter path to file with addresses (one per line):',
            validate: (input) => {
                if (!input) return 'Please enter a file path';
                return true;
            },
        },
        {
            type: 'list',
            name: 'chain',
            message: 'Select blockchain:',
            choices: chains.map(c => ({ name: c.name, value: c.id })),
        },
        {
            type: 'list',
            name: 'depth',
            message: 'Analysis depth:',
            choices: [
                { name: '1 - Quick scan', value: '1' },
                { name: '2 - Standard', value: '2' },
                { name: '3 - Deep', value: '3' },
            ],
            default: '2',
        },
        {
            type: 'list',
            name: 'parallel',
            message: 'Parallel processing:',
            choices: [
                { name: '3 wallets at a time', value: '3' },
                { name: '5 wallets at a time', value: '5' },
                { name: '10 wallets at a time (fast)', value: '10' },
            ],
            default: '5',
        },
    ]);

    console.log();
    await batchCommand(answers.filepath, {
        chain: answers.chain,
        depth: answers.depth,
        output: 'table',
        parallel: answers.parallel,
    });
}

async function interactiveConfig() {
    const providers = [
        { name: 'Alchemy (Primary RPC - Required)', value: 'alchemy' },
        { name: 'Moralis (10x faster funding trace)', value: 'moralis' },
        { name: 'Dune (Fast contract analysis)', value: 'dune' },
        { name: 'Etherscan (Ethereum fallback)', value: 'etherscan' },
    ];

    const { provider } = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Select provider to configure:',
            choices: providers,
        },
    ]);

    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: `Enter API key for ${provider}:`,
            mask: '*',
        },
    ]);

    if (apiKey) {
        const { configCommand } = await import('./config.js');
        await configCommand({ setKey: `${provider}:${apiKey}` });
    }
}
