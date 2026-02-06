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
import readline from 'readline';

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

// Back option constant
const BACK_VALUE = '__BACK__';
const CANCEL_VALUE = '__CANCEL__';

// Helper to create back option
const createBackOption = () => ({ name: colors.muted('[Back]'), value: BACK_VALUE });
const createCancelOption = () => ({ name: colors.muted('[Cancel]'), value: CANCEL_VALUE });

// Setup keypress detection for ESC
function setupKeypress(): Promise<void> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        readline.emitKeypressEvents(process.stdin);
        
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        
        process.stdin.on('keypress', (str, key) => {
            if (key.name === 'escape') {
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                rl.close();
                resolve();
            }
        });
        
        // Auto-resolve after a short time to not block
        setTimeout(() => {
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(false);
            }
            rl.close();
            resolve();
        }, 100);
    });
}

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
            // Handle any cancellation - return to main menu
            console.log(colors.muted('\nReturning to main menu...\n'));
            continue;
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
  - Select "[Back]" to return to previous menu
  - Select "[Cancel]" to return to main menu

${colors.primary.bold('Supported Chains:')}
  ethereum, linea, arbitrum, base, optimism, polygon

${colors.muted('Documentation: https://github.com/Deji-Tech/fundtracer-by-dt')}
`);
}

async function interactiveAnalyze() {
    const chains = getEnabledChains();
    
    // Step 1: Get address
    let address: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'input',
                name: 'value',
                message: 'Enter wallet address:',
                validate: (input) => {
                    if (!input) return 'Please enter an address';
                    if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                    return 'Invalid address format (0x...)';
                },
            },
        ]);
        address = result.value;
    } catch (e) {
        return; // User cancelled - return to main menu
    }

    // Step 2: Select chain
    let chain: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Select blockchain:',
                choices: [
                    ...chains.map(c => ({ name: c.name, value: c.id })),
                    createBackOption(),
                    createCancelOption()
                ],
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactiveAnalyze(); // Start over
        if (result.value === CANCEL_VALUE) return; // Back to main menu
        chain = result.value;
    } catch (e) {
        return;
    }

    // Step 3: Select depth
    let depth: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Funding tree depth:',
                choices: [
                    { name: '1 - Quick scan', value: '1' },
                    { name: '2 - Standard', value: '2' },
                    { name: '3 - Deep (recommended)', value: '3' },
                    { name: '5 - Very deep (slower)', value: '5' },
                    createBackOption(),
                    createCancelOption()
                ],
                default: '3',
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactiveAnalyze();
        if (result.value === CANCEL_VALUE) return;
        depth = result.value;
    } catch (e) {
        return;
    }

    // Step 4: Select output format
    let output: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Output format:',
                choices: [
                    { name: 'Table', value: 'table' },
                    { name: 'Tree', value: 'tree' },
                    { name: 'JSON', value: 'json' },
                    { name: 'CSV', value: 'csv' },
                    createBackOption(),
                    createCancelOption()
                ],
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactiveAnalyze();
        if (result.value === CANCEL_VALUE) return;
        output = result.value;
    } catch (e) {
        return;
    }

    console.log();
    await analyzeCommand(address, { chain, depth, output: output as 'table' | 'tree' | 'json' | 'csv' });
}

async function interactivePortfolio() {
    const chains = getEnabledChains();

    // Step 1: Get address
    let address: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'input',
                name: 'value',
                message: 'Enter wallet address:',
                validate: (input) => {
                    if (!input) return 'Please enter an address';
                    if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                    return 'Invalid address format';
                },
            },
        ]);
        address = result.value;
    } catch (e) {
        return;
    }

    // Step 2: Select chain
    let chain: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Select blockchain:',
                choices: [
                    ...chains.map(c => ({ name: c.name, value: c.id })),
                    createBackOption(),
                    createCancelOption()
                ],
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactivePortfolio();
        if (result.value === CANCEL_VALUE) return;
        chain = result.value;
    } catch (e) {
        return;
    }

    // Step 3: Select what to display
    let views: string[];
    try {
        const result = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'value',
                message: 'What to display:',
                choices: [
                    { name: 'Token balances', value: 'tokens', checked: true },
                    { name: 'NFTs', value: 'nfts' },
                ],
            },
        ]);
        views = result.value;
    } catch (e) {
        return;
    }

    // Step 4: Select output format
    let output: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Output format:',
                choices: [
                    { name: 'Table', value: 'table' },
                    { name: 'JSON', value: 'json' },
                    { name: 'CSV', value: 'csv' },
                    createBackOption(),
                    createCancelOption()
                ],
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactivePortfolio();
        if (result.value === CANCEL_VALUE) return;
        output = result.value;
    } catch (e) {
        return;
    }

    console.log();
    await portfolioCommand(address, {
        chain,
        output: output as 'table' | 'json' | 'csv',
        nfts: views.includes('nfts'),
        tokens: views.includes('tokens'),
        transactions: false,
    });
}

async function interactiveCompare() {
    const chains = getEnabledChains();
    const addresses: string[] = [];

    console.log(colors.secondary('Enter wallet addresses for Sybil detection\n'));

    // Collect addresses
    while (true) {
        const promptNum = addresses.length + 1;
        
        let action: string;
        try {
            const result = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'value',
                    message: `Wallet #${promptNum}:`,
                    choices: [
                        { name: 'Enter address', value: 'enter' },
                        ...(addresses.length >= 2 ? [{ name: colors.success('Continue to analysis'), value: 'continue' }] : []),
                        ...(addresses.length > 0 ? [createBackOption()] : []),
                        createCancelOption()
                    ],
                },
            ]);
            action = result.value;
        } catch (e) {
            return;
        }

        if (action === CANCEL_VALUE) {
            return;
        }

        if (action === BACK_VALUE) {
            addresses.pop();
            continue;
        }

        if (action === 'continue') {
            break;
        }

        // Enter address
        try {
            const result = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'value',
                    message: `Address #${promptNum}:`,
                    validate: (input) => {
                        if (!input) return 'Please enter an address';
                        if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                        return 'Invalid address format';
                    },
                },
            ]);
            addresses.push(result.value);
            console.log(colors.success(`  Added: ${result.value.slice(0, 10)}...`));
        } catch (e) {
            return;
        }
    }

    // Select chain
    let chain: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Select blockchain:',
                choices: [
                    ...chains.map(c => ({ name: c.name, value: c.id })),
                    createBackOption(),
                    createCancelOption()
                ],
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactiveCompare();
        if (result.value === CANCEL_VALUE) return;
        chain = result.value;
    } catch (e) {
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
}

async function interactiveBatch() {
    const chains = getEnabledChains();

    // Step 1: Get file path
    let filepath: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'input',
                name: 'value',
                message: 'Enter path to file with addresses:',
                validate: (input) => {
                    if (!input) return 'Please enter a file path';
                    return true;
                },
            },
        ]);
        filepath = result.value;
    } catch (e) {
        return;
    }

    // Step 2: Select chain
    let chain: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Select blockchain:',
                choices: [
                    ...chains.map(c => ({ name: c.name, value: c.id })),
                    createBackOption(),
                    createCancelOption()
                ],
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactiveBatch();
        if (result.value === CANCEL_VALUE) return;
        chain = result.value;
    } catch (e) {
        return;
    }

    // Step 3: Select depth
    let depth: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Analysis depth:',
                choices: [
                    { name: '1 - Quick scan', value: '1' },
                    { name: '2 - Standard', value: '2' },
                    { name: '3 - Deep', value: '3' },
                    createBackOption(),
                    createCancelOption()
                ],
                default: '2',
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactiveBatch();
        if (result.value === CANCEL_VALUE) return;
        depth = result.value;
    } catch (e) {
        return;
    }

    // Step 4: Select parallel processing
    let parallel: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Parallel processing:',
                choices: [
                    { name: '3 wallets at a time', value: '3' },
                    { name: '5 wallets at a time', value: '5' },
                    { name: '10 wallets at a time', value: '10' },
                    createBackOption(),
                    createCancelOption()
                ],
                default: '5',
            },
        ]);
        
        if (result.value === BACK_VALUE) return interactiveBatch();
        if (result.value === CANCEL_VALUE) return;
        parallel = result.value;
    } catch (e) {
        return;
    }

    console.log();
    await batchCommand(filepath, {
        chain,
        depth,
        output: 'table',
        parallel,
    });
}

async function interactiveConfig() {
    const providers = [
        { name: 'Alchemy (Primary RPC - Required)', value: 'alchemy' },
        { name: 'Moralis (10x faster funding trace)', value: 'moralis' },
        { name: 'Dune (Fast contract analysis)', value: 'dune' },
        { name: 'Etherscan (Ethereum fallback)', value: 'etherscan' },
        createCancelOption(),
    ];

    let provider: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'value',
                message: 'Select provider to configure:',
                choices: providers,
            },
        ]);
        
        if (result.value === CANCEL_VALUE) {
            return;
        }
        provider = result.value;
    } catch (e) {
        return;
    }

    let apiKey: string;
    try {
        const result = await inquirer.prompt([
            {
                type: 'password',
                name: 'value',
                message: `Enter API key for ${provider}:`,
                mask: '*',
            },
        ]);
        apiKey = result.value;
    } catch (e) {
        return;
    }

    if (apiKey) {
        const { configCommand } = await import('./config.js');
        await configCommand({ setKey: `${provider}:${apiKey}` });
    }
}
