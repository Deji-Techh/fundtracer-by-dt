// ============================================================
// FundTracer CLI - Chat Command
// Interactive AI chat mode using QVAC with streaming
// ============================================================

import chalk from 'chalk';
import inquirer from 'inquirer';
import { checkQVACAvailable, streamCompletion, printQVACNotAvailable, QVACMessage, sendCompletion } from '../ai.js';

const c = {
    bold: chalk.bold,
    green: chalk.green,
    red: chalk.red,
    cyan: chalk.cyan,
    yellow: chalk.yellow,
    gray: chalk.gray,
};

const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const CHAT_SYSTEM_PROMPT = `You are FundTracer AI, an expert blockchain forensics analyst specializing in scam detection.

## What FundTracer Does
FundTracer detects suspicious on-chain behavior:
- RAPID MOVEMENT: Funds moving quickly through many addresses (money laundering)
- SAME-BLOCK: Multiple txs in same block (bot/MEV activity)  
- SYBIL: Coordinated activity from multiple fake identities
- CIRCULAR: Funds cycling through addresses (layering)
- DUST: Spam tiny amounts to fingerprint addresses
- FRESH: Newly created wallets with immediate suspicious activity
- WASH: Artificial trading volume to manipulate prices

## Risk Scoring
- 75+ = CRITICAL (scam/juice likely)
- 50+ = HIGH risk
- 25+ = MEDIUM risk
- 0-25 = LOW risk (normal activity)

## Your Task
Analyze the wallet data and provide SPECIFIC, ACTIONABLE insights.
- If LOW RISK: Say "LOW RISK - appears to be a regular [user type]"
- If suspicious: Explain WHY with specific evidence from the data
- NEVER just restate the numbers - interpret what they mean

IMPORTANT: Provide actual analysis, not generic filler text.
CRITICAL: Never include thinking tags - just output the response directly without any internal AI thinking.`;

function cleanResponse(text: string): string {
    const openTag = '<think>';
    const closeTag = '</think>';
    let result = text;
    let start = result.indexOf(openTag);
    while (start !== -1) {
        const end = result.indexOf(closeTag, start);
        if (end === -1) break;
        result = result.slice(0, start) + result.slice(end + closeTag.length);
        start = result.indexOf(openTag, start);
    }
    return result.trim();
}

function getInstantResponse(input: string): string | null {
    const lower = input.toLowerCase().trim();
    const instant: Record<string, string> = {
        'hi': 'Hey! How can I help with wallet analysis?',
        'hello': 'Hi there! What wallet would you like to analyze?',
        'hey': 'Hey! Need help with a wallet?',
        'sup': 'Hey! What can I help you with?',
        'help': 'I can analyze wallets, ask questions, or chat. Try: fundtracer analyze 0x... --ai',
        '?': 'I help analyze blockchain wallets. Try: fundtracer analyze 0x... --ai',
        'commands': 'Commands: analyze, ask, explain, chat. Example: fundtracer analyze 0x... --ai',
    };
    return instant[lower] || null;
}

export async function chatCommand() {
    console.log(c.bold('\n💬 FundTracer AI Chat\n'));

    process.stdout.write('Checking for QVAC... ');
    const available = await checkQVACAvailable();

    if (!available) {
        console.log(c.red('not running'));
        printQVACNotAvailable();
        process.exit(1);
    }

    console.log(c.green('✓ connected'));
    console.log(c.gray('  Type "exit" to quit, "clear" to reset conversation\n'));

    const history: QVACMessage[] = [];

    while (true) {
        try {
            const { input } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'input',
                    message: c.cyan('You:'),
                    prefix: '',
                },
            ]);

            if (!input.trim()) continue;

            if (input.toLowerCase() === 'exit') {
                console.log(c.gray('\nGoodbye!\n'));
                break;
            }

            if (input.toLowerCase() === 'clear') {
                history.length = 0;
                console.log(c.gray('Conversation cleared\n'));
                continue;
            }

            // Check for instant response (no AI needed)
            const instantReply = getInstantResponse(input);
            if (instantReply) {
                console.log(c.bold('\n🤖 FundTracer AI:'));
                console.log(c.cyan(instantReply));
                console.log('');
                continue;
            }

            // Stream response with loading animation
            const messages: QVACMessage[] = [
                { role: 'system', content: CHAT_SYSTEM_PROMPT },
                ...history,
                { role: 'user', content: input },
            ];

            let spinnerIndex = 0;
            let loadingInterval: NodeJS.Timeout;

            const startSpinner = () => {
                loadingInterval = setInterval(() => {
                    process.stdout.write(`\r${c.gray(spinners[spinnerIndex] + ' Thinking...')}`);
                    spinnerIndex = (spinnerIndex + 1) % spinners.length;
                }, 80);
            };

            const stopSpinner = () => {
                clearInterval(loadingInterval);
                process.stdout.write('\r' + ' '.repeat(20) + '\r');
            };

            startSpinner();

            let fullResponse = '';
            const success = await streamCompletion(
                messages,
                (chunk) => { fullResponse += chunk; },
                { max_tokens: 5000 }
            );

            stopSpinner();

            if (success && fullResponse) {
                const cleaned = cleanResponse(fullResponse);
                console.log(c.bold('\n🤖 FundTracer AI:'));
                console.log(c.cyan(cleaned));

                history.push({ role: 'user', content: input });
                history.push({ role: 'assistant', content: cleaned });
            } else {
                console.log(c.red('\nFailed to get response'));
            }

            console.log('');
        } catch (e: any) {
            if (e.isTtyError) {
                console.log(c.red('Terminal error'));
                break;
            }
            if (e.message === 'canceled' || e.message === 'User force closed') {
                console.log(c.gray('\nCancelled\n'));
                continue;
            }
            console.log(c.red('Error: ' + e.message));
        }
    }
}