/**
 * FundTracer Telegram Bot
 * Wallet alerts, scanning, and contract analysis via Telegram
 */

import fetch from 'node-fetch';
import { Telegraf, Markup } from 'telegraf';

(globalThis as any).fetch = fetch;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

interface WatchedWallet {
    address: string;
    chain: string;
    addedAt: number;
    lastAlert?: number;
}

interface LinkedUser {
    userId: string;
    telegramId: number;
    tier: 'free' | 'pro' | 'max';
    walletAddress: string; // Connected wallet address
    watches: WatchedWallet[];
    alertFrequency: 'realtime' | '20min' | '30min' | '1hr';
    linkedAt: number;
    step?: string;
    pendingCode?: string;
    pendingAddress?: string;
}

interface PendingCode {
    code: string;
    userId: string;
    tier: string;
    walletAddress: string; // Wallet address from site
    expiresAt: number;
}

// Track users waiting to enter link code (before they're linked)
const pendingLinkUsers: Map<number, { step: string }> = new Map();

const chains = ['ethereum', 'linea', 'arbitrum', 'base', 'optimism', 'polygon'];
const chainEmojis: Record<string, string> = {
    ethereum: '🔷', linea: '⚫', arbitrum: '🔵', base: '🔵', optimism: '🔴', polygon: '🟣'
};
const chainExplorers: Record<string, string> = {
    ethereum: 'https://etherscan.io',
    polygon: 'https://polygonscan.com',
    arbitrum: 'https://arbiscan.io',
    optimism: 'https://optimistic.etherscan.io',
    base: 'https://basescan.org',
    linea: 'https://lineascan.build'
};

let bot: any = null;
let analyzer: any = null;
let webhookHandler: any = null;

export function getTelegramWebhookHandler() {
    return webhookHandler;
}

const DATA_FILE = process.env.DATA_FILE || './data/telegram-bot.json';

function ensureDataDir() {
    const fs = require('fs');
    const dir = require('path').dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function loadData(): { linkedUsers: Record<string, any>, pendingCodes: Record<string, any> } {
    try {
        const fs = require('fs');
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[Telegram] Failed to load data:', e);
    }
    return { linkedUsers: {}, pendingCodes: {} };
}

function saveData(data: { linkedUsers: Record<string, any>, pendingCodes: Record<string, any> }) {
    try {
        const fs = require('fs');
        ensureDataDir();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[Telegram] Failed to save data:', e);
    }
}

let linkedUsers: Map<number, LinkedUser>;
let pendingCodes: Map<string, PendingCode>;

function initializeData() {
    const data = loadData();
    linkedUsers = new Map(Object.entries(data.linkedUsers).map(([k, v]) => [parseInt(k), v as LinkedUser]));
    pendingCodes = new Map(Object.entries(data.pendingCodes).map(([k, v]) => [k, v as PendingCode]));
    
    setInterval(() => {
        const dataToSave = {
            linkedUsers: Object.fromEntries(linkedUsers),
            pendingCodes: Object.fromEntries(pendingCodes)
        };
        saveData(dataToSave);
    }, 30000);
}

async function getAnalyzer() {
    if (!analyzer) {
        const { WalletAnalyzer } = await import('fundtracer-core');
        analyzer = new WalletAnalyzer({
            alchemy: process.env.DEFAULT_ALCHEMY_API_KEY,
            moralis: process.env.MORALIS_API_KEY,
        });
    }
    return analyzer;
}

export async function createTelegramBot() {
    initializeData();
    
    if (!BOT_TOKEN) {
        console.log('[Telegram] Bot token not configured, skipping...');
        return null;
    }

    const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

    try {
        bot = new Telegraf(BOT_TOKEN);

        // Register commands FIRST before starting
        registerBotCommands();

        if (WEBHOOK_URL) {
            // Use webhook mode
            const webhookPath = '/telegram-webhook';
            
            await bot.telegram.setWebhook(`${WEBHOOK_URL}${webhookPath}`);
            
            // Store the webhook handler - will be called by index.ts route
            webhookHandler = bot.webhookCallback(webhookPath);
            
            console.log(`[Telegram] Bot started with webhook: ${WEBHOOK_URL}${webhookPath}`);
        } else {
            // Fallback to polling (will fail on Node 22 but logs error)
            await bot.launch();
            console.log('[Telegram] Bot started with polling');
        }

        return bot;
    } catch (error) {
        console.error('[Telegram] Failed to start:', error);
        return null;
    }
}

function registerBotCommands() {
    // /start - Welcome message
    bot.start(async (ctx: any) => {
        const linkedUser = linkedUsers.get(ctx.from.id);
        if (linkedUser) {
            await showDashboard(ctx, linkedUser);
        } else {
            await ctx.reply(
                '👋 *Welcome to FundTracer!*\n\n' +
                'Get wallet alerts and AI analysis on Telegram.\n\n' +
                '🔗 *Setup:*\n' +
                '1. Go to fundtracer.xyz → Profile\n' +
                '2. Click "Connect Telegram"\n' +
                '3. Enter the code here\n\n' +
                'Or use /scan to try a quick wallet analysis!',
                { parse_mode: 'Markdown' }
            );
        }
    });

    // /help - Show commands
    bot.command('help', async (ctx: any) => {
        await ctx.reply(
            '📚 *Commands*\n\n' +
            '🔗 *Account*\n' +
            '/link - Connect FundTracer account\n' +
            '/unlink - Disconnect account\n\n' +
            '👀 *Watchlist*\n' +
            '/add - Add wallet to watch\n' +
            '/list - View watched wallets\n' +
            '/remove - Remove wallet\n\n' +
            '🔍 *Analysis*\n' +
            '/scan <address> - Quick wallet scan\n' +
            '/contract <address> [chain] - Scan contract\n\n' +
            '🤖 *AI Assistant*\n' +
            '/ask <question> - Ask anything\n' +
            '/history - View scan history\n\n' +
            '⚙️ *Settings*\n' +
            '/frequency - Set alert frequency\n' +
            '/status - View status',
            { parse_mode: 'Markdown' }
        );
    });

        // /link - Connect account
        bot.command('link', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (linkedUser) {
                await ctx.reply(
                    '✅ *Already Linked!*\n\n' +
                    `Wallet: \`${linkedUser.walletAddress.slice(0, 8)}...${linkedUser.walletAddress.slice(-4)}\`\n` +
                    `Plan: ${linkedUser.tier.toUpperCase()}\n\n` +
                    'Use /unlink to disconnect first if you want to link a different account.',
                    { parse_mode: 'Markdown' }
                );
                return;
            }
            
            // Set user step to awaiting link code
            pendingLinkUsers.set(ctx.from.id, { step: 'awaiting_link_code' });
            
            await ctx.reply(
                '🔗 *Connect Your Account*\n\n' +
                '*Step 1:* Go to fundtracer.xyz/telegram\n' +
                '*Step 2:* Connect your wallet\n' +
                '*Step 3:* Generate a link code\n' +
                '*Step 4:* Paste the code here\n\n' +
                '⏳ Waiting for your code...',
                { parse_mode: 'Markdown' }
            );
        });

        // Handle link callback (for button clicks - legacy)
        bot.action(/link_(.+)/, async (ctx: any) => {
            const code = ctx.match![1];
            await processLinkCode(ctx, code, true);
        });

        // /scan - Quick wallet analysis (requires linked account)
        bot.command('scan', async (ctx: any) => {
            const linkedUser = await requireLinkedAccount(ctx);
            if (!linkedUser) return;

            const args = ctx.message.text.split(' ').slice(1);
            const address = args[0];
            const chain = args[1]?.toLowerCase();

            if (!address) {
                await ctx.reply(
                    '🔍 */scan* - Analyze a wallet\n\n' +
                    '*Usage:* `/scan <address> [chain]`\n\n' +
                    '*Chains:* ethereum, linea, arbitrum, base, optimism, polygon\n\n' +
                    '*Examples:*\n' +
                    '`/scan 0x742d...eB1e`\n' +
                    '`/scan 0x742d...eB1e linea`',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                await ctx.reply('❌ Invalid address format. Must be 0x followed by 40 hex characters.');
                return;
            }

            // If no chain specified, show chain selection buttons
            if (!chain) {
                linkedUser.pendingAddress = address.toLowerCase();
                linkedUser.step = 'select_scan_chain';

                const buttons = chains.map(c => 
                    Markup.button.callback(`${chainEmojis[c] || '🔗'} ${c.charAt(0).toUpperCase() + c.slice(1)}`, `scan_chain_${c}`)
                );
                
                // Arrange buttons in 2 columns
                const buttonRows = [];
                for (let i = 0; i < buttons.length; i += 2) {
                    buttonRows.push(buttons.slice(i, i + 2));
                }

                await ctx.reply(
                    `🔍 *Select Chain*\n\nAddress: \`${address.slice(0, 10)}...${address.slice(-4)}\`\n\nWhich chain do you want to scan on?`,
                    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttonRows) }
                );
                return;
            }

            // Validate chain
            if (!chains.includes(chain)) {
                await ctx.reply(`❌ Unknown chain: ${chain}\n\nSupported: ${chains.join(', ')}`);
                return;
            }

            await performScan(ctx, linkedUser, address.toLowerCase(), chain);
        });

        // Handle scan chain selection
        bot.action(/scan_chain_(.+)/, async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (!linkedUser || !linkedUser.pendingAddress || linkedUser.step !== 'select_scan_chain') {
                await ctx.answerCbQuery('Session expired. Use /scan again.');
                return;
            }

            const chain = ctx.match![1];
            const address = linkedUser.pendingAddress;
            
            linkedUser.step = '';
            linkedUser.pendingAddress = undefined;

            await ctx.editMessageText(`🔍 *Scanning wallet on ${chain.toUpperCase()}...*\n\nThis will take ~10 seconds.`, { parse_mode: 'Markdown' });
            await performScan(ctx, linkedUser, address, chain);
        });

        // /contract - Contract analysis (requires linked account)
        bot.command('contract', async (ctx: any) => {
            const linkedUser = await requireLinkedAccount(ctx);
            if (!linkedUser) return;

            const args = ctx.message.text.split(' ').slice(1);
            const address = args[0];
            const chain = args[1] || 'ethereum';

            if (!address) {
                await ctx.reply(
                    '📄 /contract <address> [chain] - Analyze a smart contract\n\n' +
                    'Chains: ethereum, polygon, arbitrum, optimism, base, linea\n' +
                    'Example: /contract 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ethereum',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                await ctx.reply('❌ Invalid contract address');
                return;
            }

            if (!chains.includes(chain.toLowerCase())) {
                await ctx.reply(`❌ Unknown chain. Use: ${chains.join(', ')}`);
                return;
            }

            await ctx.reply('📄 *Analyzing contract...*', { parse_mode: 'Markdown' });

            try {
                const wa = await getAnalyzer();
                const code = await wa.getProvider(chain.toLowerCase()).getCode(address.toLowerCase());

                if (code === '0x' || !code) {
                    await ctx.reply('❌ Not a contract (no code found)');
                    return;
                }

                const codeLength = code.length;
                const isProxy = code.includes('delegatecall') || code.includes('proxy');
                const hasSelfDestruct = code.includes('selfdestruct') || code.includes('suicide');
                const hasMint = code.includes('mint') || code.includes('Minter');

                let msg = `📄 *Contract Analysis*\n\n`;
                msg += `Address: \`${address.slice(0, 10)}...${address.slice(-4)}\`\n`;
                msg += `Chain: ${chain.toUpperCase()}\n\n`;
                msg += `📏 Code Size: ${(codeLength / 2).toLocaleString()} bytes\n`;
                msg += `${isProxy ? '⚠️  Proxy contract\n' : '✅ Not a proxy\n'}`;
                msg += `${hasSelfDestruct ? '⚠️  Has self-destruct\n' : '✅ No self-destruct\n'}`;
                msg += `${hasMint ? '⚠️  Has mint function\n' : '✅ No mint\n'}`;

                if (hasSelfDestruct || isProxy) {
                    msg += `\n⚠️ *Warning:* This contract has potentially dangerous functions. Do your own research!`;
                }

                await ctx.reply(msg, { parse_mode: 'Markdown' });

            } catch (e: any) {
                await ctx.reply(`❌ Analysis failed: ${e.message}`);
            }
        });

        // /add - Add wallet to watchlist
        bot.command('add', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);

            if (!linkedUser) {
                await ctx.reply(
                    '⚠️ *Account Not Linked*\n\n' +
                    '1. Go to fundtracer.xyz → Profile\n' +
                    '2. Click "Connect Telegram"\n' +
                    '3. Enter the code shown',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            const maxWallets = linkedUser.tier === 'free' ? 10 : linkedUser.tier === 'pro' ? 100 : 1000;
            if (linkedUser.watches.length >= maxWallets) {
                await ctx.reply(`❌ Wallet limit reached (${maxWallets})\n\nUpgrade your plan for more.`);
                return;
            }

            linkedUser.step = 'awaiting_address';
            await ctx.reply(
                '📝 *Add Wallet*\n\nEnter wallet address (0x...)',
                { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
            );
        });

        // Handle text input (link codes and wallet addresses)
        bot.on('message', async (ctx: any, next: () => Promise<void>) => {
            if (!ctx.message || !('text' in ctx.message)) return next();
            const text = ctx.message.text.trim();
            if (text.startsWith('/')) return next();

            const telegramId = ctx.from.id;
            
            // Check if user is waiting to enter a link code
            const pendingLink = pendingLinkUsers.get(telegramId);
            if (pendingLink && pendingLink.step === 'awaiting_link_code') {
                // Try to process as link code (codes are 6 chars uppercase alphanumeric)
                if (/^[A-Z0-9]{6}$/.test(text.toUpperCase())) {
                    await processLinkCode(ctx, text.toUpperCase(), false);
                    return;
                } else {
                    await ctx.reply(
                        '❌ Invalid code format.\n\n' +
                        'Link codes are 6 characters (e.g., ABC123).\n' +
                        'Get your code at fundtracer.xyz/telegram',
                        { parse_mode: 'Markdown' }
                    );
                    return;
                }
            }

            // Check if linked user is in a step
            const linkedUser = linkedUsers.get(telegramId);
            if (!linkedUser || !linkedUser.step) return next();

            if (linkedUser.step === 'awaiting_address') {
                if (!/^0x[a-fA-F0-9]{40}$/.test(text)) {
                    await ctx.reply('❌ Invalid address format. Must start with 0x followed by 40 hex characters.');
                    return;
                }

                linkedUser.pendingAddress = text.toLowerCase();
                linkedUser.step = 'select_chain';

                const buttons = chains.map(c =>
                    Markup.button.callback(c.charAt(0).toUpperCase() + c.slice(1), `chain_${c}`)
                );

                await ctx.reply('Select blockchain:', Markup.inlineKeyboard(buttons));
            }
        });

        // Chain selection
        bot.action(/chain_(.+)/, async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (!linkedUser || !linkedUser.pendingAddress) return;

            const chain = ctx.match![1];
            linkedUser.watches.push({
                address: linkedUser.pendingAddress,
                chain: chain,
                addedAt: Date.now()
            });

            const emoji = chainEmojis[chain] || '🔗';
            linkedUser.step = '';
            linkedUser.pendingAddress = undefined;

            await ctx.editMessageText(
                `✅ *Wallet Added*\n\n${emoji} ${chain.toUpperCase()}\n\`${linkedUser.watches[linkedUser.watches.length - 1].address.slice(0, 12)}...\``,
                { parse_mode: 'Markdown' }
            );
        });

        // /list - List wallets
        bot.command('list', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (!linkedUser) {
                await ctx.reply('Use /link first');
                return;
            }

            if (linkedUser.watches.length === 0) {
                await ctx.reply('No wallets. Use /add to add one.');
                return;
            }

            let msg = '📋 *Watched Wallets*\n\n';
            linkedUser.watches.forEach((w, i) => {
                msg += `${i + 1}. \`${w.address.slice(0, 10)}...${w.address.slice(-4)}\`\n`;
                msg += `   ${chainEmojis[w.chain] || '🔗'} ${w.chain.toUpperCase()}\n\n`;
            });

            const limit = linkedUser.tier === 'free' ? 10 : linkedUser.tier === 'pro' ? 100 : '∞';
            msg += `Limit: ${linkedUser.watches.length}/${limit}`;

            await ctx.reply(msg, { parse_mode: 'Markdown' });
        });

        // /remove - Remove wallet
        bot.command('remove', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (!linkedUser || linkedUser.watches.length === 0) {
                await ctx.reply('No wallets to remove.');
                return;
            }

            const buttons = linkedUser.watches.map((w, i) =>
                [Markup.button.callback(
                    `${w.address.slice(0, 8)}...${w.address.slice(-4)} (${w.chain})`,
                    `remove_${i}`
                )]
            );

            await ctx.reply('❌ *Remove Wallet*\n\nSelect:',
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
            );
        });

        bot.action(/remove_(\d+)/, async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            const index = parseInt(ctx.match![1]);

            if (linkedUser && linkedUser.watches[index]) {
                linkedUser.watches.splice(index, 1);
                await ctx.editMessageText('✅ Wallet removed');
            }
        });

        // /frequency - Set alert frequency
        bot.command('frequency', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (!linkedUser) {
                await ctx.reply('Use /link first');
                return;
            }

            await ctx.reply('⏰ *Alert Frequency*',
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('⚡ Real-time', 'freq_realtime'),
                        Markup.button.callback('🕐 20 min', 'freq_20min'),
                    ],
                    [
                        Markup.button.callback('🕒 30 min', 'freq_30min'),
                        Markup.button.callback('🕓 1 hour', 'freq_1hr'),
                    ]
                ])}
            );
        });

        bot.action(/freq_(.+)/, async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (linkedUser) {
                linkedUser.alertFrequency = ctx.match![1] as any;
                await ctx.editMessageText(`✅ Frequency set to ${ctx.match![1]}`);
            }
        });

        // /status - View status
        bot.command('status', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (!linkedUser) {
                await ctx.reply('Use /link first');
                return;
            }

            await ctx.reply(
                '📊 *Status*\n\n' +
                `Plan: ${linkedUser.tier.toUpperCase()}\n` +
                `Wallets: ${linkedUser.watches.length}\n` +
                `Frequency: ${linkedUser.alertFrequency}`,
                { parse_mode: 'Markdown' }
            );
        });

        // /unlink - Disconnect
        bot.command('unlink', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (linkedUser) {
                linkedUsers.delete(ctx.from.id);
                await ctx.reply('✅ Account unlinked. Use /link to connect again.');
            } else {
                await ctx.reply('No account linked.');
            }
        });

        // /ask - Ask AI about wallets, transactions, crypto (requires linked account)
        bot.command(['ask', 'ai'], async (ctx: any) => {
            const linkedUser = await requireLinkedAccount(ctx);
            if (!linkedUser) return;

            const args = ctx.message.text.split(' ').slice(1);
            const question = args.join(' ');

            if (!question) {
                await ctx.reply(
                    '🤖 *Ask AI*\n\nAsk me anything about wallets, transactions, or crypto.\n\n' +
                    'Examples:\n' +
                    '• "What is this wallet doing?"\n' +
                    '• "Is this transaction suspicious?"\n' +
                    '• "Explain what the contract does"\n\n' +
                    'You can also ask about your watched wallets!',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            await ctx.reply('🤖 *Thinking...*', { parse_mode: 'Markdown' });

            let context = '';
            if (linkedUser.watches.length > 0) {
                const wallets = linkedUser.watches.map(w => 
                    `${w.address.slice(0, 10)}...${w.address.slice(-4)} (${w.chain})`
                ).join(', ');
                context = `User is watching these wallets: ${wallets}. User's plan: ${linkedUser.tier}`;
            }

            const answer = await askAI(question, context);
            
            await ctx.reply(
                `🤖 *Answer*\n\n${answer}`,
                { parse_mode: 'Markdown' }
            );
        });

        // /history - Get recent scan history (requires linked account)
        bot.command('history', async (ctx: any) => {
            const linkedUser = await requireLinkedAccount(ctx);
            if (!linkedUser) return;

            const fs = require('fs');
            const historyFile = process.env.DATA_FILE 
                ? process.env.DATA_FILE.replace('telegram-bot.json', 'history.json')
                : './data/history.json';

            try {
                if (fs.existsSync(historyFile)) {
                    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
                    const userHistory = history[linkedUser.userId] || [];
                    
                    if (userHistory.length === 0) {
                        await ctx.reply('📊 *Scan History*\n\nNo scan history yet. Use /scan to analyze wallets!',
                            { parse_mode: 'Markdown' }
                        );
                        return;
                    }

                    const recent = userHistory.slice(-5).reverse();
                    let msg = '📊 *Recent Scans*\n\n';
                    
                    for (const scan of recent) {
                        const date = new Date(scan.timestamp).toLocaleDateString();
                        msg += `• \`${scan.address.slice(0, 10)}...${scan.address.slice(-4)}\`\n`;
                        msg += `  ${scan.chain} • ${date}\n\n`;
                    }

                    await ctx.reply(msg, { parse_mode: 'Markdown' });
                } else {
                    await ctx.reply('📊 *Scan History*\n\nNo scan history yet. Use /scan to analyze wallets!',
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (e) {
                await ctx.reply('📊 *Scan History*\n\nNo scan history available.',
                    { parse_mode: 'Markdown' }
                );
            }
        });

    // Handle natural language messages when user is in AI mode
    bot.on('message', async (ctx: any, next: () => Promise<void>) => {
        if (!ctx.message || !('text' in ctx.message)) return next();
        const text = ctx.message.text;
        if (text.startsWith('/')) return next();

        const linkedUser = linkedUsers.get(ctx.from.id);
        if (!linkedUser || linkedUser.step !== 'ai_mode') return next();

        linkedUser.step = '';
        await ctx.reply('🤖 *Thinking...*', { parse_mode: 'Markdown' });

        let context = '';
        if (linkedUser.watches.length > 0) {
            const wallets = linkedUser.watches.map(w => 
                `${w.address.slice(0, 10)}...${w.address.slice(-4)} (${w.chain})`
            ).join(', ');
            context = `User is watching: ${wallets}`;
        }

        const answer = await askAI(text, context);
        await ctx.reply(answer);
    });
}

// === HELPER FUNCTIONS ===

function saveScanHistory(userId: string, address: string, chain: string, riskScore: number) {
    const fs = require('fs');
    const historyFile = process.env.DATA_FILE 
        ? process.env.DATA_FILE.replace('telegram-bot.json', 'history.json')
        : './data/history.json';
    
    try {
        let history: Record<string, any[]> = {};
        if (fs.existsSync(historyFile)) {
            history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
        
        if (!history[userId]) {
            history[userId] = [];
        }
        
        history[userId].push({
            address,
            chain,
            riskScore,
            timestamp: Date.now()
        });
        
        if (history[userId].length > 100) {
            history[userId] = history[userId].slice(-100);
        }
        
        const dir = require('path').dirname(historyFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (e) {
        console.error('[Telegram] Failed to save scan history:', e);
    }
}

// Perform wallet scan on specified chain
async function performScan(ctx: any, linkedUser: LinkedUser, address: string, chain: string) {
    try {
        const wa = await getAnalyzer();
        const result = await wa.analyze(address, chain, {});

        const risk = result.riskLevel || 'unknown';
        const riskEmoji = risk === 'low' ? '✅' : risk === 'medium' ? '⚠️' : '❌';
        const chainEmoji = chainEmojis[chain] || '🔗';
        const nativeToken = chain === 'ethereum' ? 'ETH' : chain === 'polygon' ? 'MATIC' : 'ETH';

        let msg = `📊 *Scan Result*\n\n`;
        msg += `Address: \`${address.slice(0, 10)}...${address.slice(-4)}\`\n`;
        msg += `${chainEmoji} Chain: ${chain.toUpperCase()}\n\n`;
        msg += `${riskEmoji} *Risk Level:* ${risk.toUpperCase()} (${result.overallRiskScore || 0}/100)\n`;
        msg += `💰 Balance: ${result.wallet?.balanceInEth?.toFixed(4) || '0'} ${nativeToken}\n`;
        msg += `📝 Transactions: ${result.summary?.totalTransactions || 0}\n`;

        if (result.summary?.topFundingSources?.length > 0) {
            msg += `\n📥 *Top Funder:*\n`;
            const top = result.summary.topFundingSources[0];
            msg += `\`${top.address.slice(0, 12)}...\`\n`;
            msg += `+${top.valueEth?.toFixed(4)} ${nativeToken}\n`;
        }

        msg += `\n🔗 [View Full Report](https://fundtracer.xyz/app-evm?address=${address}&chain=${chain})`;

        await ctx.reply(msg, { parse_mode: 'Markdown' });

        saveScanHistory(linkedUser.userId, address, chain, result.overallRiskScore || 0);

    } catch (e: any) {
        await ctx.reply(`❌ Scan failed: ${e.message}`);
    }
}

// Process link code - used by both text input and button callback
async function processLinkCode(ctx: any, code: string, isButtonCallback: boolean) {
    const pending = pendingCodes.get(code.toUpperCase());
    const telegramId = ctx.from.id;

    if (!pending || pending.expiresAt < Date.now()) {
        const msg = '❌ Link code expired or invalid.\n\nGo to fundtracer.xyz/telegram to generate a new code.';
        if (isButtonCallback) {
            await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply(msg, { parse_mode: 'Markdown' });
        }
        return;
    }

    // Link the user
    linkedUsers.set(telegramId, {
        userId: pending.userId,
        telegramId: telegramId,
        tier: pending.tier as any,
        walletAddress: pending.walletAddress,
        watches: [],
        alertFrequency: 'realtime',
        linkedAt: Date.now()
    });

    pendingCodes.delete(code.toUpperCase());
    pendingLinkUsers.delete(telegramId);

    const successMsg = 
        '✅ *Account Linked!*\n\n' +
        `Wallet: \`${pending.walletAddress.slice(0, 8)}...${pending.walletAddress.slice(-4)}\`\n` +
        `Plan: ${pending.tier.toUpperCase()}\n\n` +
        'You now have access to all bot features!\n\n' +
        'Try /scan to analyze a wallet or /add to watch one.';

    if (isButtonCallback) {
        await ctx.editMessageText(successMsg, { parse_mode: 'Markdown' });
    } else {
        await ctx.reply(successMsg, { parse_mode: 'Markdown' });
    }
}

// Helper to check if user needs to link account first
async function requireLinkedAccount(ctx: any): Promise<LinkedUser | null> {
    const linkedUser = linkedUsers.get(ctx.from.id);
    if (!linkedUser) {
        await ctx.reply(
            '🔒 *Account Required*\n\n' +
            'You need to link your FundTracer account to use this feature.\n\n' +
            '1. Go to fundtracer.xyz/telegram\n' +
            '2. Connect your wallet\n' +
            '3. Generate a link code\n' +
            '4. Send /link here and enter the code',
            { parse_mode: 'Markdown' }
        );
        return null;
    }
    return linkedUser;
}

async function showLinkAccount(ctx: any) {
    await ctx.reply(
        '🔗 *Connect Your Account*\n\n' +
        '1. Go to fundtracer.xyz → Profile\n' +
        '2. Click "Connect Telegram"\n' +
        '3. Enter the code shown\n\n' +
        'Your alerts will sync across site and Telegram.',
        { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
    );
}

async function showDashboard(ctx: any, user: LinkedUser) {
    await ctx.reply(
        `🔍 *FundTracer*\n\n` +
        `Plan: ${user.tier.toUpperCase()}\n` +
        `Watching: ${user.watches.length} wallets\n` +
        `Frequency: ${user.alertFrequency}\n\n` +
        `/scan <address> - Analyze wallet\n` +
        `/contract <address> - Analyze contract\n` +
        `/ask <question> - Ask AI anything\n` +
        `/history - View scan history\n` +
        `/add - Add to watchlist\n` +
        `/list - View wallets\n` +
        `/frequency - Set alerts\n` +
        `/status - View status\n` +
        `/unlink - Disconnect`,
        { parse_mode: 'Markdown' }
    );
}

// === EXPORTS FOR API ===

export function generateLinkCode(userId: string, tier: string, walletAddress: string): string {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    pendingCodes.set(code, {
        code, userId, tier, walletAddress,
        expiresAt: Date.now() + 10 * 60 * 1000
    });
    return code;
}

export function getAllLinkedUsers(): LinkedUser[] {
    return Array.from(linkedUsers.values());
}

export function getLinkedUser(telegramId: number): LinkedUser | undefined {
    return linkedUsers.get(telegramId);
}

export async function sendAlert(
    telegramId: number,
    wallet: string,
    chain: string,
    tx: { hash: string; value: number; isIncoming: boolean },
    aiAnalysis?: string
) {
    if (!bot) return;

    const explorer = chainExplorers[chain.toLowerCase()] || 'https://etherscan.io';
    const direction = tx.isIncoming ? '📥' : '📤';
    let message = `🔔 *Alert*\n\n`;
    message += `${direction} *${tx.value.toFixed(4)} ETH*\n`;
    message += `Wallet: \`${wallet.slice(0, 10)}...${wallet.slice(-4)}\`\n`;
    message += `Chain: ${chain.toUpperCase()}\n`;
    message += `[View Tx](${explorer}/tx/${tx.hash})`;

    if (aiAnalysis) {
        message += `\n\n🤖 *AI*: ${aiAnalysis}`;
    }

    try {
        await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('[Telegram] Send error:', e);
    }
}

export async function analyzeTransaction(tx: {
    hash: string;
    from: string;
    to: string;
    value: number;
    chain: string;
}): Promise<string> {
    if (!GROQ_API_KEY) return 'AI unavailable';

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                    role: 'user',
                    content: `Explain in 1-2 sentences: ${tx.value} ETH transferred on ${tx.chain}. From: ${tx.from.slice(0,6)}...${tx.from.slice(-4)}, To: ${tx.to?.slice(0,6)}...${tx.to?.slice(-4)}. Is it suspicious?`
                }],
                temperature: 0.3,
                max_tokens: 100
            })
        });

        const data = await res.json();
        return data.choices?.[0]?.message?.content || 'Analysis failed';
    } catch (e) {
        return 'AI error';
    }
}

const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function askAI(prompt: string, context?: string): Promise<string> {
    if (!GROQ_API_KEY) return 'AI unavailable. Please configure GROQ_API_KEY.';

    const systemPrompt = context 
        ? `You are FundTracer AI assistant. You help users analyze crypto wallets, transactions, and blockchain data. Context: ${context}`
        : `You are FundTracer AI assistant. You help users analyze crypto wallets, transactions, and blockchain data. Be concise and helpful.`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.5,
                max_tokens: 500
            })
        });

        const data = await res.json();
        if (data.error) {
            return `AI Error: ${data.error.message}`;
        }
        return data.choices?.[0]?.message?.content || 'AI could not generate a response';
    } catch (e) {
        return 'AI error. Please try again later.';
    }
}

export function getPendingCode(code: string): PendingCode | undefined {
    return pendingCodes.get(code);
}

export function isUserLinked(userId: string): boolean {
    return Array.from(linkedUsers.values()).some(user => user.userId === userId);
}

export function getLinkedUserByUserId(userId: string): LinkedUser | undefined {
    return Array.from(linkedUsers.values()).find(user => user.userId === userId);
}

export function unlinkUser(userId: string): boolean {
    for (const [telegramId, user] of Array.from(linkedUsers.entries())) {
        if (user.userId === userId) {
            linkedUsers.delete(telegramId);
            return true;
        }
    }
    return false;
}
