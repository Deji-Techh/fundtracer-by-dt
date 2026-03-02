/**
 * FundTracer CLI - Interactive Mode
 * Full REPL experience with animations and enhanced UX
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ChainId, getEnabledChainList } from '@fundtracer/core';
import { analyzeCommand } from './analyze.js';
import { compareCommand } from './compare.js';
import { portfolioCommand } from './portfolio.js';
import { batchCommand } from './batch.js';
import { db } from '../database.js';
import { setTimeout } from 'timers/promises';

// Professional color scheme - old style
const colors = {
    primary: chalk.hex('#888888'),
    secondary: chalk.hex('#666666'),
    accent: chalk.hex('#60a5fa'),
    success: chalk.hex('#4ade80'),
    warning: chalk.hex('#fbbf24'),
    error: chalk.hex('#ef4444'),
    muted: chalk.hex('#555555'),
    border: chalk.hex('#333333'),
    gray: {
        100: chalk.hex('#f5f5f5'),
        300: chalk.hex('#d4d4d4'),
        400: chalk.hex('#a3a3a3'),
        500: chalk.hex('#737373'),
        600: chalk.hex('#525252'),
        700: chalk.hex('#404040'),
        800: chalk.hex('#262626'),
        900: chalk.hex('#171717'),
    }
};

// Constants
const BACK_VALUE = '__BACK__';
const CANCEL_VALUE = '__CANCEL__';
const MAIN_MENU_VALUE = '__MAIN_MENU__';
const HISTORY_VALUE = '__HISTORY__';
const FAVORITES_VALUE = '__FAVORITES__';
const WATCH_VALUE = '__WATCH__';

// Helper functions for menu options
const createBackOption = () => ({ name: colors.muted('[Back]'), value: BACK_VALUE });
const createCancelOption = () => ({ name: colors.muted('[Cancel]'), value: CANCEL_VALUE });
const createMainMenuOption = () => ({ name: colors.muted('[Main Menu]'), value: MAIN_MENU_VALUE });
const createHistoryOption = () => ({ name: colors.primary('History'), value: HISTORY_VALUE });
const createFavoritesOption = () => ({ name: colors.primary('Favorites'), value: FAVORITES_VALUE });
const createWatchOption = () => ({ name: colors.primary('Watch Mode'), value: WATCH_VALUE });

// Simple banner without emojis
function simpleBanner(): string {
    return `
${colors.gray[700]('  ███████╗██╗   ██╗███╗   ██╗██████╗ ████████╗██████╗  █████╗  ██████╗███████╗██████╗ ')}
${colors.gray[700]('  ██╔════╝██║   ██║████╗  ██║██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝██╔══██╗')}
${colors.gray[700]('  █████╗  ██║   ██║██╔██╗ ██║██║  ██║   ██║   ██████╔╝███████║██║     █████╗  ██████╔╝')}
${colors.gray[700]('  ██╔══╝  ██║   ██║██║╚██╗██║██║  ██║   ██║   ██╔══██╗██╔══██║██║     ██╔══╝  ██╔══██╗')}
${colors.gray[700]('  ██║     ╚██████╔╝██║ ╚████║██████╔╝   ██║   ██║  ██║██║  ██║╚██████╗███████╗██║  ██║')}
${colors.gray[700]('  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝  ╚═╝')}
`;
}

// Glass box for content
function glassBox(content: string[], title?: string): string {
    const width = Math.max(...content.map(line => line.length), 60);
    const horizontal = '─'.repeat(width + 4);
    
    let box = '';
    
    if (title) {
        const titleStr = ` ${title} `;
        const left = Math.floor((width + 4 - titleStr.length) / 2);
        const right = width + 4 - left - titleStr.length;
        box += colors.gray[500]('┌' + '─'.repeat(left) + titleStr + '─'.repeat(right) + '┐') + '\n';
    } else {
        box += colors.border('┌' + horizontal + '┐') + '\n';
    }
    
    content.forEach(line => {
        const padding = ' '.repeat(width - line.length);
        box += colors.border('│ ') + line + padding + colors.border(' │') + '\n';
    });
    
    box += colors.border('└' + horizontal + '┘');
    
    return box;
}

// Dashboard widget
function dashboardWidget(title: string, items: Array<{label: string, value: string}>): string {
    const maxLabel = Math.max(...items.map(i => i.label.length));
    const maxValue = Math.max(...items.map(i => i.value.length));
    const width = maxLabel + maxValue + 6;
    
    let widget = colors.gray[500]('┌' + '─'.repeat(width - 2) + '┐') + '\n';
    widget += colors.gray[500]('│ ') + colors.gray[300](title.padEnd(width - 4)) + colors.gray[500](' │') + '\n';
    widget += colors.gray[500]('├' + '─'.repeat(width - 2) + '┤') + '\n';
    
    items.forEach(item => {
        const line = `${item.label.padEnd(maxLabel)} : ${colors.primary(item.value.padEnd(maxValue))}`;
        widget += colors.gray[500]('│ ') + line.padEnd(width - 4) + colors.gray[500](' │') + '\n';
    });
    
    widget += colors.gray[500]('└' + '─'.repeat(width - 2) + '┘');
    return widget;
}

// Clear screen
function clearScreen(): void {
    console.clear();
    console.log('\n');
}

export async function interactiveCommand() {
    while (true) {
        try {
            // Clear screen and show dashboard
            clearScreen();
            await showDashboard();
            
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: colors.primary('>'),
                    prefix: '',
                    pageSize: 15,
                    choices: [
                        new inquirer.Separator(colors.muted('── Quick Access ──')),
                        createHistoryOption(),
                        createFavoritesOption(),
                        new inquirer.Separator(colors.muted('── Analysis ──')),
                        { name: colors.primary('Analyze a wallet'), value: 'analyze' },
                        { name: colors.primary('Compare wallets'), value: 'compare' },
                        { name: colors.primary('View Portfolio'), value: 'portfolio' },
                        { name: colors.primary('Batch analysis'), value: 'batch' },
                        new inquirer.Separator(colors.muted('── Tools ──')),
                        createWatchOption(),
                        { name: colors.muted('Configure API keys'), value: 'config' },
                        { name: colors.muted('Help'), value: 'help' },
                        { name: colors.error('Exit'), value: 'exit' },
                    ],
                },
            ]);

            if (action === 'exit') {
                console.log(colors.muted('\nSession ended.\n'));
                process.exit(0);
            }

            if (action === 'help') {
                await showHelp();
                continue;
            }

            // Handle special menu options
            if (action === HISTORY_VALUE) {
                await showHistory();
                continue;
            }
            
            if (action === FAVORITES_VALUE) {
                await showFavorites();
                continue;
            }
            
            if (action === WATCH_VALUE) {
                await interactiveWatch();
                continue;
            }

            // Handle main commands
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
            // Handle cancellation gracefully
            if (error?.message?.includes('User force closed') || error?.message?.includes('canceled')) {
                console.log(colors.muted('\n[Cancelled]'));
                await setTimeout(500);
                continue;
            }
            console.log(colors.error(`\n[Error: ${error?.message || 'Unknown error'}]\n`));
            await setTimeout(1000);
        }

        console.log('');
    }
}

async function showDashboard() {
    // Get stats from database
    const history = db.getHistory(5);
    const favorites = db.getFavorites();
    
    console.log(simpleBanner());
    console.log(colors.gray[400]('                              Blockchain Wallet Forensics & Analysis Tool'));
    console.log('\n');
    
    // Provider Status Widget
    const apiKeys = getApiKeys();
    console.log(dashboardWidget('Provider Status', [
        { label: 'Alchemy', value: apiKeys.alchemy ? '[OK] Connected' : '[--] Not Configured' },
        { label: 'Moralis', value: apiKeys.moralis ? '[OK] Connected' : '[--] Optional' },
        { label: 'Dune', value: apiKeys.dune ? '[OK] Connected' : '[--] Optional' },
    ]));
    
    console.log('');
    
    // Recent Activity Widget
    if (history.length > 0) {
        const recentItems = history.slice(0, 3).map(h => ({
            label: h.address.slice(0, 12) + '...',
            value: new Date(h.timestamp * 1000).toLocaleDateString(),
        }));
        
        console.log(dashboardWidget('Recent Activity', recentItems));
        console.log('');
    }
    
    // Quick Stats
    console.log(dashboardWidget('Quick Stats', [
        { label: 'History Items', value: history.length.toString() },
        { label: 'Favorites', value: favorites.length.toString() },
        { label: 'Chains', value: '6' },
    ]));
    
    console.log('\n');
}

async function showHelp() {
    console.clear();
    console.log('\n');
    console.log(glassBox([
        colors.gray[300].bold('FundTracer CLI Commands:'),
        '',
        `${colors.primary('analyze')}     Analyze a single wallet's funding sources`,
        `${colors.primary('compare')}     Compare wallets for Sybil patterns`,
        `${colors.primary('portfolio')}   View NFT collections and token balances`,
        `${colors.primary('batch')}       Analyze multiple wallets from a file`,
        `${colors.primary('watch')}       Monitor a wallet with auto-refresh`,
        `${colors.primary('history')}     View recently analyzed wallets`,
        `${colors.primary('favorites')}   Manage bookmarked wallets`,
        '',
        colors.gray[300].bold('Navigation:'),
        '• Use [Back] to return to previous step',
        '• Use [Cancel] to return to main menu',
        '• Use [Main Menu] from any sub-menu',
    ], 'Help'));
    console.log('\n');
    
    await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: colors.muted('Press Enter to continue...'),
    }]);
}

async function showHistory() {
    const history = db.getHistory(20);
    
    if (history.length === 0) {
        console.log(colors.muted('\nNo history yet. Analyze some wallets first!\n'));
        await setTimeout(1500);
        return;
    }
    
    console.clear();
    console.log(glassBox([], 'Analysis History'));
    console.log('');
    
    const choices: any[] = history.map((h, idx) => ({
        name: `${idx + 1}. ${colors.muted(h.address.slice(0, 16))}... [${h.chain}] - ${new Date(h.timestamp * 1000).toLocaleDateString()}`,
        value: h.address,
        short: h.address,
    }));
    
    choices.push(new inquirer.Separator());
    choices.push(createBackOption());
    choices.push({ name: colors.error('Clear History'), value: '__CLEAR_HISTORY__', short: 'Clear History' });
    
    const { selected } = await inquirer.prompt([{
        type: 'list',
        name: 'selected',
        message: 'Select a wallet to re-analyze:',
        pageSize: 15,
        choices,
    }]);
    
    if (selected === BACK_VALUE) return;
    
    if (selected === '__CLEAR_HISTORY__') {
        const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: colors.error('Clear all history?'),
            default: false,
        }]);
        
        if (confirm) {
            db.clearHistory();
            console.log(colors.success('\nHistory cleared\n'));
            await setTimeout(1000);
        }
        return;
    }
    
    // Re-analyze selected wallet
    await interactiveAnalyzeWithAddress(selected);
}

async function showFavorites() {
    const favorites = db.getFavorites();
    
    console.clear();
    console.log(glassBox([], 'Favorite Wallets'));
    console.log('');
    
    if (favorites.length === 0) {
        console.log(colors.muted('No favorites yet. Add some from the analysis results!\n'));
    } else {
        const choices: any[] = favorites.map((f, idx) => ({
            name: `${idx + 1}. ${colors.primary(f.name || 'Unnamed')} ${colors.muted(f.address.slice(0, 16))}... [${f.chain}]`,
            value: f.address,
            short: f.address,
        }));
        
        choices.push(new inquirer.Separator());
        choices.push(createBackOption());
        
        const { selected } = await inquirer.prompt([{
            type: 'list',
            name: 'selected',
            message: 'Select a favorite:',
            pageSize: 15,
            choices,
        }]);
        
        if (selected === BACK_VALUE) return;
        
        // Analyze selected favorite
        const fav = favorites.find(f => f.address === selected);
        if (fav) {
            await interactiveAnalyzeWithAddress(fav.address, fav.chain);
        }
    }
    
    await setTimeout(500);
}

async function interactiveWatch() {
    console.clear();
    console.log(glassBox([
        colors.primary('Watch Mode'),
        '',
        'Monitor a wallet with automatic refresh every 2 minutes',
        'Press Ctrl+C to stop watching',
    ], 'Watch Mode'));
    console.log('');
    
    // Get address
    let address: string;
    try {
        const result = await inquirer.prompt([{
            type: 'input',
            name: 'value',
            message: 'Enter wallet address to watch:',
            validate: (input) => {
                if (!input) return 'Please enter an address';
                if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                return 'Invalid address format';
            },
        }]);
        address = result.value;
    } catch (e) {
        return;
    }
    
    // Get chain
    const chains = getEnabledChainList();
    let chain: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Select blockchain:',
            choices: [
                ...chains.map(c => ({ name: c.name, value: c.id })),
                createBackOption(),
            ],
        }]);
        
        if (result.value === BACK_VALUE) return;
        chain = result.value;
    } catch (e) {
        return;
    }
    
    console.clear();
    console.log(colors.primary(`\nWatching ${address.slice(0, 12)}... on ${chain}`));
    console.log(colors.muted('Refreshing every 2 minutes. Press Ctrl+C to stop.\n'));
    
    let iteration = 0;
    while (true) {
        iteration++;
        console.log(colors.muted(`\n[${new Date().toLocaleTimeString()}] Update #${iteration}`));
        console.log(colors.muted('─'.repeat(60)));
        
        try {
            await analyzeCommand(address, { chain, depth: '2', output: 'table' });
            db.addToHistory(address, chain, 'watch');
        } catch (e) {
            console.log(colors.error('Failed to fetch update'));
        }
        
        console.log(colors.muted(`\nNext update in 2 minutes...`));
        
        // Countdown
        for (let i = 120; i > 0; i--) {
            process.stdout.write(`\r${colors.muted(`[${Math.floor(i / 60)}:${(i % 60).toString().padStart(2, '0')} remaining... Press Ctrl+C to stop]`)}`);
            await setTimeout(1000);
        }
        console.log('\n');
    }
}

async function interactiveAnalyze() {
    // Get address with history suggestions
    const history = db.getHistory(10);
    const favorites = db.getFavorites();
    
    let address: string;
    
    // Show suggestions first
    if (history.length > 0 || favorites.length > 0) {
        const suggestions: any[] = [
            ...(favorites.length > 0 ? [{ name: colors.primary('From Favorites...'), value: '__FROM_FAVORITES__' }] : []),
            ...(history.length > 0 ? [{ name: colors.primary('From History...'), value: '__FROM_HISTORY__' }] : []),
            { name: colors.success('Enter New Address'), value: '__NEW_ADDRESS__' },
            createBackOption(),
        ];
        
        try {
            const { source } = await inquirer.prompt([{
                type: 'list',
                name: 'source',
                message: 'Select address source:',
                choices: suggestions,
            }]);
            
            if (source === BACK_VALUE) return;
            
            if (source === '__FROM_FAVORITES__') {
                const favs = db.getFavorites();
                const { fav } = await inquirer.prompt([{
                    type: 'list',
                    name: 'fav',
                    message: 'Select favorite:',
                    choices: [
                        ...favs.map(f => ({ name: f.name || f.address, value: f.address })),
                        createBackOption(),
                    ],
                }]);
                if (fav === BACK_VALUE) return interactiveAnalyze();
                address = fav;
            } else if (source === '__FROM_HISTORY__') {
                const hist = db.getHistory(10);
                const { histAddr } = await inquirer.prompt([{
                    type: 'list',
                    name: 'histAddr',
                    message: 'Select from history:',
                    choices: [
                        ...hist.map(h => ({ name: `${h.address.slice(0, 20)}... [${h.chain}]`, value: h.address })),
                        createBackOption(),
                    ],
                }]);
                if (histAddr === BACK_VALUE) return interactiveAnalyze();
                address = histAddr;
            } else {
                // Enter new address
                const result = await inquirer.prompt([{
                    type: 'input',
                    name: 'value',
                    message: 'Enter wallet address:',
                    validate: (input) => {
                        if (!input) return 'Please enter an address';
                        if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                        return 'Invalid address format';
                    },
                }]);
                address = result.value;
            }
        } catch (e) {
            return;
        }
    } else {
        // No history, just ask for address
        try {
            const result = await inquirer.prompt([{
                type: 'input',
                name: 'value',
                message: 'Enter wallet address:',
                validate: (input) => {
                    if (!input) return 'Please enter an address';
                    if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                    return 'Invalid address format';
                },
            }]);
            address = result.value;
        } catch (e) {
            return;
        }
    }
    
    await interactiveAnalyzeWithAddress(address);
}

async function interactiveAnalyzeWithAddress(address: string, defaultChain?: string) {
    const chains = getEnabledChainList();
    
    // Select chain
    let chain: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Select blockchain:',
            default: defaultChain,
            choices: [
                ...chains.map(c => ({ name: c.name, value: c.id })),
                createBackOption(),
                createCancelOption(),
            ],
        }]);
        
        if (result.value === BACK_VALUE) return interactiveAnalyze();
        if (result.value === CANCEL_VALUE) return;
        chain = result.value;
    } catch (e) {
        return;
    }
    
    // Select depth
    let depth: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Analysis depth:',
            choices: [
                { name: colors.muted('1 - Quick scan'), value: '1' },
                { name: colors.muted('2 - Standard'), value: '2' },
                { name: colors.primary('3 - Deep (recommended)'), value: '3' },
                { name: colors.warning('5 - Very deep'), value: '5' },
                createBackOption(),
                createCancelOption(),
            ],
            default: '3',
        }]);
        
        if (result.value === BACK_VALUE) return interactiveAnalyzeWithAddress(address, chain);
        if (result.value === CANCEL_VALUE) return;
        depth = result.value;
    } catch (e) {
        return;
    }
    
    // Select output
    let output: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Output format:',
            choices: [
                { name: colors.primary('Table'), value: 'table' },
                { name: colors.success('Tree'), value: 'tree' },
                { name: colors.warning('JSON'), value: 'json' },
                { name: colors.accent('CSV'), value: 'csv' },
                createBackOption(),
                createCancelOption(),
            ],
        }]);
        
        if (result.value === BACK_VALUE) return interactiveAnalyzeWithAddress(address, chain);
        if (result.value === CANCEL_VALUE) return;
        output = result.value;
    } catch (e) {
        return;
    }
    
    // Ask to add to favorites
    const isFav = db.isFavorite(address);
    if (!isFav) {
        try {
            const { addFav } = await inquirer.prompt([{
                type: 'confirm',
                name: 'addFav',
                message: 'Add to favorites?',
                default: false,
            }]);
            
            if (addFav) {
                const { name } = await inquirer.prompt([{
                    type: 'input',
                    name: 'name',
                    message: 'Name for this wallet:',
                }]);
                db.addFavorite(address, name || undefined, chain);
                console.log(colors.success('Added to favorites\n'));
            }
        } catch (e) {
            // Ignore
        }
    }
    
    console.log();
    await analyzeCommand(address, { 
        chain, 
        depth, 
        output: output as 'table' | 'tree' | 'json' | 'csv' 
    });
    
    // Add to history after successful analysis
    db.addToHistory(address, chain, 'analyze');
}

async function interactivePortfolio() {
    const chains = getEnabledChainList();

    // Get address
    let address: string;
    try {
        const result = await inquirer.prompt([{
            type: 'input',
            name: 'value',
            message: 'Enter wallet address:',
            validate: (input) => {
                if (!input) return 'Please enter an address';
                if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                return 'Invalid address format';
            },
        }]);
        address = result.value;
    } catch (e) {
        return;
    }

    // Select chain
    let chain: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Select blockchain:',
            choices: [
                ...chains.map(c => ({ name: c.name, value: c.id })),
                createBackOption(),
                createCancelOption(),
            ],
        }]);
        
        if (result.value === BACK_VALUE) return interactivePortfolio();
        if (result.value === CANCEL_VALUE) return;
        chain = result.value;
    } catch (e) {
        return;
    }

    // Select what to display
    let views: string[];
    try {
        const result = await inquirer.prompt([{
            type: 'checkbox',
            name: 'value',
            message: 'What to display:',
            choices: [
                { name: colors.primary('Token balances'), value: 'tokens', checked: true },
                { name: colors.accent('NFTs'), value: 'nfts' },
            ],
        }]);
        views = result.value;
    } catch (e) {
        return;
    }

    // Select output format
    let output: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Output format:',
            choices: [
                { name: colors.primary('Table'), value: 'table' },
                { name: colors.warning('JSON'), value: 'json' },
                { name: colors.accent('CSV'), value: 'csv' },
                createBackOption(),
                createCancelOption(),
            ],
        }]);
        
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
    const chains = getEnabledChainList();
    const addresses: string[] = [];

    console.log(colors.muted('\nEnter wallet addresses for Sybil detection\n'));

    // Collect addresses
    while (true) {
        const promptNum = addresses.length + 1;
        
        let action: string;
        try {
            const result = await inquirer.prompt([{
                type: 'list',
                name: 'value',
                message: `Wallet #${promptNum}:`,
                choices: [
                    { name: colors.primary('Enter address'), value: 'enter' },
                    ...(addresses.length >= 2 ? [{ name: colors.success('Continue'), value: 'continue' }] : []),
                    ...(addresses.length > 0 ? [createBackOption()] : []),
                    createCancelOption(),
                ],
            }]);
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
            const result = await inquirer.prompt([{
                type: 'input',
                name: 'value',
                message: `Address #${promptNum}:`,
                validate: (input) => {
                    if (!input) return 'Please enter an address';
                    if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                    return 'Invalid address format';
                },
            }]);
            addresses.push(result.value);
            console.log(colors.success('  Added'));
        } catch (e) {
            return;
        }
    }

    // Select chain
    let chain: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Select blockchain:',
            choices: [
                ...chains.map(c => ({ name: c.name, value: c.id })),
                createBackOption(),
                createCancelOption(),
            ],
        }]);
        
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
    const chains = getEnabledChainList();

    // Get file path
    let filepath: string;
    try {
        const result = await inquirer.prompt([{
            type: 'input',
            name: 'value',
            message: 'Enter path to file with addresses:',
            validate: (input) => {
                if (!input) return 'Please enter a file path';
                return true;
            },
        }]);
        filepath = result.value;
    } catch (e) {
        return;
    }

    // Select chain
    let chain: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Select blockchain:',
            choices: [
                ...chains.map(c => ({ name: c.name, value: c.id })),
                createBackOption(),
                createCancelOption(),
            ],
        }]);
        
        if (result.value === BACK_VALUE) return interactiveBatch();
        if (result.value === CANCEL_VALUE) return;
        chain = result.value;
    } catch (e) {
        return;
    }

    // Select depth
    let depth: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Analysis depth:',
            choices: [
                { name: colors.muted('1 - Quick scan'), value: '1' },
                { name: colors.muted('2 - Standard'), value: '2' },
                { name: colors.primary('3 - Deep'), value: '3' },
                createBackOption(),
                createCancelOption(),
            ],
            default: '2',
        }]);
        
        if (result.value === BACK_VALUE) return interactiveBatch();
        if (result.value === CANCEL_VALUE) return;
        depth = result.value;
    } catch (e) {
        return;
    }

    // Select parallel processing
    let parallel: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Parallel processing:',
            choices: [
                { name: '3 wallets', value: '3' },
                { name: '5 wallets', value: '5' },
                { name: '10 wallets', value: '10' },
                createBackOption(),
                createCancelOption(),
            ],
            default: '5',
        }]);
        
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
        { name: colors.primary('Alchemy'), value: 'alchemy', desc: 'Primary RPC' },
        { name: colors.accent('Moralis'), value: 'moralis', desc: 'Fast Funding' },
        { name: colors.warning('Dune'), value: 'dune', desc: 'Contract Analysis' },
        { name: colors.muted('Etherscan'), value: 'etherscan', desc: 'Ethereum' },
        createCancelOption(),
    ];

    let provider: string;
    try {
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'value',
            message: 'Select provider:',
            choices: providers,
        }]);
        
        if (result.value === CANCEL_VALUE) {
            return;
        }
        provider = result.value;
    } catch (e) {
        return;
    }

    let apiKey: string;
    try {
        const result = await inquirer.prompt([{
            type: 'password',
            name: 'value',
            message: `Enter API key for ${provider}:`,
            mask: '*',
        }]);
        apiKey = result.value;
    } catch (e) {
        return;
    }

    if (apiKey) {
        const { configCommand } = await import('./config.js');
        await configCommand({ setKey: `${provider}:${apiKey}` });
    }
}

// Import needed function
import { getApiKeys } from '../utils.js';
