/**
 * FundTracer Telegram Bot - Account Linking
 * Users connect their site account to Telegram via unique code
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

interface WatchedWallet {
    address: string;
    chain: string;
    addedAt: number;
    lastAlert?: number;
}

interface LinkedUser {
    userId: string;        // Firebase UID from site
    telegramId: number;
    tier: 'free' | 'pro' | 'max';
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
    expiresAt: number;
}

// In-memory storage (would use Redis/database in production)
const linkedUsers: Map<number, LinkedUser> = new Map();  // telegramId -> user
const pendingCodes: Map<string, PendingCode> = new Map(); // code -> pending link

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

        // Start - requires account linking
        bot.command('start', async (ctx: any) => {
            const telegramId = ctx.from.id;
            const linkedUser = linkedUsers.get(telegramId);

            if (linkedUser) {
                await showDashboard(ctx, linkedUser);
            } else {
                await showLinkAccount(ctx);
            }
        });

        // Link command - connect site account
        bot.command('link', async (ctx: any) => {
            await showLinkAccount(ctx);
        });

        // Handle link code
        bot.action(/link_(.+)/, async (ctx: any) => {
            const code = ctx.match![1];
            const pending = pendingCodes.get(code);
            const telegramId = ctx.from.id;

            if (!pending || pending.expiresAt < Date.now()) {
                await ctx.editMessageText(
                    '❌ Link code expired or invalid.\n\n' +
                    'Go to your FundTracer profile to generate a new code.',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Link accounts
            const linkedUser: LinkedUser = {
                userId: pending.userId,
                telegramId: telegramId,
                tier: pending.tier as any,
                watches: [],
                alertFrequency: 'realtime',
                linkedAt: Date.now()
            };

            linkedUsers.set(telegramId, linkedUser);
            pendingCodes.delete(code);

            await ctx.editMessageText(
                '✅ *Account Linked!*\n\n' +
                `Your Telegram is now connected to FundTracer.\n` +
                `Plan: ${pending.tier.toUpperCase()}\n\n` +
                'Use /add to start watching wallets.',
                { parse_mode: 'Markdown' }
            );
        });

        // Add wallet (requires linking)
        bot.command('add', async (ctx: any) => {
            const telegramId = ctx.from.id;
            const linkedUser = linkedUsers.get(telegramId);

            if (!linkedUser) {
                await ctx.reply(
                    '⚠️ *Account Not Linked*\n\n' +
                    'Connect your FundTracer account first:\n' +
                    '1. Go to fundtracer.xyz → Profile\n' +
                    '2. Click "Connect Telegram"\n' +
                    '3. Enter the code here',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Check limit based on tier
            const maxWallets = linkedUser.tier === 'free' ? 10 : linkedUser.tier === 'pro' ? 100 : 1000;
            if (linkedUser.watches.length >= maxWallets) {
                await ctx.reply(
                    `❌ Wallet limit reached (${maxWallets})\n\n` +
                    'Upgrade your plan for more wallets.',
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            linkedUser.step = 'awaiting_address';
            await ctx.reply(
                '📝 *Add Wallet*\n\n' +
                'Enter wallet address (0x...)',
                { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
            );
        });

        // Handle address input
        bot.on('message', async (ctx: any, next: () => Promise<void>) => {
            if (!ctx.message || !('text' in ctx.message)) return next();
            const text = ctx.message.text;
            if (text.startsWith('/')) return next();

            const telegramId = ctx.from.id;
            const linkedUser = linkedUsers.get(telegramId);
            if (!linkedUser || !linkedUser.step) return next();

            if (linkedUser.step === 'awaiting_address') {
                if (!/^0x[a-fA-F0-9]{40}$/.test(text)) {
                    await ctx.reply('❌ Invalid address format');
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
            const telegramId = ctx.from.id;
            const chain = ctx.match![1];
            const linkedUser = linkedUsers.get(telegramId);

            if (!linkedUser || !linkedUser.pendingAddress) return;

            // Add wallet
            linkedUser.watches.push({
                address: linkedUser.pendingAddress,
                chain: chain,
                addedAt: Date.now()
            });

            const chainEmoji = { ethereum: '🔷', linea: '⚫', arbitrum: '🔵', base: '🔵', optimism: '🔴', polygon: '🟣' };

            linkedUser.step = '';
            linkedUser.pendingAddress = undefined;

            await ctx.editMessageText(
                `✅ Now watching wallet on *${chain.toUpperCase()}*\n\n` +
                `${chainEmoji[chain as keyof typeof chainEmoji]} ${chain}\n` +
                `Address: \`${linkedUser.watches[linkedUser.watches.length - 1].address.slice(0, 10)}...\``,
                { parse_mode: 'Markdown' }
            );
        });

        // List wallets
        bot.command('list', async (ctx: any) => {
            const telegramId = ctx.from.id;
            const linkedUser = linkedUsers.get(telegramId);

            if (!linkedUser) {
                await ctx.reply('Use /link first to connect your account');
                return;
            }

            if (linkedUser.watches.length === 0) {
                await ctx.reply('No wallets. Use /add to add one.');
                return;
            }

            let message = '📋 *Watched Wallets*\n\n';
            linkedUser.watches.forEach((w, i) => {
                message += `${i + 1}. \`${w.address.slice(0, 10)}...${w.address.slice(-4)}\`\n`;
                message += `   ${w.chain.toUpperCase()}\n\n`;
            });

            message += `Limit: ${linkedUser.watches.length}/${linkedUser.tier === 'free' ? 10 : linkedUser.tier === 'pro' ? 100 : '∞'}`;

            await ctx.reply(message, { parse_mode: 'Markdown' });
        });

        // Remove wallet
        bot.command('remove', async (ctx: any) => {
            const telegramId = ctx.from.id;
            const linkedUser = linkedUsers.get(telegramId);

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
            const telegramId = ctx.from.id;
            const index = parseInt(ctx.match![1]);
            const linkedUser = linkedUsers.get(telegramId);

            if (linkedUser && linkedUser.watches[index]) {
                const removed = linkedUser.watches.splice(index, 1)[0];
                await ctx.editMessageText(`✅ Removed \`${removed.address.slice(0, 10)}...\``);
            }
        });

        // Frequency
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

        // Status
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

        // Unlink
        bot.command('unlink', async (ctx: any) => {
            const linkedUser = linkedUsers.get(ctx.from.id);
            if (linkedUser) {
                linkedUsers.delete(ctx.from.id);
                await ctx.reply('✅ Account unlinked. Use /link to connect again.');
            } else {
                await ctx.reply('No account linked.');
            }
        });

        await bot.launch();
        console.log('[Telegram] Bot started');

        return bot;
    } catch (error) {
        console.error('[Telegram] Failed to start:', error);
        return null;
    }
}

async function showLinkAccount(ctx: any) {
    await ctx.reply(
        '🔗 *Connect Your Account*\n\n' +
        '1. Go to fundtracer.xyz → Profile\n' +
        '2. Click "Connect Telegram"\n' +
        '3. Enter the code shown here\n\n' +
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
        `/add - Add wallet\n` +
        `/list - View wallets\n` +
        `/remove - Remove wallet\n` +
        `/frequency - Set alerts\n` +
        `/status - View status\n` +
        `/unlink - Disconnect`,
        { parse_mode: 'Markdown' }
    );
}

// Generate link code (called from API when user clicks "Connect Telegram" on site)
export function generateLinkCode(userId: string, tier: string): string {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    pendingCodes.set(code, {
        code,
        userId,
        tier,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    return code;
}

// Verify link (called from bot when user enters code)
export function verifyLinkCode(code: string): { userId: string, tier: string } | null {
    const pending = pendingCodes.get(code);
    if (!pending || pending.expiresAt < Date.now()) {
        return null;
    }
    return { userId: pending.userId, tier: pending.tier };
}

// Get linked users for alert worker
export function getAllLinkedUsers(): LinkedUser[] {
    return Array.from(linkedUsers.values());
}

// Get user session
export function getLinkedUser(telegramId: number): LinkedUser | undefined {
    return linkedUsers.get(telegramId);
}

// Send alert
export async function sendAlert(
    telegramId: number,
    wallet: string,
    chain: string,
    tx: { hash: string; value: number; isIncoming: boolean },
    aiAnalysis?: string
) {
    if (!bot) return;

    const direction = tx.isIncoming ? '📥' : '📤';
    
    let message = `🔔 *Alert*\n\n`;
    message += `${direction} *${tx.value.toFixed(4)} ETH*\n`;
    message += `Wallet: \`${wallet.slice(0, 10)}...${wallet.slice(-4)}\`\n`;
    message += `Chain: ${chain.toUpperCase()}\n`;
    message += `[View Tx](https://etherscan.io/tx/${tx.hash})`;

    if (aiAnalysis) {
        message += `\n\n🤖 *AI*: ${aiAnalysis}`;
    }

    try {
        await bot.telegram.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    } catch (e) {
        console.error('[Telegram] Send error:', e);
    }
}

// AI Analysis
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
                    content: `Explain in 1 sentence: ${tx.value} ETH transferred on ${tx.chain}. From: ${tx.from.slice(0,6)}...${tx.from.slice(-4)}, To: ${tx.to?.slice(0,6)}...${tx.to?.slice(-4)}. Is it suspicious?`
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
