// ============================================================
// FundTracer CLI - Config Command
// ============================================================

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ChainId, ApiKeyConfig } from 'fundtracer-core';

const CONFIG_DIR = path.join(os.homedir(), '.fundtracer');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// All supported providers
const VALID_PROVIDERS = [
    'alchemy', 'moralis', 'dune',
    'etherscan', 'lineascan', 'arbiscan', 'basescan', 'optimism', 'polygonscan'
] as const;

type ProviderName = typeof VALID_PROVIDERS[number];

interface Config {
    apiKeys: ApiKeyConfig;
    defaultChain: ChainId;
    defaultDepth: number;
}

const DEFAULT_CONFIG: Config = {
    apiKeys: {},
    defaultChain: 'ethereum',
    defaultDepth: 3,
};

interface ConfigOptions {
    setKey?: string;
    show?: boolean;
    reset?: boolean;
}

export async function configCommand(options: ConfigOptions) {
    ensureConfigDir();

    if (options.reset) {
        resetConfig();
        return;
    }

    if (options.setKey) {
        setApiKey(options.setKey);
        return;
    }

    if (options.show) {
        showConfig();
        return;
    }

    // Default: show help
    console.log(chalk.cyan('FundTracer Configuration\n'));
    console.log('Usage:');
    console.log('  fundtracer config --show                   Show current configuration');
    console.log('  fundtracer config --set-key <provider:key> Set API key');
    console.log('  fundtracer config --reset                  Reset to default configuration');
    console.log();
    console.log(chalk.bold('Supported Providers:'));
    console.log(`  ${chalk.green('alchemy')}     - Primary RPC provider (recommended, works for all chains)`);
    console.log(`  ${chalk.green('moralis')}     - Optimized funding lookup (10x faster tracing)`);
    console.log(`  ${chalk.green('dune')}        - Fast contract analysis via SQL`);
    console.log(`  ${chalk.dim('etherscan')}   - Ethereum mainnet explorer API`);
    console.log(`  ${chalk.dim('lineascan')}   - Linea explorer API`);
    console.log(`  ${chalk.dim('arbiscan')}    - Arbitrum explorer API`);
    console.log(`  ${chalk.dim('basescan')}    - Base explorer API`);
    console.log();
    console.log('Examples:');
    console.log('  fundtracer config --set-key alchemy:YOUR_ALCHEMY_KEY');
    console.log('  fundtracer config --set-key moralis:YOUR_MORALIS_KEY');
    console.log('  fundtracer config --set-key dune:YOUR_DUNE_KEY');
    console.log();
    console.log(chalk.bold('Get Free API Keys:'));
    console.log(`  Alchemy:   ${chalk.cyan('https://dashboard.alchemy.com/')}`);
    console.log(`  Moralis:   ${chalk.cyan('https://admin.moralis.io/')}`);
    console.log(`  Dune:      ${chalk.cyan('https://dune.com/settings/api')}`);
    console.log(`  Etherscan: ${chalk.cyan('https://etherscan.io/myapikey')}`);
}

function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

function loadConfig(): Config {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        }
    } catch {
        // Ignore errors, return default
    }
    return DEFAULT_CONFIG;
}

function saveConfig(config: Config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function showConfig() {
    const config = loadConfig();

    console.log(chalk.cyan('FundTracer Configuration\n'));
    console.log(`Config file: ${chalk.dim(CONFIG_FILE)}\n`);

    console.log(chalk.bold('Provider Status:'));
    console.log();

    // Primary providers
    console.log(chalk.dim('  Primary (Recommended):'));
    showKeyStatus('Alchemy', config.apiKeys.alchemy, true);
    showKeyStatus('Moralis', config.apiKeys.moralis, true);
    showKeyStatus('Dune', config.apiKeys.dune, false);

    console.log();
    console.log(chalk.dim('  Explorer APIs (Per-Chain Fallback):'));
    showKeyStatus('Etherscan', config.apiKeys.etherscan, false);
    showKeyStatus('LineaScan', config.apiKeys.lineascan, false);
    showKeyStatus('Arbiscan', config.apiKeys.arbiscan, false);
    showKeyStatus('BaseScan', config.apiKeys.basescan, false);

    console.log();
    console.log(chalk.bold('Defaults:'));
    console.log(`  Default Chain: ${config.defaultChain}`);
    console.log(`  Default Depth: ${config.defaultDepth}`);

    // Tips
    const hasAlchemy = !!config.apiKeys.alchemy;
    const hasMoralis = !!config.apiKeys.moralis;
    const hasDune = !!config.apiKeys.dune;

    console.log();
    console.log(chalk.bold('Tips:'));
    if (!hasAlchemy) {
        console.log(chalk.yellow('  ⚠ Alchemy not configured - this is required for most operations'));
        console.log(chalk.dim('    Run: fundtracer config --set-key alchemy:YOUR_KEY'));
    }
    if (!hasMoralis) {
        console.log(chalk.dim('  💡 Add Moralis for 10x faster funding source tracing'));
    }
    if (!hasDune) {
        console.log(chalk.dim('  💡 Add Dune for faster contract analysis'));
    }
    if (hasAlchemy && hasMoralis && hasDune) {
        console.log(chalk.green('  ✓ All recommended providers configured!'));
    }
}

function showKeyStatus(name: string, key: string | undefined, isRecommended: boolean) {
    const pad = name.padEnd(12);
    if (key) {
        const masked = key.slice(0, 4) + '...' + key.slice(-4);
        console.log(`  ${chalk.green('✓')} ${pad} ${chalk.dim(masked)}`);
    } else if (isRecommended) {
        console.log(`  ${chalk.red('✗')} ${pad} ${chalk.dim('Not configured')}`);
    } else {
        console.log(`  ${chalk.dim('○')} ${pad} ${chalk.dim('Not configured (optional)')}`);
    }
}

function setApiKey(keyString: string) {
    const colonIndex = keyString.indexOf(':');
    if (colonIndex === -1) {
        console.error(chalk.red('✗ Invalid format. Use: --set-key <provider>:<api_key>'));
        console.log(chalk.dim('Example: fundtracer config --set-key alchemy:abc123xyz'));
        process.exit(1);
    }

    const provider = keyString.slice(0, colonIndex).toLowerCase();
    const key = keyString.slice(colonIndex + 1);

    if (!key) {
        console.error(chalk.red('✗ API key cannot be empty'));
        process.exit(1);
    }

    if (!VALID_PROVIDERS.includes(provider as ProviderName)) {
        console.error(chalk.red(`✗ Invalid provider: ${provider}`));
        console.log(chalk.dim(`Valid providers: ${VALID_PROVIDERS.join(', ')}`));
        process.exit(1);
    }

    const config = loadConfig();
    (config.apiKeys as any)[provider] = key;
    saveConfig(config);

    console.log(chalk.green(`✓ API key for ${provider} saved successfully`));

    // Show helpful next steps
    if (provider === 'alchemy') {
        console.log(chalk.dim('\nYou can now analyze wallets:'));
        console.log(chalk.cyan('  fundtracer analyze 0x...'));
    }
}

function resetConfig() {
    saveConfig(DEFAULT_CONFIG);
    console.log(chalk.green('✓ Configuration reset to defaults'));
}

