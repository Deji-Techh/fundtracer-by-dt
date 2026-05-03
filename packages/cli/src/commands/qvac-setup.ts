// ============================================================
// FundTracer CLI - QVAC Setup Command
// With model selection and embeddings support
// ============================================================

import chalk from 'chalk';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import net from 'net';
import ora from 'ora';
import inquirer from 'inquirer';

const execAsync = promisify(exec);

const c = {
    bold: chalk.bold,
    green: chalk.green,
    red: chalk.red,
    yellow: chalk.yellow,
    cyan: chalk.cyan,
    gray: chalk.gray,
};

const AVAILABLE_MODELS = [
    { id: 'QWEN3_140M_INST_Q4', name: 'Qwen3-140M', size: '~150MB', speed: 'Fastest', quality: 'Basic' },
    { id: 'QWEN3_600M_INST_Q4', name: 'Qwen3-600M', size: '~380MB', speed: 'Fast', quality: 'Good' },
    { id: 'QWEN3_1.8B_INST_Q4', name: 'Qwen3-1.8B', size: '~1.2GB', speed: 'Medium', quality: 'Better' },
    { id: 'QWEN3_4B_INST_Q4', name: 'Qwen3-4B', size: '~2.5GB', speed: 'Slow', quality: 'Best' },
];

export async function qvacSetupCommand() {
    console.log(c.bold('\n⚡ QVAC Setup - Local AI Server\n'));
    console.log(c.gray('Setting up local QVAC server for FundTracer AI...\n'));

    // Check docker availability
    const dockerSpinner = ora('Checking Docker...').start();
    try {
        await execAsync('docker --version', { timeout: 5000 });
        const daemonRunning = await checkDockerRunning();
        if (daemonRunning) {
            dockerSpinner.succeed('Docker available');
        } else {
            dockerSpinner.warn('Docker not running');
            console.log(c.gray('  Will use npm approach...\n'));
        }
    } catch {
        dockerSpinner.info('Docker not available');
        console.log(c.gray('  Will use npm approach...\n'));
    }

    // Check npm
    const npmSpinner = ora('Checking npm...').start();
    try {
        await execAsync('npm --version', { timeout: 5000 });
        npmSpinner.succeed('npm found');
    } catch {
        npmSpinner.fail('npm not found');
        console.log(c.red('\nError: npm is required\n'));
        console.log(c.cyan('  Install Node.js: ') + c.gray('https://nodejs.org/'));
        process.exit(1);
    }

// Show model options
    console.log(c.bold('\n📊 Available Models\n'));
    AVAILABLE_MODELS.forEach((m, i) => {
        const num = String(i + 1);
        const name = m.name;
        const size = m.size;
        const speed = m.speed;
        const qual = m.quality;
        console.log('  ' + c.cyan(num + '. ' + name) + ' ' + c.gray('(' + size + ')') + ' - ' + speed + ', ' + qual);
    });
    console.log();
    console.log(c.gray('  For embeddings: uses separate embedding model\n'));

    // Prompt user to select model
    const { modelChoice } = await inquirer.prompt([
        {
            type: 'input',
            name: 'modelChoice',
            message: 'Select model (1-4) or press Enter for default [2]:',
            default: '2',
            filter: (input: string) => input.trim() || '2'
        }
    ]);

    const choiceIndex = parseInt(modelChoice) - 1;
    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= AVAILABLE_MODELS.length) {
        console.log(c.yellow('Invalid choice, using default (Qwen3-600M)'));
    }

    const selectedModel = AVAILABLE_MODELS[Math.min(Math.max(0, choiceIndex), AVAILABLE_MODELS.length - 1)];
    console.log(c.cyan(`\n  → Using: ${selectedModel.name} (${selectedModel.size})\n`));

    // Create project directory
    const projectDir = path.join(process.env.HOME || process.env.USERPROFILE || '', '.fundtracer-qvac');
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
            name: 'fundtracer-qvac',
            type: 'module',
            private: true
        }, null, 2));
    }
    console.log(c.gray('  Installing to: ') + projectDir + '\n');

    // Install core QVAC packages (LLM for chat/similarity)
    const installSpinner = ora('Installing @qvac packages...').start();
    try {
        await execAsync('npm install @qvac/cli @qvac/sdk --force', {
            cwd: projectDir,
            timeout: 300000
        });
        installSpinner.succeed('@qvac packages installed');
    } catch (e: any) {
        installSpinner.fail('Install failed');
        console.log(c.red('Error: ' + e.message));
        process.exit(1);
    }

    // Create config with model definition
    const configSpinner = ora('Creating config...').start();
    const configPath = path.join(projectDir, 'qvac.config.json');
    const configContent = JSON.stringify({
        serve: {
            models: {
                "fundtracer-ai": {
                    model: selectedModel.id,
                    default: true,
                    preload: true
                }
            }
        }
    }, null, 2);
    fs.writeFileSync(configPath, configContent);
    configSpinner.succeed('Config created');

    // Kill any existing server
    const killSpinner = ora('Clearing port 11434...').start();
    try {
        await execAsync('fuser -k 11434/tcp 2>/dev/null || true', { timeout: 5000 });
        await new Promise(r => setTimeout(r, 1000));
        killSpinner.succeed('Port cleared');
    } catch {
        killSpinner.info('No existing server');
    }

    // Start server
    const startSpinner = ora('Starting QVAC server...').start();
    const serverStarted = await tryStartServer(projectDir);
    
    if (serverStarted) {
        startSpinner.succeed('QVAC server started');
    } else {
        startSpinner.warn('Could not start automatically');
    }

    // Verify
    const verifySpinner = ora('Verifying server...').start();
    const isRunning = await checkServerRunning();
    
    if (isRunning) {
        verifySpinner.succeed('Server is running on port 11434');
    } else {
        verifySpinner.warn('Server not responding');
    }

    // Show results
    console.log(c.bold('\n✅ QVAC Ready!\n'));
    
    if (isRunning) {
        console.log(c.bold('Server:'));
        console.log(c.cyan('  URL: ') + c.gray('http://127.0.0.1:11434'));
    } else {
        console.log(c.yellow('⚠️  Server not running - start manually:\n'));
        console.log(c.bold('Manual start:'));
        console.log(c.cyan('  cd ~/.fundtracer-qvac'));
        console.log(c.cyan('  node node_modules/@qvac/cli/dist/index.js serve openai'));
    }
    
    console.log();
    console.log(c.bold('Available Commands:'));
    console.log(c.cyan('  fundtracer analyze 0x... --ai    # Wallet analysis with AI'));
    console.log(c.cyan('  fundtracer ask "question"       # Ask about wallets'));
    console.log(c.cyan('  fundtracer chat              # Interactive chat'));
    console.log(c.cyan('  fundtracer similar 0x...     # Find similar wallets'));
    console.log(c.cyan('  fundtracer check-scam 0x...   # Check scam database'));
    console.log();
}

async function checkDockerRunning(): Promise<boolean> {
    try {
        const result = await execAsync('docker info');
        return result.stdout.includes('Server Version') || !result.stderr.includes('Cannot connect');
    } catch {
        return false;
    }
}

async function checkServerRunning(host: string = '127.0.0.1', port: number = 11434): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(port, host);
    });
}

async function tryStartServer(dir: string): Promise<boolean> {
    const cliPath = path.join(dir, 'node_modules', '@qvac', 'cli', 'dist', 'index.js');
    spawn('node', [cliPath, 'serve', 'openai'], {
        cwd: dir,
        detached: true,
        stdio: 'ignore'
    }).unref();
    
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        if (await checkServerRunning()) return true;
    }
    return false;
}