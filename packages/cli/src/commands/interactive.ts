/**
 * FundTracer CLI - Interactive Mode (Simplified)
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ChainId, getEnabledChainList } from 'fundtracer-core';
import { analyzeCommand } from './analyze.js';
import { db } from '../database.js';

const c = {
    bold: chalk.bold,
    green: chalk.green,
    red: chalk.red,
    yellow: chalk.yellow,
    cyan: chalk.cyan,
    gray: chalk.gray,
};

const SUPPORTED_CHAINS = ['ethereum', 'linea', 'arbitrum', 'base', 'optimism', 'polygon'];

export async function interactiveMode() {
    console.log(c.bold('\n🔍 FundTracer CLI\n'));

    while (true) {
        try {
            const { action } = await inquirer.prompt([{
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: 'Analyze Wallet', value: 'analyze' },
                    { name: 'View History', value: 'history' },
                    { name: 'View Favorites', value: 'favorites' },
                    { name: 'Configuration', value: 'config' },
                    { name: 'Exit', value: 'exit' },
                ],
            }]);

            if (action === 'exit') {
                console.log(c.gray('\nGoodbye!\n'));
                break;
            }

            if (action === 'analyze') {
                await runAnalyze();
            } else if (action === 'history') {
                await showHistory();
            } else if (action === 'favorites') {
                await showFavorites();
            } else if (action === 'config') {
                await showConfig();
            }

        } catch (e: any) {
            if (e.isTtyError) {
                console.log(c.red('Error: Terminal not supported'));
                break;
            }
            if (e.message === 'User force closed' || e.message === 'canceled') {
                console.log(c.gray('\nCancelled\n'));
                continue;
            }
            console.log(c.red('Error: ' + e.message));
        }
    }
}

async function runAnalyze() {
    // Get address
    const history = db.getHistory(10);
    const favorites = db.getFavorites();

    let address: string;
    const choices: any = [];

    if (favorites.length > 0) {
        choices.push(new inquirer.Separator(c.gray('Favorites')));
        favorites.forEach((f: any) => {
            choices.push({ name: `${f.name || f.address.slice(0, 14)}...`, value: f.address });
        });
    }

    if (history.length > 0) {
        choices.push(new inquirer.Separator(c.gray('Recent')));
        history.slice(0, 5).forEach((h: any) => {
            choices.push({ name: `${h.address.slice(0, 14)}... [${h.chain}]`, value: h.address });
        });
    }

    choices.push(new inquirer.Separator());
    choices.push({ name: c.green('Enter new address'), value: '__NEW__' });

    const { source } = await inquirer.prompt([{
        type: 'list',
        name: 'source',
        message: 'Select wallet:',
        choices,
    }]);

    if (source === '__NEW__') {
        const { addr } = await inquirer.prompt([{
            type: 'input',
            name: 'addr',
            message: 'Wallet address (0x...):',
            validate: (input: string) => {
                if (/^0x[a-fA-F0-9]{40}$/.test(input)) return true;
                return 'Invalid EVM address';
            },
        }]);
        address = addr;
    } else {
        address = source;
    }

    // Get chain
    const { chain } = await inquirer.prompt([{
        type: 'list',
        name: 'chain',
        message: 'Blockchain:',
        default: 0,
        choices: SUPPORTED_CHAINS.map(c => ({ name: c.charAt(0).toUpperCase() + c.slice(1), value: c })),
    }]);

    // Get depth
    const { depth } = await inquirer.prompt([{
        type: 'list',
        name: 'depth',
        message: 'Analysis depth:',
        default: 1,
        choices: [
            { name: '1 - Quick', value: '1' },
            { name: '2 - Standard', value: '2' },
            { name: '3 - Deep', value: '3' },
        ],
    }]);

    // Get output
    const { output } = await inquirer.prompt([{
        type: 'list',
        name: 'output',
        message: 'Output format:',
        default: 0,
        choices: [
            { name: 'Table', value: 'table' },
            { name: 'JSON', value: 'json' },
            { name: 'Tree', value: 'tree' },
            { name: 'CSV', value: 'csv' },
        ],
    }]);

    console.log('');

    // Run analysis
    try {
        await analyzeCommand(address, {
            chain,
            depth,
            output: output as any,
        });

        // Save to history
        db.addToHistory(address, chain, 'analyze');

    } catch (e: any) {
        console.log(c.red('Error: ' + e.message));
    }
}

async function showHistory() {
    const history = db.getHistory(20);

    if (history.length === 0) {
        console.log(c.gray('\nNo history yet\n'));
        return;
    }

    console.log(c.bold('\n📜 History\n'));
    history.forEach((h: any, i: number) => {
        const date = new Date(h.timestamp * 1000).toLocaleDateString();
        console.log(`  ${i + 1}. ${h.address.slice(0, 18)}...  [${h.chain}]  ${c.gray(date)}`);
    });
    console.log('');
}

async function showFavorites() {
    const favorites = db.getFavorites();

    if (favorites.length === 0) {
        console.log(c.gray('\nNo favorites yet\n'));
        return;
    }

    console.log(c.bold('\n⭐ Favorites\n'));
    favorites.forEach((f: any, i: number) => {
        console.log(`  ${i + 1}. ${f.name || f.address}  [${f.chain}]`);
    });
    console.log('');
}

async function showConfig() {
    const { showApiKeys } = await inquirer.prompt([{
        type: 'list',
        name: 'showApiKeys',
        message: 'Configuration:',
        choices: [
            { name: 'View API Keys', value: 'view' },
            { name: 'Set Alchemy Key', value: 'alchemy' },
            { name: 'Back', value: 'back' },
        ],
    }]);

    if (showApiKeys === 'view') {
        const { getApiKeys } = await import('../utils.js');
        const keys = getApiKeys();
        console.log(c.bold('\n⚙️ API Keys\n'));
        console.log(`  Alchemy:  ${keys.alchemy ? c.green('Configured') : c.red('Not set')}`);
        console.log(`  Moralis:  ${keys.moralis ? c.green('Configured') : c.gray('Optional')}`);
        console.log(`  Dune:     ${keys.dune ? c.green('Configured') : c.gray('Optional')}`);
        console.log('');
    } else if (showApiKeys === 'alchemy') {
        console.log(c.gray('\nTo set API key, run:'));
        console.log(c.cyan('  fundtracer config --set-key alchemy:YOUR_KEY\n'));
    }
}
