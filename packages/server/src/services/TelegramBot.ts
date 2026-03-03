/**
 * FundTracer Telegram Bot
 * Wallet alerts via Telegram with AI-powered transaction analysis
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

interface WatchedWallet {
    address: string;
    chain: string;
    addedAt: number;
    lastAlert?: number;
}

interface UserSession {
    watches: WatchedWallet[];
    alertFrequency: 'realtime' | '20min' | '30min' | '1hr';
    step?: string;
    pendingAddress?: string;
}

const userScenes: Map<number, UserSession> = new Map();
const chains = ['ethereum', 'linea', 'arbitrum', 'base', 'optimism', 'polygon'];

let bot: any = null;

export async function createTelegramBot() {
    if (!BOT_TOKEN) {
        console.log('[Telegram] Bot token not configured, skipping...');
        return null;
    }

    try {
        const { Telegraf, Markup } = await import('telegraf');
        bot = new Telegraf(BOT_TOKEN);

        // Start command
        bot.command('start', async (ctx: any) => {
            const userId = ctx.from.id;
            initUserSession(userId);

            await ctx.reply(
                '🔍 *FundTracer Alert Bot*\n\n' +
                'Monitor wallets and get AI-powered alerts when they move funds.\n\n' +
                '_Connected to your FundTracer account_',
                { parse_mode: 'Markdown' }
            );

            await showMainMenu(ctx);
        });

        // Help
        bot.command('help', async (ctx: any) => {
            await ctx.reply(
                '*Commands*\n\n' +
                '/start - Start the bot\n' +
                '/add - Add wallet to watchlist\n' +
                '/list - List watched wallets\n' +
                '/remove - Remove a wallet\n' +
                '/frequency - Set alert frequency\n' +
                '/status - View your alerts\n' +
                '/help - Show this help',
                { parse_mode: 'Markdown' }
            );
        });

        // Add wallet - ask for address
        bot.command('add', async (ctx: any) => {
            const userId = ctx.from.id;
            initUserSession(userId);
            const session = userScenes.get(userId)!;
            session.step = 'awaiting_address';

            await ctx.reply(
                '📝 *Add Wallet to Watchlist*\n\n' +
                'Enter wallet address (0x...)',
                { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
            );
        });

        // Handle message text (address input)
        bot.on('message', async (ctx: any, next: () => Promise<void>) => {
            if (!ctx.message || !('text' in ctx.message)) return next();
            const text = ctx.message.text;

            // Skip if it's a command
            if (text.startsWith('/')) return next();

            const userId = ctx.from.id;
            const session = userScenes.get(userId);

            if (!session) return next();

            // Handle address input
            if (session.step === 'awaiting_address') {
                if (!/^0x[a-fA-F0-9]{40}$/.test(text)) {
                    await ctx.reply('❌ Invalid address. Must be 0x... format');
                    return;
                }

                session.pendingAddress = text.toLowerCase();
                session.step = 'select_chain';

                const buttons = chains.map(c => 
                    Markup.button.callback(c.charAt(0).toUpperCase() + c.slice(1), `chain_${c}`)
                );

                await ctx.reply(
                    'Select blockchain:',
                    Markup.inlineKeyboard(buttons)
                );
            }
        });

        // Handle chain selection
        bot.action(/chain_(.+)/, async (ctx: any) => {
            const userId = ctx.from.id;
            const chain = ctx.match![1];
            const session = userScenes.get(userId);

            if (!session || !session.pendingAddress) return;

            // Add wallet to watchlist
            session.watches.push({
                address: session.pendingAddress,
                chain: chain,
                addedAt: Date.now()
            });

            session.step = '';
            session.pendingAddress = undefined;

            await ctx.editMessageText(
                `✅ Now monitoring wallet on *${chain.toUpperCase()}*\n\n` +
                'You will receive alerts based on your frequency setting.',
                { parse_mode: 'Markdown' }
            );

            await showMainMenu(ctx);
        });

        // List wallets
        bot.command('list', async (ctx: any) => {
            const userId = ctx.from.id;
            const session = userScenes.get(userId);

            if (!session || session.watches.length === 0) {
                await ctx.reply('No wallets being monitored. Use /add to add one.');
                return;
            }

            let message = '📋 *Watched Wallets*\n\n';
            session.watches.forEach((w, i) => {
                message += `${i + 1}. \`${w.address.slice(0, 10)}...${w.address.slice(-4)}\`\n`;
                message += `   Chain: ${w.chain.toUpperCase()}\n`;
                message += `   Added: ${new Date(w.addedAt).toLocaleDateString()}\n\n`;
            });

            await ctx.reply(message, { parse_mode: 'Markdown' });
        });

        // Set frequency
        bot.command('frequency', async (ctx: any) => {
            await ctx.reply(
                '⏰ *Alert Frequency*\n\n' +
                'Choose how often to receive alerts:',
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback('⚡ Real-time', 'freq_realtime'),
                            Markup.button.callback('🕐 Every 20 min', 'freq_20min'),
                        ],
                        [
                            Markup.button.callback('🕒 Every 30 min', 'freq_30min'),
                            Markup.button.callback('🕓 Every 1 hour', 'freq_1hr'),
                        ]
                    ])
                }
            );
        });

        bot.action(/freq_(.+)/, async (ctx: any) => {
            const userId = ctx.from.id;
            const freq = ctx.match![1] as UserSession['alertFrequency'];
            const session = userScenes.get(userId);

            if (session) {
                session.alertFrequency = freq;
            }

            const freqLabels: Record<string, string> = {
                'realtime': '⚡ Real-time',
                '20min': '🕐 Every 20 minutes',
                '30min': '🕒 Every 30 minutes',
                '1hr': '🕓 Every hour'
            };

            await ctx.editMessageText(
                `✅ Alert frequency set to: ${freqLabels[freq]}`,
                { parse_mode: 'Markdown' }
            );
        });

        // Remove wallet
        bot.command('remove', async (ctx: any) => {
            const userId = ctx.from.id;
            const session = userScenes.get(userId);

            if (!session || session.watches.length === 0) {
                await ctx.reply('No wallets to remove.');
                return;
            }

            const buttons = session.watches.map((w, i) =>
                [Markup.button.callback(
                    `${w.address.slice(0, 8)}...${w.address.slice(-4)}`,
                    `remove_${i}`
                )]
            );

            await ctx.reply(
                '❌ *Remove Wallet*\n\nSelect wallet to remove:',
                { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
            );
        });

        bot.action(/remove_(\d+)/, async (ctx: any) => {
            const userId = ctx.from.id;
            const index = parseInt(ctx.match![1]);
            const session = userScenes.get(userId);

            if (session && session.watches[index]) {
                const removed = session.watches.splice(index, 1)[0];
                await ctx.editMessageText(
                    `✅ Removed \`${removed.address.slice(0, 10)}...\``,
                    { parse_mode: 'Markdown' }
                );
            }
        });

        // Status
        bot.command('status', async (ctx: any) => {
            const userId = ctx.from.id;
            const session = userScenes.get(userId);

            const freq = session?.alertFrequency || 'realtime';
            const count = session?.watches.length || 0;

            await ctx.reply(
                '📊 *Alert Status*\n\n' +
                `Wallets monitored: ${count}\n` +
                `Frequency: ${freq}\n` +
                `Plan: Free (${count}/10 alerts)`,
                { parse_mode: 'Markdown' }
            );
        });

        // Start bot
        await bot.launch();
        console.log('[Telegram] Bot started successfully');

        return bot;
    } catch (error) {
        console.error('[Telegram] Failed to start bot:', error);
        return null;
    }
}

function initUserSession(userId: number) {
    if (!userScenes.has(userId)) {
        userScenes.set(userId, {
            watches: [],
            alertFrequency: 'realtime'
        });
    }
}

async function showMainMenu(ctx: any) {
    await ctx.reply(
        'What would you like to do?',
        Markup.keyboard([
            ['➕ Add Wallet', '📋 My Wallets'],
            ['⏰ Frequency', '❌ Remove'],
            ['📊 Status', '❓ Help']
        ])
    );
}

// Get user session (for alert worker)
export function getUserSession(userId: number): UserSession | undefined {
    return userScenes.get(userId);
}

// Get all watched wallets (for alert worker)
export function getAllWatchedWallets(): Array<{userId: number, wallet: WatchedWallet}> {
    const result: Array<{userId: number, wallet: WatchedWallet}> = [];
    userScenes.forEach((session, userId) => {
        session.watches.forEach(wallet => {
            result.push({ userId, wallet });
        });
    });
    return result;
}

// Send alert to user
export async function sendTelegramAlert(
    userId: number,
    wallet: string,
    chain: string,
    txData: {
        hash: string;
        from: string;
        to: string;
        value: number;
        isIncoming: boolean;
    },
    aiAnalysis?: string
) {
    if (!bot) {
        console.log('[Telegram] Bot not initialized');
        return;
    }

    try {
        const direction = txData.isIncoming ? '📥 Received' : '📤 Sent';
        const valueEth = txData.value.toFixed(4);

        let message = `🔔 *Wallet Alert*\n\n`;
        message += `${direction}: *${valueEth} ETH*\n`;
        message += `Wallet: \`${wallet.slice(0, 10)}...${wallet.slice(-4)}\`\n`;
        message += `Chain: ${chain.toUpperCase()}\n`;
        message += `\n[View Transaction](https://etherscan.io/tx/${txData.hash})`;

        if (aiAnalysis) {
            message += `\n\n🤖 *AI Analysis*\n_${aiAnalysis}_`;
        }

        await bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('[Telegram] Failed to send alert:', error);
    }
}

// AI Transaction Analysis with Groq
export async function analyzeTransactionWithAI(txData: {
    hash: string;
    from: string;
    to: string;
    value: number;
    chain: string;
    timestamp: number;
}): Promise<string> {
    if (!GROQ_API_KEY) {
        return 'AI analysis unavailable (no API key)';
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                    role: 'user',
                    content: `Analyze this blockchain transaction in 2-3 sentences. What is happening? Is it suspicious?\n\nTransaction:
- Hash: ${txData.hash}
- From: ${txData.from}
- To: ${txData.to}
- Value: ${txData.value} ETH
- Chain: ${txData.chain}
- Time: ${new Date(txData.timestamp * 1000).toISOString()}`
                }],
                temperature: 0.3,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            throw new Error('Groq API error');
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Analysis unavailable';
    } catch (error) {
        console.error('[Groq] Analysis error:', error);
        return 'AI analysis failed';
    }
}
