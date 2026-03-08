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

        // Register commands with Telegram's command menu (the "/" autocomplete)
        await bot.telegram.setMyCommands([
            // Account
            { command: 'start', description: 'Start the bot / Dashboard' },
            { command: 'help', description: 'Show all commands' },
            { command: 'link', description: 'Connect FundTracer account' },
            { command: 'unlink', description: 'Disconnect account' },
            { command: 'status', description: 'View account status' },
            // Watchlist
            { command: 'add', description: 'Add wallet to watchlist' },
            { command: 'list', description: 'View watched wallets' },
            { command: 'remove', description: 'Remove wallet from watchlist' },
            // Analysis
            { command: 'scan', description: 'Quick wallet scan' },
            { command: 'contract', description: 'Scan a contract' },
            { command: 'ask', description: 'Ask AI anything' },
            { command: 'history', description: 'View scan history' },
            // Memecoin / Token
            { command: 'token', description: 'Token price & stats' },
            { command: 'rugcheck', description: 'Token safety check' },
            { command: 'trending', description: 'Top gainers & losers' },
            { command: 'newtokens', description: 'New token launches' },
            // Polymarket
            { command: 'pmarkets', description: 'Browse prediction markets' },
            { command: 'ptrending', description: 'Trending & volume spikes' },
            { command: 'ptraders', description: 'Top Polymarket traders' },
            { command: 'ptrader', description: 'Lookup specific trader' },
            { command: 'pask', description: 'AI analysis of markets' },
            // Settings
            { command: 'frequency', description: 'Set alert frequency' },
        ]);
        console.log('[Telegram] Commands registered with menu');

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
            await sendReply(ctx, 
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
        await sendReply(ctx, 
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
            '🪙 *Memecoin/Tokens*\n' +
            '/token <addr> - Token price & stats\n' +
            '/rugcheck <addr> - Safety analysis\n' +
            '/trending - Top gainers & losers\n' +
            '/newtokens - New launches\n\n' +
            '📊 *Polymarket*\n' +
            '/pmarkets [search] - Browse markets\n' +
            '/ptrending - Volume spikes & hot\n' +
            '/ptraders - Top traders\n' +
            '/palerts - Your price alerts\n' +
            '/pask <query> - AI analysis\n\n' +
            '🤖 *AI Assistant*\n' +
            '/ask <question> - Ask anything\n' +
            '/history - View scan history\n\n' +
            '⚙️ *Settings*\n' +
            '/frequency - Set alert frequency\n' +
            '/psettings - Polymarket alerts\n' +
            '/status - View status',
            { parse_mode: 'Markdown' }
        );
    });

        // /link - Connect account
        bot.command('link', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (linkedUser) {
                await sendReply(ctx, 
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
            
            await sendReply(ctx, 
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
                await sendReply(ctx, 
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
                await sendReply(ctx, '❌ Invalid address format. Must be 0x followed by 40 hex characters.');
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

                await sendReply(ctx, 
                    `🔍 *Select Chain*\n\nAddress: \`${address.slice(0, 10)}...${address.slice(-4)}\`\n\nWhich chain do you want to scan on?`,
                    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttonRows) }
                );
                return;
            }

            // Validate chain
            if (!chains.includes(chain)) {
                await sendReply(ctx, `❌ Unknown chain: ${chain}\n\nSupported: ${chains.join(', ')}`);
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
                await sendReply(ctx, 
                    '📄 /contract <address> [chain] - Analyze a smart contract\n\n' +
                    'Chains: ethereum, polygon, arbitrum, optimism, base, linea\n' +
                    'Example: /contract 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ethereum',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                await sendReply(ctx, '❌ Invalid contract address');
                return;
            }

            if (!chains.includes(chain.toLowerCase())) {
                await sendReply(ctx, `❌ Unknown chain. Use: ${chains.join(', ')}`);
                return;
            }

            await sendReply(ctx, '📄 *Analyzing contract...*', { parse_mode: 'Markdown' });

            try {
                const wa = await getAnalyzer();
                const code = await wa.getProvider(chain.toLowerCase()).getCode(address.toLowerCase());

                if (code === '0x' || !code) {
                    await sendReply(ctx, '❌ Not a contract (no code found)');
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

                await sendReply(ctx, msg, { parse_mode: 'Markdown' });

            } catch (e: any) {
                await sendReply(ctx, `❌ Analysis failed: ${e.message}`);
            }
        });

        // /add - Add wallet to watchlist
        bot.command('add', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);

            if (!linkedUser) {
                await sendReply(ctx, 
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
                await sendReply(ctx, `❌ Wallet limit reached (${maxWallets})\n\nUpgrade your plan for more.`);
                return;
            }

            linkedUser.step = 'awaiting_address';
            await sendReply(ctx, 
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
                    await sendReply(ctx, 
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
                    await sendReply(ctx, '❌ Invalid address format. Must start with 0x followed by 40 hex characters.');
                    return;
                }

                linkedUser.pendingAddress = text.toLowerCase();
                linkedUser.step = 'select_chain';

                const buttons = chains.map(c =>
                    Markup.button.callback(c.charAt(0).toUpperCase() + c.slice(1), `chain_${c}`)
                );

                await sendReply(ctx, 'Select blockchain:', Markup.inlineKeyboard(buttons));
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
                await sendReply(ctx, 'Use /link first');
                return;
            }

            if (linkedUser.watches.length === 0) {
                await sendReply(ctx, 'No wallets. Use /add to add one.');
                return;
            }

            let msg = '📋 *Watched Wallets*\n\n';
            linkedUser.watches.forEach((w, i) => {
                msg += `${i + 1}. \`${w.address.slice(0, 10)}...${w.address.slice(-4)}\`\n`;
                msg += `   ${chainEmojis[w.chain] || '🔗'} ${w.chain.toUpperCase()}\n\n`;
            });

            const limit = linkedUser.tier === 'free' ? 10 : linkedUser.tier === 'pro' ? 100 : '∞';
            msg += `Limit: ${linkedUser.watches.length}/${limit}`;

            await sendReply(ctx, msg, { parse_mode: 'Markdown' });
        });

        // /remove - Remove wallet
        bot.command('remove', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (!linkedUser || linkedUser.watches.length === 0) {
                await sendReply(ctx, 'No wallets to remove.');
                return;
            }

            const buttons = linkedUser.watches.map((w, i) =>
                [Markup.button.callback(
                    `${w.address.slice(0, 8)}...${w.address.slice(-4)} (${w.chain})`,
                    `remove_${i}`
                )]
            );

            await sendReply(ctx, '❌ *Remove Wallet*\n\nSelect:',
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
                await sendReply(ctx, 'Use /link first');
                return;
            }

            await sendReply(ctx, '⏰ *Alert Frequency*',
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
                await sendReply(ctx, 'Use /link first');
                return;
            }

            await sendReply(ctx, 
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
                await sendReply(ctx, '✅ Account unlinked. Use /link to connect again.');
            } else {
                await sendReply(ctx, 'No account linked.');
            }
        });

        // /ask - Ask AI about wallets, transactions, crypto (requires linked account)
        bot.command(['ask', 'ai'], async (ctx: any) => {
            const linkedUser = await requireLinkedAccount(ctx);
            if (!linkedUser) return;

            const args = ctx.message.text.split(' ').slice(1);
            const question = args.join(' ');

            if (!question) {
                await sendReply(ctx, 
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

            let context = '';
            if (linkedUser.watches.length > 0) {
                const wallets = linkedUser.watches.map(w => 
                    `${w.address.slice(0, 10)}...${w.address.slice(-4)} (${w.chain})`
                ).join(', ');
                context = `User is watching these wallets: ${wallets}. User's plan: ${linkedUser.tier}`;
            }

            const answer = await askAI(question, context);
            
            await streamReply(ctx, `🤖 *Answer*\n\n${answer}`);
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
                        await sendReply(ctx, '📊 *Scan History*\n\nNo scan history yet. Use /scan to analyze wallets!',
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

                    await sendReply(ctx, msg, { parse_mode: 'Markdown' });
                } else {
                    await sendReply(ctx, '📊 *Scan History*\n\nNo scan history yet. Use /scan to analyze wallets!',
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (e) {
                await sendReply(ctx, '📊 *Scan History*\n\nNo scan history available.',
                    { parse_mode: 'Markdown' }
                );
            }
        });

    // ==========================================
    // POLYMARKET COMMANDS
    // ==========================================

    // /pmarkets - Browse markets (public - no auth required)
    bot.command(['pmarkets', 'polymarket', 'pm'], async (ctx: any) => {
        // No auth required for Polymarket
        const args = ctx.message.text.split(' ').slice(1);
        const query = args.join(' ');

        await sendReply(ctx, '🔍 *Loading Polymarket markets...*', { parse_mode: 'Markdown' });

        try {
            const { polymarketService } = await import('./PolymarketService.js');
            
            let markets;
            if (query) {
                markets = await polymarketService.searchMarkets(query, 5);
            } else {
                markets = await polymarketService.getTrendingMarkets(5);
            }

            if (markets.length === 0) {
                await sendReply(ctx, '❌ No markets found. Try a different search term.');
                return;
            }

            let msg = query 
                ? `🔍 *Markets matching "${query}"*\n\n`
                : '🔥 *Trending Markets*\n\n';

            for (const market of markets) {
                const prices = market.outcomePrices.map(p => parseFloat(p));
                const yesPrice = (prices[0] * 100).toFixed(0);
                const change = market.oneDayPriceChange || 0;
                const changeStr = change !== 0 ? ` (${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%)` : '';

                msg += `📊 *${escapeMarkdown(market.question.slice(0, 60))}*\n`;
                msg += `✅ Yes: ${yesPrice}¢${changeStr}\n`;
                msg += `💰 Vol: $${polymarketService.formatNumber(market.volume24hr)}\n`;
                msg += `🔗 /pmarket\\_${market.slug.slice(0, 30)}\n\n`;
            }

            msg += '_Powered by Polymarket_';

            await sendReply(ctx, msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (error) {
            console.error('[Telegram] Polymarket error:', error);
            await sendReply(ctx, '❌ Failed to load markets. Please try again.');
        }
    });

    // /pmarket_<slug> - Get market details (public - no auth required)
    bot.command(/pmarket_(.+)/, async (ctx: any) => {
        // No auth required for Polymarket
        const slug = ctx.match![1];

        try {
            const { polymarketService } = await import('./PolymarketService.js');
            const market = await polymarketService.getMarket(slug);

            if (!market) {
                await sendReply(ctx, '❌ Market not found.');
                return;
            }

            const msg = polymarketService.formatMarketSummary(market);

            const buttons = [
                [
                    Markup.button.callback('📈 Set Yes Alert', `palert_yes_${market.slug.slice(0, 20)}`),
                    Markup.button.callback('📉 Set No Alert', `palert_no_${market.slug.slice(0, 20)}`)
                ],
                [
                    Markup.button.url('🔗 View on Polymarket', polymarketService.getMarketUrl(market))
                ]
            ];

            await sendReply(ctx, msg, { 
                parse_mode: 'Markdown', 
                disable_web_page_preview: true,
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (error) {
            console.error('[Telegram] Market detail error:', error);
            await sendReply(ctx, '❌ Failed to load market details.');
        }
    });

    // /ptrending - Volume spikes and trending (public - no auth required)
    bot.command(['ptrending', 'pspikes', 'phot'], async (ctx: any) => {
        // No auth required for Polymarket
        await sendReply(ctx, '📈 *Finding trending markets...*', { parse_mode: 'Markdown' });

        try {
            const { polymarketService } = await import('./PolymarketService.js');
            const spikes = await polymarketService.detectVolumeSpikes(1.5, 5000);

            if (spikes.length === 0) {
                await sendReply(ctx, '📊 No significant volume spikes detected right now.');
                return;
            }

            let msg = '🚨 *Volume Spikes & Trending*\n\n';

            for (const spike of spikes.slice(0, 5)) {
                const market = spike.market;
                const change = market.oneDayPriceChange || 0;
                const changeEmoji = change > 0 ? '📈' : change < 0 ? '📉' : '➖';

                msg += `⚡ *${spike.spikeRatio.toFixed(1)}x* volume spike\n`;
                msg += `📊 ${escapeMarkdown(market.question.slice(0, 50))}\n`;
                msg += `${changeEmoji} ${(change * 100).toFixed(1)}% • $${polymarketService.formatNumber(market.volume24hr)}\n\n`;
            }

            await sendReply(ctx, msg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('[Telegram] Trending error:', error);
            await sendReply(ctx, '❌ Failed to load trending markets.');
        }
    });

    // /ptraders - Top traders leaderboard (public - no auth required)
    bot.command(['ptraders', 'pleaderboard', 'ptop'], async (ctx: any) => {
        // No auth required for Polymarket
        await sendReply(ctx, '🏆 *Loading leaderboard...*', { parse_mode: 'Markdown' });

        try {
            const { polymarketService } = await import('./PolymarketService.js');
            const traders = await polymarketService.getLeaderboard(10);

            if (traders.length === 0) {
                await sendReply(ctx, '📊 Leaderboard data not available.');
                return;
            }

            let msg = '🏆 *Top Polymarket Traders*\n\n';

            for (const trader of traders) {
                const name = trader.username || `${trader.address.slice(0, 8)}...${trader.address.slice(-4)}`;
                const pnlEmoji = (trader.profit || 0) >= 0 ? '📈' : '📉';

                msg += `*${trader.rank}.* ${escapeMarkdown(name)}\n`;
                msg += `   ${pnlEmoji} PnL: $${polymarketService.formatNumber(trader.profit || 0)}\n`;
                msg += `   💰 Vol: $${polymarketService.formatNumber(trader.volume || 0)}\n\n`;
            }

            await sendReply(ctx, msg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('[Telegram] Leaderboard error:', error);
            await sendReply(ctx, '❌ Failed to load leaderboard.');
        }
    });

    // /ptrader <address> - Get trader profile (public - no auth required)
    bot.command('ptrader', async (ctx: any) => {
        // No auth required for Polymarket
        const args = ctx.message.text.split(' ').slice(1);
        const address = args[0];

        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            await sendReply(ctx, 
                '👤 */ptrader* - View trader profile\n\n' +
                '*Usage:* `/ptrader <address>`\n\n' +
                '*Example:*\n`/ptrader 0x742d...eB1e`',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        await sendReply(ctx, '👤 *Loading trader profile...*', { parse_mode: 'Markdown' });

        try {
            const { polymarketService } = await import('./PolymarketService.js');
            const { trader, positions } = await polymarketService.getTraderProfile(address);

            if (!trader) {
                await sendReply(ctx, '❌ Trader not found or no positions.');
                return;
            }

            let msg = `👤 *Trader Profile*\n\n`;
            msg += `📍 \`${address.slice(0, 10)}...${address.slice(-6)}\`\n`;
            msg += `📊 Positions: ${trader.positions || 0}\n`;
            msg += `💰 Total PnL: $${polymarketService.formatNumber(trader.profit || 0)}\n\n`;

            if (positions.length > 0) {
                msg += '*Top Positions:*\n';
                for (const pos of positions.slice(0, 3)) {
                    const pnlEmoji = pos.pnl >= 0 ? '📈' : '📉';
                    msg += `• ${escapeMarkdown(pos.marketQuestion.slice(0, 40))}...\n`;
                    msg += `  ${pnlEmoji} ${pos.outcome}: $${polymarketService.formatNumber(pos.pnl)}\n`;
                }
            }

            const buttons = [
                [Markup.button.callback('➕ Follow Trader', `pfollow_${address.slice(0, 30)}`)]
            ];

            await sendReply(ctx, msg, { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (error) {
            console.error('[Telegram] Trader profile error:', error);
            await sendReply(ctx, '❌ Failed to load trader profile.');
        }
    });

    // /palerts - View/manage price alerts
    bot.command(['palerts', 'pmyalerts'], async (ctx: any) => {
        const linkedUser = await requireLinkedAccount(ctx);
        if (!linkedUser) return;

        try {
            const { getUserAlerts } = await import('./PolymarketWatcher.js');
            const alerts = await getUserAlerts(ctx.from.id);

            if (alerts.length === 0) {
                await sendReply(ctx, 
                    '🔔 *Price Alerts*\n\n' +
                    'No active alerts.\n\n' +
                    'To create an alert:\n' +
                    '1. Use `/pmarkets` to find a market\n' +
                    '2. Click on a market to view details\n' +
                    '3. Use the alert buttons',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            let msg = '🔔 *Your Price Alerts*\n\n';

            for (const alert of alerts) {
                const outcomeEmoji = alert.outcome === 'yes' ? '✅' : '❌';
                const condEmoji = alert.condition === 'above' ? '📈' : '📉';

                msg += `${outcomeEmoji} *${escapeMarkdown(alert.marketQuestion.slice(0, 40))}*\n`;
                msg += `${condEmoji} ${alert.outcome.toUpperCase()} ${alert.condition} ${(alert.targetPrice * 100).toFixed(0)}¢\n`;
                msg += `🗑 /pdelalert\\_${alert.id}\n\n`;
            }

            await sendReply(ctx, msg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('[Telegram] Alerts error:', error);
            await sendReply(ctx, '❌ Failed to load alerts.');
        }
    });

    // /pdelalert_<id> - Delete an alert
    bot.command(/pdelalert_(.+)/, async (ctx: any) => {
        const linkedUser = await requireLinkedAccount(ctx);
        if (!linkedUser) return;

        const alertId = ctx.match![1];

        try {
            const { deleteAlert } = await import('./PolymarketWatcher.js');
            const success = await deleteAlert(ctx.from.id, alertId);

            if (success) {
                await sendReply(ctx, '✅ Alert deleted.');
            } else {
                await sendReply(ctx, '❌ Alert not found.');
            }
        } catch (error) {
            await sendReply(ctx, '❌ Failed to delete alert.');
        }
    });

    // /pfollowing - View followed traders
    bot.command(['pfollowing', 'pmyfollows'], async (ctx: any) => {
        const linkedUser = await requireLinkedAccount(ctx);
        if (!linkedUser) return;

        try {
            const { getFollowedTraders } = await import('./PolymarketWatcher.js');
            const follows = await getFollowedTraders(ctx.from.id);

            if (follows.length === 0) {
                await sendReply(ctx, 
                    '👥 *Followed Traders*\n\n' +
                    'You\'re not following any traders.\n\n' +
                    'Use `/ptrader <address>` to view and follow traders.',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            let msg = '👥 *Followed Traders*\n\n';

            for (const follow of follows) {
                const name = follow.traderUsername || `${follow.traderAddress.slice(0, 10)}...${follow.traderAddress.slice(-4)}`;
                msg += `👤 ${escapeMarkdown(name)}\n`;
                msg += `🗑 /punfollow\\_${follow.traderAddress.slice(0, 30)}\n\n`;
            }

            await sendReply(ctx, msg, { parse_mode: 'Markdown' });
        } catch (error) {
            await sendReply(ctx, '❌ Failed to load followed traders.');
        }
    });

    // /punfollow_<address> - Unfollow a trader
    bot.command(/punfollow_(.+)/, async (ctx: any) => {
        const linkedUser = await requireLinkedAccount(ctx);
        if (!linkedUser) return;

        const address = ctx.match![1];

        try {
            const { unfollowTrader } = await import('./PolymarketWatcher.js');
            const success = await unfollowTrader(ctx.from.id, address);

            if (success) {
                await sendReply(ctx, '✅ Unfollowed trader.');
            } else {
                await sendReply(ctx, '❌ Trader not found in your follows.');
            }
        } catch (error) {
            await sendReply(ctx, '❌ Failed to unfollow trader.');
        }
    });

    // /pask <question> - AI analysis of a market (public - no auth required)
    bot.command(['pask', 'pai', 'panalyze'], async (ctx: any) => {
        // No auth required for Polymarket
        const args = ctx.message.text.split(' ').slice(1);
        const query = args.join(' ');

        if (!query) {
            await sendReply(ctx, 
                '🤖 */pask* - AI Market Analysis\n\n' +
                '*Usage:* `/pask <market name or question>`\n\n' +
                '*Examples:*\n' +
                '`/pask Trump 2028`\n' +
                '`/pask Will Bitcoin hit 100k?`\n' +
                '`/pask What are the odds for the election?`',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        await sendReply(ctx, '🤖 *Analyzing...*', { parse_mode: 'Markdown' });

        try {
            const { polymarketService } = await import('./PolymarketService.js');
            
            // Find relevant markets
            const markets = await polymarketService.searchMarkets(query, 3);

            if (markets.length === 0) {
                await sendReply(ctx, '❌ No relevant markets found for your query.');
                return;
            }

            // Build context for AI
            let marketContext = 'Polymarket prediction markets data:\n\n';
            for (const market of markets) {
                const prices = market.outcomePrices.map(p => parseFloat(p));
                marketContext += `Market: ${market.question}\n`;
                marketContext += `Yes probability: ${(prices[0] * 100).toFixed(1)}%\n`;
                marketContext += `No probability: ${(prices[1] * 100).toFixed(1)}%\n`;
                marketContext += `24h volume: $${market.volume24hr.toLocaleString()}\n`;
                marketContext += `24h price change: ${((market.oneDayPriceChange || 0) * 100).toFixed(1)}%\n`;
                marketContext += `Description: ${market.description?.slice(0, 200) || 'N/A'}\n\n`;
            }

            const prompt = `Based on the following Polymarket prediction markets data, provide a brief analysis answering: "${query}"\n\n${marketContext}\n\nProvide:\n1. Current market sentiment (based on prices)\n2. Key factors to consider\n3. Brief analysis (2-3 sentences)`;

            const answer = await askAI(prompt, 'User is asking about Polymarket prediction markets');

            await streamReply(ctx, `🤖 *AI Analysis*\n\n📊 *Query:* ${escapeMarkdown(query)}\n\n${answer}`);
        } catch (error) {
            console.error('[Telegram] AI analysis error:', error);
            await sendReply(ctx, '❌ Failed to analyze. Please try again.');
        }
    });

    // /psettings - Polymarket notification settings
    bot.command(['psettings', 'pnotify'], async (ctx: any) => {
        const linkedUser = await requireLinkedAccount(ctx);
        if (!linkedUser) return;

        try {
            const { getUserPolymarketPrefs } = await import('./PolymarketWatcher.js');
            const prefs = await getUserPolymarketPrefs(ctx.from.id);

            const spikeStatus = prefs.notifySpikes ? '✅' : '❌';
            const alertStatus = prefs.notifyPriceAlerts ? '✅' : '❌';
            const traderStatus = prefs.notifyTraderActivity ? '✅' : '❌';

            const buttons = [
                [Markup.button.callback(`${spikeStatus} Volume Spikes`, 'ptoggle_spikes')],
                [Markup.button.callback(`${alertStatus} Price Alerts`, 'ptoggle_alerts')],
                [Markup.button.callback(`${traderStatus} Trader Activity`, 'ptoggle_traders')]
            ];

            await sendReply(ctx, 
                '⚙️ *Polymarket Notifications*\n\n' +
                'Toggle notifications on/off:',
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
            );
        } catch (error) {
            await sendReply(ctx, '❌ Failed to load settings.');
        }
    });

    // Callback handlers for Polymarket
    bot.action(/ptoggle_(.+)/, async (ctx: any) => {
        const linkedUser = linkedUsers.get(ctx.from.id);
        if (!linkedUser) {
            await ctx.answerCbQuery('Please link your account first');
            return;
        }

        const setting = ctx.match![1];

        try {
            const { getUserPolymarketPrefs, updateUserPolymarketPrefs } = await import('./PolymarketWatcher.js');
            const prefs = await getUserPolymarketPrefs(ctx.from.id);

            const updates: any = {};
            if (setting === 'spikes') {
                updates.notifySpikes = !prefs.notifySpikes;
            } else if (setting === 'alerts') {
                updates.notifyPriceAlerts = !prefs.notifyPriceAlerts;
            } else if (setting === 'traders') {
                updates.notifyTraderActivity = !prefs.notifyTraderActivity;
            }

            await updateUserPolymarketPrefs(ctx.from.id, updates);

            // Refresh the settings display
            const newPrefs = await getUserPolymarketPrefs(ctx.from.id);
            const spikeStatus = newPrefs.notifySpikes ? '✅' : '❌';
            const alertStatus = newPrefs.notifyPriceAlerts ? '✅' : '❌';
            const traderStatus = newPrefs.notifyTraderActivity ? '✅' : '❌';

            const buttons = [
                [Markup.button.callback(`${spikeStatus} Volume Spikes`, 'ptoggle_spikes')],
                [Markup.button.callback(`${alertStatus} Price Alerts`, 'ptoggle_alerts')],
                [Markup.button.callback(`${traderStatus} Trader Activity`, 'ptoggle_traders')]
            ];

            await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(buttons).reply_markup);
            await ctx.answerCbQuery('Setting updated!');
        } catch (error) {
            await ctx.answerCbQuery('Failed to update');
        }
    });

    // Follow trader callback
    bot.action(/pfollow_(.+)/, async (ctx: any) => {
        const linkedUser = linkedUsers.get(ctx.from.id);
        if (!linkedUser) {
            await ctx.answerCbQuery('Please link your account first');
            return;
        }

        const address = ctx.match![1];

        try {
            const { followTrader } = await import('./PolymarketWatcher.js');
            const result = await followTrader(ctx.from.id, linkedUser.userId, address);

            if (result.success) {
                await ctx.answerCbQuery('✅ Now following this trader!');
            } else {
                await ctx.answerCbQuery(result.error || 'Failed to follow');
            }
        } catch (error) {
            await ctx.answerCbQuery('Failed to follow trader');
        }
    });

    // Price alert callbacks
    bot.action(/palert_(yes|no)_(.+)/, async (ctx: any) => {
        const linkedUser = linkedUsers.get(ctx.from.id);
        if (!linkedUser) {
            await ctx.answerCbQuery('Please link your account first');
            return;
        }

        const outcome = ctx.match![1] as 'yes' | 'no';
        const slug = ctx.match![2];

        // Set user step to await price input
        linkedUser.step = `palert_${outcome}_${slug}`;

        await ctx.answerCbQuery();
        await sendReply(ctx, 
            `📊 *Set ${outcome.toUpperCase()} Alert*\n\n` +
            `Enter your target price (0-100):\n` +
            `Example: \`45\` for 45¢\n\n` +
            `Format: \`above 60\` or \`below 30\``,
            { parse_mode: 'Markdown' }
        );
    });

    // ==========================================
    // END POLYMARKET COMMANDS
    // ==========================================

    // ==========================================
    // MEMECOIN / TOKEN COMMANDS
    // ==========================================

    // /token <address> - Quick token stats (public - no auth required)
    bot.command(['token', 't'], async (ctx: any) => {
        const args = ctx.message.text.split(' ').slice(1);
        const addressOrSymbol = args[0];
        const chainArg = args[1]?.toLowerCase();

        if (!addressOrSymbol) {
            await sendReply(ctx, 
                '🪙 */token* - Token price & stats\n\n' +
                '*Usage:*\n' +
                '`/token <address> [chain]`\n' +
                '`/token <symbol> [chain]`\n\n' +
                '*Examples:*\n' +
                '`/token 0x6982508145454Ce325dDbE47a25d4ec3d2311933`\n' +
                '`/token PEPE ethereum`\n' +
                '`/token EPjFWdd5AufqSSqeM2qN1xzybapC8G4DXEGpbh4R8mC solana`\n\n' +
                '*Chains:* ethereum, solana, base, arbitrum, bsc, polygon, avax',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        await sendReply(ctx, '🔍 *Fetching token data...*', { parse_mode: 'Markdown' });

        try {
            const { dexScreenerService } = await import('./DEXScreenerService.js');
            
            let pairs: any[] = [];
            
            // Check if input is an address or symbol
            const isEthAddress = /^0x[a-fA-F0-9]{40}$/i.test(addressOrSymbol);
            const isSolAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addressOrSymbol);
            const isAddress = isEthAddress || isSolAddress;
            
            if (isAddress) {
                // It's an address - determine chain from format
                const chain = isSolAddress ? 'solana' : (chainArg || 'ethereum');
                
                if (chainArg) {
                    // User specified chain
                    const result = await dexScreenerService.getTokenPairs(chainArg, addressOrSymbol);
                    pairs = Array.isArray(result) ? result : (result?.pairs || []);
                } else {
                    // Try to find on the specified chain, or try multiple chains
                    const chains = isSolAddress ? ['solana'] : ['ethereum', 'base', 'arbitrum', 'bsc', 'polygon'];
                    
                    for (const c of chains) {
                        try {
                            const result = await dexScreenerService.getTokenPairs(c, addressOrSymbol);
                            const found = Array.isArray(result) ? result : (result?.pairs || []);
                            if (found.length > 0) {
                                pairs = found;
                                break;
                            }
                        } catch (e) {
                            // Continue to next chain
                        }
                    }
                }
            } else {
                // Search by symbol - search first, then optionally filter by chain
                const result = await dexScreenerService.searchPairs(addressOrSymbol);
                pairs = result?.pairs || [];
                
                // If chain specified, filter results
                if (chainArg) {
                    pairs = pairs.filter((p: any) => p.chainId === chainArg);
                }
            }

            if (!pairs || pairs.length === 0) {
                await sendReply(ctx, `❌ Token "${escapeMarkdown(addressOrSymbol)}" not found.\n\nMake sure to specify the chain:\n\`/token ${addressOrSymbol} ethereum\``, { parse_mode: 'Markdown' });
                return;
            }

            // If multiple pairs from different chains, show selection
            const chainIds = pairs.map((p: any) => p.chainId);
            const uniqueChains = Array.from(new Set(chainIds));
            if (uniqueChains.length > 1 && !chainArg) {
                // Show chain selection buttons
                const buttons = uniqueChains.slice(0, 6).map((chain: string) => 
                    Markup.button.callback(`⛓️ ${chain.toUpperCase()}`, `token_chain_${chain}_${encodeURIComponent(addressOrSymbol)}`)
                );
                
                // Arrange in 2 columns
                const buttonRows = [];
                for (let i = 0; i < buttons.length; i += 2) {
                    buttonRows.push(buttons.slice(i, i + 2));
                }

                await sendReply(ctx, 
                    `🔗 *Select Chain*\n\nFound "${escapeMarkdown(addressOrSymbol)}" on multiple chains:\n\nSelect the chain you want to view:`,
                    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttonRows) }
                );
                return;
            }

            // Get the most liquid pair
            const pair = pairs.sort((a: any, b: any) => 
                (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];

            const token = pair.baseToken;
            const priceUsd = parseFloat(pair.priceUsd || '0');
            const priceChange24h = pair.priceChange?.h24 || 0;
            const volume24h = pair.volume?.h24 || 0;
            const liquidity = pair.liquidity?.usd || 0;
            const fdv = pair.fdv || 0;
            const marketCap = pair.marketCap || fdv;
            const pairCreated = pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toLocaleDateString() : 'Unknown';

            const changeEmoji = priceChange24h > 0 ? '📈' : priceChange24h < 0 ? '📉' : '➖';
            const changeColor = priceChange24h > 0 ? '+' : '';

            let msg = `🪙 *${escapeMarkdown(token.name || 'Unknown')}* (${escapeMarkdown(token.symbol || '???')})\n\n`;
            msg += `💰 *Price:* $${priceUsd < 0.0001 ? priceUsd.toExponential(2) : priceUsd.toLocaleString(undefined, { maximumFractionDigits: 6 })}\n`;
            msg += `${changeEmoji} *24h:* ${changeColor}${priceChange24h.toFixed(2)}%\n\n`;
            msg += `📊 *Volume 24h:* $${formatNumber(volume24h)}\n`;
            msg += `💧 *Liquidity:* $${formatNumber(liquidity)}\n`;
            msg += `📈 *Market Cap:* $${formatNumber(marketCap)}\n`;
            msg += `🏷️ *FDV:* $${formatNumber(fdv)}\n\n`;
            msg += `⛓️ *Chain:* ${pair.chainId}\n`;
            msg += `🏦 *DEX:* ${pair.dexId}\n`;
            msg += `📅 *Created:* ${pairCreated}\n\n`;
            msg += `🔗 [View on DEX Screener](https://dexscreener.com/${pair.chainId}/${pair.pairAddress})`;

            await sendReply(ctx, msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (error) {
            console.error('[Telegram] Token lookup error:', error);
            await sendReply(ctx, '❌ Failed to fetch token data. Please try again.');
        }
    });

    // Handle token chain selection
    bot.action(/token_chain_(.+)_(.+)/, async (ctx: any) => {
        const chain = ctx.match![1];
        const searchTerm = decodeURIComponent(ctx.match![2]);
        
        await ctx.answerCbQuery();
        
        // Re-run the token command with the chain specified
        // Set up a temporary context to re-use the logic
        const linkedUser = linkedUsers.get(ctx.from.id);
        
        // Fetch token data directly
        try {
            const { dexScreenerService } = await import('./DEXScreenerService.js');
            
            let pairs: any[] = [];
            
            const isEthAddress = /^0x[a-fA-F0-9]{40}$/i.test(searchTerm);
            const isSolAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(searchTerm);
            
            if (isEthAddress || isSolAddress) {
                const result = await dexScreenerService.getTokenPairs(chain, searchTerm);
                pairs = Array.isArray(result) ? result : (result?.pairs || []);
            } else {
                const result = await dexScreenerService.searchPairs(searchTerm);
                pairs = (result?.pairs || []).filter((p: any) => p.chainId === chain);
            }

            if (!pairs || pairs.length === 0) {
                await ctx.editMessageText(`❌ No results found on ${chain.toUpperCase()}`);
                return;
            }

            const pair = pairs.sort((a: any, b: any) => 
                (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];

            const token = pair.baseToken;
            const priceUsd = parseFloat(pair.priceUsd || '0');
            const priceChange24h = pair.priceChange?.h24 || 0;
            const volume24h = pair.volume?.h24 || 0;
            const liquidity = pair.liquidity?.usd || 0;
            const fdv = pair.fdv || 0;
            const marketCap = pair.marketCap || fdv;

            const changeEmoji = priceChange24h > 0 ? '📈' : priceChange24h < 0 ? '📉' : '➖';
            const changeColor = priceChange24h > 0 ? '+' : '';

            const tokenName = token.name || 'Unknown';
            const tokenSymbol = token.symbol || '???';
            const chainName = chain.toUpperCase();
            
            let msg = '🪙 *' + escapeMarkdown(tokenName) + '* (' + escapeMarkdown(tokenSymbol) + ') on ' + chainName + '\n\n';
            msg += '💰 *Price:* $' + (priceUsd < 0.0001 ? priceUsd.toExponential(2) : priceUsd.toLocaleString(undefined, { maximumFractionDigits: 6 })) + '\n';
            msg += changeEmoji + ' *24h:* ' + changeColor + priceChange24h.toFixed(2) + '%\n\n';
            msg += '📊 Vol: $' + formatNumber(volume24h) + ' | 💧 Liq: $' + formatNumber(liquidity) + '\n';
            msg += '📈 MC: $' + formatNumber(marketCap) + ' | FDV: $' + formatNumber(fdv) + '\n\n';
            msg += '[DEXScreener](https://dexscreener.com/' + pair.chainId + '/' + pair.pairAddress + ')';

            await ctx.editMessageText(msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (error) {
            console.error('[Telegram] Token chain selection error:', error);
            await ctx.editMessageText('❌ Failed to fetch token data.');
        }
    });

    // /rugcheck <address> - Contract safety check (public - no auth required)
    bot.command(['rugcheck', 'rug', 'safety'], async (ctx: any) => {
        const args = ctx.message.text.split(' ').slice(1);
        const address = args[0];
        const chainArg = args[1]?.toLowerCase();

        if (!address) {
            await sendReply(ctx, 
                '🛡️ */rugcheck* - Token safety analysis\n\n' +
                '*Usage:* `/rugcheck <address> [chain]`\n\n' +
                '*Examples:*\n' +
                '`/rugcheck 0x6982...`\n' +
                '`/rugcheck 0x69... solana`\n\n' +
                '*Checks:*\n' +
                '• Liquidity locked status\n' +
                '• Contract age\n' +
                '• Top holders concentration\n' +
                '• Buy/Sell activity ratio',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        await sendReply(ctx, '🔍 *Analyzing token safety...*', { parse_mode: 'Markdown' });

        try {
            const { dexScreenerService } = await import('./DEXScreenerService.js');
            
            let pairs: any[] = [];
            let selectedChain = chainArg;
            
            // Detect if it's a Solana address (pumpfun tokens are base58 encoded, longer)
            const isSolAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
            
            if (isSolAddress && !chainArg) {
                // For Solana addresses, try Solana first
                try {
                    const result = await dexScreenerService.getTokenPairs('solana', address);
                    pairs = Array.isArray(result) ? result : (result?.pairs || []);
                    if (pairs.length > 0) selectedChain = 'solana';
                } catch (e) {
                    // Fall through to search
                }
            }
            
            // If no results or chain specified, try direct lookup
            if (pairs.length === 0 && selectedChain) {
                const result = await dexScreenerService.getTokenPairs(selectedChain, address);
                pairs = Array.isArray(result) ? result : (result?.pairs || []);
            }
            
            // If still no results, search by address
            if (pairs.length === 0) {
                const result = await dexScreenerService.searchPairs(address);
                pairs = result?.pairs || [];
            }

            if (!pairs || pairs.length === 0) {
                await sendReply(ctx, '❌ Token not found on DEX Screener.\n\nMake sure the address is correct, or try specifying the chain:\n`/rugcheck <address> solana`', { parse_mode: 'Markdown' });
                return;
            }

            // Get the most liquid pair (or first one if only one)
            const pair = pairs.length === 1 ? pairs[0] : pairs.sort((a: any, b: any) => 
                (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];

            const token = pair.baseToken;
            const liquidity = pair.liquidity?.usd || 0;
            const volume24h = pair.volume?.h24 || 0;
            const txns24h = pair.txns?.h24 || { buys: 0, sells: 0 };
            const pairCreatedAt = pair.pairCreatedAt;
            const pairAddress = pair.pairAddress;
            const dexId = pair.dexId;
            const chainId = pair.chainId;

            // Calculate safety metrics
            let safetyScore = 100;
            const warnings: string[] = [];
            const positives: string[] = [];

            // 1. Liquidity check
            if (liquidity < 1000) {
                safetyScore -= 40;
                warnings.push('🔴 Very low liquidity (<$1k)');
            } else if (liquidity < 10000) {
                safetyScore -= 20;
                warnings.push('🟡 Low liquidity (<$10k)');
            } else if (liquidity >= 100000) {
                positives.push('🟢 Good liquidity (>$100k)');
            } else {
                positives.push('🟢 Moderate liquidity');
            }

            // 2. Age check
            if (pairCreatedAt) {
                const ageHours = (Date.now() - pairCreatedAt) / (1000 * 60 * 60);
                if (ageHours < 1) {
                    safetyScore -= 30;
                    warnings.push('🔴 Very new (<1 hour old)');
                } else if (ageHours < 24) {
                    safetyScore -= 15;
                    warnings.push('🟡 New token (<24 hours)');
                } else if (ageHours >= 168) { // 7 days
                    positives.push('🟢 Established (>7 days)');
                }
            } else {
                warnings.push('🟡 Age unknown');
            }

            // 3. Volume/Liquidity ratio (potential wash trading)
            if (liquidity > 0 && volume24h > 0) {
                const vlRatio = volume24h / liquidity;
                if (vlRatio > 10) {
                    safetyScore -= 15;
                    warnings.push('🟡 High volume/liquidity ratio');
                }
            }

            // 4. Buy/Sell ratio
            const totalTxns = txns24h.buys + txns24h.sells;
            if (totalTxns > 10) {
                const sellRatio = txns24h.sells / totalTxns;
                if (sellRatio > 0.7) {
                    safetyScore -= 20;
                    warnings.push('🔴 Heavy selling pressure');
                } else if (sellRatio < 0.3) {
                    warnings.push('🟡 Mostly buys (potential pump)');
                } else {
                    positives.push('🟢 Balanced buy/sell ratio');
                }
            } else if (totalTxns < 5) {
                safetyScore -= 10;
                warnings.push('🟡 Very low trading activity');
            }

            // 5. Price info check
            if (!pair.priceUsd || parseFloat(pair.priceUsd) === 0) {
                safetyScore -= 20;
                warnings.push('🔴 No price data available');
            }

            // Clamp score
            safetyScore = Math.max(0, Math.min(100, safetyScore));

            // Safety grade
            let grade = '';
            let gradeEmoji = '';
            if (safetyScore >= 80) { grade = 'LOW RISK'; gradeEmoji = '🟢'; }
            else if (safetyScore >= 60) { grade = 'MODERATE RISK'; gradeEmoji = '🟡'; }
            else if (safetyScore >= 40) { grade = 'HIGH RISK'; gradeEmoji = '🟠'; }
            else { grade = 'VERY HIGH RISK'; gradeEmoji = '🔴'; }

            let msg = '🛡️ *Safety Report*\n\n';
            msg += '🪙 *' + escapeMarkdown(token.name || 'Unknown') + '* (' + escapeMarkdown(token.symbol || '???') + ')\n';
            msg += '⛓️ ' + chainId + ' | 🏦 ' + dexId + '\n\n';
            msg += gradeEmoji + ' *Score:* ' + safetyScore + '/100 (' + grade + ')\n\n';

            if (warnings.length > 0) {
                msg += '*Warnings:*\n' + warnings.join('\n') + '\n\n';
            }

            if (positives.length > 0) {
                msg += '*Positives:*\n' + positives.join('\n') + '\n\n';
            }

            msg += '*Stats:*\n';
            msg += '💧 Liquidity: $' + formatNumber(liquidity) + '\n';
            msg += '📊 Volume 24h: $' + formatNumber(volume24h) + '\n';
            msg += '🔄 Txns 24h: ' + txns24h.buys + ' buys / ' + txns24h.sells + ' sells\n';

            if (pairCreatedAt) {
                const ageHours = (Date.now() - pairCreatedAt) / (1000 * 60 * 60);
                if (ageHours < 24) {
                    msg += '📅 Age: ' + ageHours.toFixed(1) + ' hours\n';
                } else {
                    msg += '📅 Age: ' + (ageHours / 24).toFixed(1) + ' days\n';
                }
            }

            msg += '\n🔗 [View on DEX Screener](https://dexscreener.com/' + chainId + '/' + pairAddress + ')\n';
            msg += '\n⚠️ *DYOR* - This is automated analysis, not financial advice.';

            await sendReply(ctx, msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
        } catch (error) {
            console.error('[Telegram] Rugcheck error:', error);
            await sendReply(ctx, '❌ Failed to analyze token. Please try again.');
        }
    });

    // /trending - Top gainers/losers (public - no auth required)
    bot.command(['trending', 'gainers', 'top'], async (ctx: any) => {
        const args = ctx.message.text.split(' ').slice(1);
        const filter = args[0]?.toLowerCase(); // optional: 'solana', 'eth', 'bsc', etc.

        await sendReply(ctx, '📊 *Fetching trending tokens...*', { parse_mode: 'Markdown' });

        try {
            const { dexScreenerService } = await import('./DEXScreenerService.js');
            
            // Get top boosted tokens
            const boostedTokens = await dexScreenerService.getTopBoostedTokens();
            
            // Get top pairs by volume
            const topPairs = await dexScreenerService.getTopPairs(50);
            
            // Filter by chain if specified
            let filteredPairs = topPairs;
            if (filter) {
                const chainMap: Record<string, string[]> = {
                    'sol': ['solana'],
                    'solana': ['solana'],
                    'eth': ['ethereum'],
                    'ethereum': ['ethereum'],
                    'bsc': ['bsc'],
                    'base': ['base'],
                    'arb': ['arbitrum'],
                    'arbitrum': ['arbitrum'],
                };
                const targetChains = chainMap[filter] || [filter];
                filteredPairs = topPairs.filter((p: any) => targetChains.includes(p.chainId));
            }

            // Sort by 24h price change to get top gainers
            const gainers = filteredPairs
                .filter((p: any) => p.priceChange?.h24 && p.liquidity?.usd >= 5000)
                .sort((a: any, b: any) => (b.priceChange?.h24 || 0) - (a.priceChange?.h24 || 0))
                .slice(0, 5);

            // Top losers
            const losers = filteredPairs
                .filter((p: any) => p.priceChange?.h24 && p.liquidity?.usd >= 5000)
                .sort((a: any, b: any) => (a.priceChange?.h24 || 0) - (b.priceChange?.h24 || 0))
                .slice(0, 5);

            let msg = `🔥 *Trending Tokens*${filter ? ` (${filter.toUpperCase()})` : ''}\n\n`;

            // Top Gainers
            msg += `📈 *Top Gainers*\n`;
            if (gainers.length > 0) {
                for (const pair of gainers) {
                    const symbol = pair.baseToken?.symbol || '???';
                    const change = pair.priceChange?.h24 || 0;
                    const vol = pair.volume?.h24 || 0;
                    msg += `🟢 *${escapeMarkdown(symbol)}* +${change.toFixed(1)}% • $${formatNumber(vol)} vol\n`;
                    msg += `   ⛓️ ${pair.chainId} • 💧 $${formatNumber(pair.liquidity?.usd || 0)}\n`;
                }
            } else {
                msg += `No significant gainers found.\n`;
            }

            msg += `\n📉 *Top Losers*\n`;
            if (losers.length > 0) {
                for (const pair of losers) {
                    const symbol = pair.baseToken?.symbol || '???';
                    const change = pair.priceChange?.h24 || 0;
                    const vol = pair.volume?.h24 || 0;
                    msg += `🔴 *${escapeMarkdown(symbol)}* ${change.toFixed(1)}% • $${formatNumber(vol)} vol\n`;
                    msg += `   ⛓️ ${pair.chainId} • 💧 $${formatNumber(pair.liquidity?.usd || 0)}\n`;
                }
            } else {
                msg += `No significant losers found.\n`;
            }

            // Add boosted tokens section
            if (boostedTokens && Array.isArray(boostedTokens) && boostedTokens.length > 0) {
                msg += `\n🚀 *Boosted Tokens*\n`;
                for (const token of boostedTokens.slice(0, 3)) {
                    msg += `⚡ ${escapeMarkdown(token.tokenAddress?.slice(0, 8) || 'Unknown')}... on ${token.chainId}\n`;
                }
            }

            msg += `\n💡 Use \`/token <symbol>\` for details`;

            await sendReply(ctx, msg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('[Telegram] Trending error:', error);
            await sendReply(ctx, '❌ Failed to fetch trending data. Please try again.');
        }
    });

    // /newtokens - Recently launched tokens (public - no auth required)
    bot.command(['newtokens', 'new', 'launches'], async (ctx: any) => {
        const args = ctx.message.text.split(' ').slice(1);
        const filter = args[0]?.toLowerCase(); // optional chain filter

        await sendReply(ctx, '🆕 *Finding new token launches...*', { parse_mode: 'Markdown' });

        try {
            const { dexScreenerService } = await import('./DEXScreenerService.js');
            
            // Get latest token profiles
            const profiles = await dexScreenerService.getLatestTokenProfiles();
            
            // Get recent pairs from search (common new token names)
            const searchResult = await dexScreenerService.searchPairs('pump');
            const allPairs = searchResult?.pairs || [];
            
            // Filter to recent pairs (created within last 24 hours)
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            
            let newPairs = allPairs.filter((p: any) => {
                if (!p.pairCreatedAt) return false;
                return p.pairCreatedAt >= oneDayAgo;
            });

            // Apply chain filter if specified
            if (filter) {
                const chainMap: Record<string, string[]> = {
                    'sol': ['solana'],
                    'solana': ['solana'],
                    'eth': ['ethereum'],
                    'ethereum': ['ethereum'],
                    'bsc': ['bsc'],
                    'base': ['base'],
                    'arb': ['arbitrum'],
                };
                const targetChains = chainMap[filter] || [filter];
                newPairs = newPairs.filter((p: any) => targetChains.includes(p.chainId));
            }

            // Filter by minimum liquidity ($1k) and sort by creation time
            newPairs = newPairs
                .filter((p: any) => (p.liquidity?.usd || 0) >= 1000)
                .sort((a: any, b: any) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0))
                .slice(0, 10);

            let msg = `🆕 *New Token Launches*${filter ? ` (${filter.toUpperCase()})` : ''}\n`;
            msg += `_Last 24 hours with >$1k liquidity_\n\n`;

            if (newPairs.length === 0) {
                msg += `No new tokens found matching criteria.\n\n`;
                msg += `💡 Try without chain filter or check back later.`;
            } else {
                for (const pair of newPairs) {
                    const symbol = pair.baseToken?.symbol || '???';
                    const name = pair.baseToken?.name || 'Unknown';
                    const liq = pair.liquidity?.usd || 0;
                    const vol = pair.volume?.h24 || 0;
                    const change = pair.priceChange?.h24 || 0;
                    const changeEmoji = change > 0 ? '📈' : change < 0 ? '📉' : '➖';

                    // Calculate age
                    const ageMs = now - pair.pairCreatedAt;
                    const ageHours = ageMs / (1000 * 60 * 60);
                    const ageStr = ageHours < 1 
                        ? `${Math.floor(ageMs / 60000)}m ago`
                        : `${ageHours.toFixed(1)}h ago`;

                    msg += `🪙 *${escapeMarkdown(symbol)}* - ${escapeMarkdown(name.slice(0, 20))}\n`;
                    msg += `   ⛓️ ${pair.chainId} • 🕐 ${ageStr}\n`;
                    msg += `   💧 $${formatNumber(liq)} • ${changeEmoji} ${change > 0 ? '+' : ''}${change.toFixed(1)}%\n`;
                    msg += `   📊 Vol: $${formatNumber(vol)}\n\n`;
                }

                msg += `⚠️ New tokens are high risk. DYOR!`;
            }

            await sendReply(ctx, msg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('[Telegram] New tokens error:', error);
            await sendReply(ctx, '❌ Failed to fetch new tokens. Please try again.');
        }
    });

    // ==========================================
    // END MEMECOIN COMMANDS
    // ==========================================

    // Handle natural language messages when user is in AI mode
    bot.on('message', async (ctx: any, next: () => Promise<void>) => {
        if (!ctx.message || !('text' in ctx.message)) return next();
        const text = ctx.message.text.trim();
        if (text.startsWith('/')) return next();

        const linkedUser = linkedUsers.get(ctx.from.id);
        if (!linkedUser) return next();

        // Handle Polymarket price alert input
        if (linkedUser.step?.startsWith('palert_')) {
            const parts = linkedUser.step.split('_');
            const outcome = parts[1] as 'yes' | 'no';
            const slug = parts.slice(2).join('_');

            linkedUser.step = '';

            // Parse input like "above 60" or "below 30" or just "50"
            const match = text.match(/^(above|below)?\s*(\d+(?:\.\d+)?)$/i);
            if (!match) {
                await sendReply(ctx, 
                    '❌ Invalid format.\n\n' +
                    'Examples:\n' +
                    '`above 60` - Alert when price goes above 60¢\n' +
                    '`below 30` - Alert when price drops below 30¢\n' +
                    '`50` - Alert when price reaches 50¢',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            const condition = (match[1]?.toLowerCase() || 'above') as 'above' | 'below';
            const targetPrice = parseFloat(match[2]) / 100; // Convert cents to decimal

            if (targetPrice < 0 || targetPrice > 1) {
                await sendReply(ctx, '❌ Price must be between 0 and 100.');
                return;
            }

            try {
                const { createPriceAlert } = await import('./PolymarketWatcher.js');
                const result = await createPriceAlert(
                    ctx.from.id,
                    linkedUser.userId,
                    slug,
                    outcome,
                    condition,
                    targetPrice
                );

                if (result.success) {
                    await sendReply(ctx, 
                        '✅ *Alert Created!*\n\n' +
                        `📊 ${escapeMarkdown(result.alert?.marketQuestion || slug)}\n` +
                        `${outcome === 'yes' ? '✅' : '❌'} ${outcome.toUpperCase()} ${condition} ${(targetPrice * 100).toFixed(0)}¢\n\n` +
                        `You'll be notified when triggered.`,
                        { parse_mode: 'Markdown' }
                    );
                } else {
                    await sendReply(ctx, `❌ ${result.error || 'Failed to create alert'}`);
                }
            } catch (error) {
                console.error('[Telegram] Create alert error:', error);
                await sendReply(ctx, '❌ Failed to create alert. Please try again.');
            }
            return;
        }

        // Handle AI mode
        if (linkedUser.step === 'ai_mode') {
            linkedUser.step = '';

            let context = '';
            if (linkedUser.watches.length > 0) {
                const wallets = linkedUser.watches.map(w => 
                    `${w.address.slice(0, 10)}...${w.address.slice(-4)} (${w.chain})`
                ).join(', ');
                context = `User is watching: ${wallets}`;
            }

            const answer = await askAI(text, context);
            await streamReply(ctx, answer);
            return;
        }

        return next();
    });
}

// === HELPER FUNCTIONS ===

/**
 * Escape markdown special characters for Telegram
 */
function escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * Format large numbers with K, M, B suffixes
 */
function formatNumber(num: number): string {
    if (!num || isNaN(num)) return '0';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
}

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

        await sendReply(ctx, msg, { parse_mode: 'Markdown' });

        saveScanHistory(linkedUser.userId, address, chain, result.overallRiskScore || 0);

    } catch (e: any) {
        await sendReply(ctx, `❌ Scan failed: ${e.message}`);
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
            await sendReply(ctx, msg, { parse_mode: 'Markdown' });
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
        await sendReply(ctx, successMsg, { parse_mode: 'Markdown' });
    }
}

// Helper to check if user needs to link account first
async function requireLinkedAccount(ctx: any): Promise<LinkedUser | null> {
    const linkedUser = linkedUsers.get(ctx.from.id);
    if (!linkedUser) {
        await sendReply(ctx, 
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
    await sendReply(ctx, 
        '🔗 *Connect Your Account*\n\n' +
        '1. Go to fundtracer.xyz → Profile\n' +
        '2. Click "Connect Telegram"\n' +
        '3. Enter the code shown\n\n' +
        'Your alerts will sync across site and Telegram.',
        { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
    );
}

async function showDashboard(ctx: any, user: LinkedUser) {
    await sendReply(ctx, 
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

interface StreamOptions {
    chatId: number;
    parseMode?: 'Markdown' | 'HTML';
    onChunk?: (chunk: string) => void;
}

async function streamReply(ctx: any, fullText: string, parseMode: 'Markdown' | 'HTML' = 'Markdown') {
    try {
        await bot.telegram.callApi('sendMessageDraft', {
            chat_id: ctx.from.id,
            text: fullText,
            parse_mode: parseMode === 'Markdown' ? 'Markdown' : 'HTML',
            stream: true
        });
    } catch (error) {
        console.error('[Telegram] sendMessageDraft error, falling back to regular reply:', error);
        await sendReply(ctx, fullText, { parse_mode: parseMode });
    }
}

// Streaming configuration - disabled for now to prevent duplicates
const STREAM_CONFIG = {
    charsPerChunk: 3,
    delayMs: 15,
    maxUpdates: 500,
    minTextLength: 999999 // Disable streaming by requiring very long messages
};

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendReply(ctx: any, textOrOptions: string | any, options: any = {}) {
    let text: string;
    let opts: any;
    
    if (typeof textOrOptions === 'string') {
        text = textOrOptions;
        opts = options;
    } else {
        text = '';
        opts = textOrOptions;
    }
    
    const parseMode = opts.parse_mode || 'Markdown';
    const chatId = ctx.from?.id || ctx.chat?.id;
    
    if (!chatId || !text) {
        // Fallback for edge cases
        return ctx.reply(text || textOrOptions, opts);
    }
    
    // Check if message has inline keyboard - skip streaming for these
    const hasReplyMarkup = opts.reply_markup || opts.inline_keyboard;
    
    // For short messages or messages with buttons, send instantly (no streaming)
    if (text.length < STREAM_CONFIG.minTextLength || hasReplyMarkup) {
        return ctx.reply(text, { parse_mode: parseMode, ...opts });
    }
    
    try {
        // Stream character by character for smooth effect
        let currentText = '';
        let charIndex = 0;
        
        // Send initial message with first few characters
        for (let i = 0; i < 3 && charIndex < text.length; i++) {
            currentText += text[charIndex];
            charIndex++;
        }
        currentText += '▌'; // Typing cursor
        
        // Send initial message (no markdown to avoid parsing issues during streaming)
        const sentMessage = await ctx.reply(currentText);
        const messageId = sentMessage.message_id;
        
        let updateCount = 0;
        
        // Stream remaining characters
        while (charIndex < text.length && updateCount < STREAM_CONFIG.maxUpdates) {
            await delay(STREAM_CONFIG.delayMs);
            
            // Remove cursor first
            currentText = currentText.replace('▌', '');
            
            // Add next chunk of characters
            for (let i = 0; i < STREAM_CONFIG.charsPerChunk && charIndex < text.length; i++) {
                currentText += text[charIndex];
                charIndex++;
            }
            
            // Add cursor if not done
            const displayText = charIndex < text.length ? currentText + '▌' : currentText;
            
            try {
                await ctx.telegram.editMessageText(
                    chatId,
                    messageId,
                    undefined,
                    displayText
                );
            } catch (editError: any) {
                // Ignore "message not modified" errors
                if (!editError.message?.includes('not modified')) {
                    console.error('[Telegram] Edit error:', editError.message);
                }
            }
            
            updateCount++;
        }
        
        // Final update with proper markdown formatting
        try {
            await ctx.telegram.editMessageText(
                chatId,
                messageId,
                undefined,
                text,
                { parse_mode: parseMode }
            );
        } catch (finalError: any) {
            // If markdown fails, send as plain text
            if (finalError.message?.includes("can't parse")) {
                await ctx.telegram.editMessageText(chatId, messageId, undefined, text);
            }
        }
        
    } catch (error: any) {
        console.error('[Telegram] Stream error:', error.message);
        // Fall back to regular reply
        await ctx.reply(text, { parse_mode: parseMode, ...opts });
    }
}

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

/**
 * Send a Polymarket alert message to a user
 */
export async function sendPolymarketAlert(telegramId: number, message: string): Promise<boolean> {
    if (!bot) {
        console.error('[Telegram] Bot not initialized');
        return false;
    }
    
    try {
        await bot.telegram.sendMessage(telegramId, message, { 
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        return true;
    } catch (error) {
        console.error(`[Telegram] Failed to send Polymarket alert to ${telegramId}:`, error);
        return false;
    }
}

/**
 * Get the bot instance for external use
 */
export function getBotInstance() {
    return bot;
}
