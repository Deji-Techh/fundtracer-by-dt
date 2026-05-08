// ============================================================
// FundTracer CLI - QVAC Setup Command
// With model download progress and improved reliability
// ============================================================

import chalk from 'chalk';
import { exec, spawn, ChildProcess } from 'child_process';
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
    { id: 'QWEN3_600M_INST_Q4', name: 'Qwen3-600M', size: '~380MB', speed: 'Fast', quality: 'Good', fileMatch: 'Qwen3-0.6B' },
    { id: 'QWEN3_1_7B_INST_Q4', name: 'Qwen3-1.7B', size: '~1.2GB', speed: 'Medium', quality: 'Better', fileMatch: 'Qwen3-1.7B' },
    { id: 'QWEN3_4B_INST_Q4_K_M', name: 'Qwen3-4B', size: '~2.5GB', speed: 'Slow', quality: 'Best', fileMatch: 'Qwen3-4B' },
    { id: 'QWEN3_8B_INST_Q4_K_M', name: 'Qwen3-8B', size: '~5GB', speed: 'Slowest', quality: 'Ultra', fileMatch: 'Qwen3-8B' },
];

let qvacProcess: ChildProcess | null = null;

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

    // Check if packages already installed
    const cliPath = path.join(projectDir, 'node_modules', '@qvac', 'cli', 'package.json');
    const sdkPath = path.join(projectDir, 'node_modules', '@qvac', 'sdk', 'package.json');
    const packagesInstalled = fs.existsSync(cliPath) && fs.existsSync(sdkPath);

    if (packagesInstalled) {
        console.log(c.green('  ✓ @qvac packages already installed'));
    } else {
        // Install with progress - separate CLI and SDK
        console.log(c.bold('\n📦 Installing Packages\n'));
        
        const cliSpinner = ora('Installing @qvac/cli...').start();
        try {
            await execAsync('npm install @qvac/cli --force', {
                cwd: projectDir,
                timeout: 300000
            });
            cliSpinner.succeed('@qvac/cli installed');
        } catch (e: any) {
            cliSpinner.fail('Failed to install @qvac/cli');
            console.log(c.red('Error: ' + e.message));
            process.exit(1);
        }

        const sdkSpinner = ora('Installing @qvac/sdk...').start();
        try {
            await execAsync('npm install @qvac/sdk --force', {
                cwd: projectDir,
                timeout: 300000
            });
            sdkSpinner.succeed('@qvac/sdk installed');
        } catch (e: any) {
            sdkSpinner.fail('Failed to install @qvac/sdk');
            console.log(c.red('Error: ' + e.message));
            process.exit(1);
        }
    }

    // Check if model is already downloaded
    const modelCacheDir = path.join(process.env.HOME || '', '.qvac', 'models');
    let modelDownloaded = false;
    let existingModelFile = '';

    if (fs.existsSync(modelCacheDir)) {
        const files = fs.readdirSync(modelCacheDir);
        for (const file of files) {
            if (file.includes(selectedModel.fileMatch) && file.endsWith('.gguf')) {
                modelDownloaded = true;
                existingModelFile = file;
                break;
            }
        }
    }

    // Create/update config
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

    // Download model if not present
    if (modelDownloaded) {
        console.log(c.green(`  ✓ Model already downloaded: ${existingModelFile}`));
    } else {
        console.log(c.bold('\n📥 Downloading Model\n'));
        console.log(c.gray(`  Downloading ${selectedModel.name} to ~/.qvac/models/...`));
        console.log(c.gray('  This may take several minutes depending on your connection...\n'));

        // Kill any existing server first
        await killQvacServer();

        const downloadSpinner = ora('Downloading ' + selectedModel.name + '...').start();
        
        try {
            const cliPath = path.join(projectDir, 'node_modules', '@qvac', 'cli', 'dist', 'index.js');
            
            // Start the server - it will download the model on first run
            const downloadProcess = spawn('node', [cliPath, 'serve', 'openai', '-v'], {
                cwd: projectDir,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let lastProgress = '';
            let lastPercent = 0;
            
            downloadProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                
                // Look for download progress
                const percentMatch = output.match(/(\d+)%/);
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1]);
                    if (percent > lastPercent) {
                        downloadSpinner.text = `Downloading ${selectedModel.name}: ${percent}%`;
                        lastPercent = percent;
                    }
                }
                
                // Also check for "downloading" or "Downloading" in output
                if (output.toLowerCase().includes('downloading') && !output.includes('%')) {
                    const lines = output.split('\n').filter(l => l.toLowerCase().includes('downloading'));
                    if (lines.length > 0) {
                        downloadSpinner.text = lines[0].substring(0, 60);
                    }
                }
            });

            downloadProcess.stderr?.on('data', (data: Buffer) => {
                const output = data.toString();
                
                // Look for download progress in stderr too
                const percentMatch = output.match(/(\d+)%/);
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1]);
                    if (percent > lastPercent) {
                        downloadSpinner.text = `Downloading ${selectedModel.name}: ${percent}%`;
                        lastPercent = percent;
                    }
                }
                
                if (output.toLowerCase().includes('downloading') && !output.includes('%')) {
                    const lines = output.split('\n').filter(l => l.toLowerCase().includes('downloading'));
                    if (lines.length > 0) {
                        downloadSpinner.text = lines[0].substring(0, 60);
                    }
                }
            });

            // Wait for server to start (which means model downloaded)
            const maxWaitTime = 600000; // 10 minutes
            const startTime = Date.now();
            let serverStarted = false;

            while (!serverStarted && (Date.now() - startTime) < maxWaitTime) {
                await new Promise(r => setTimeout(r, 3000));
                if (await checkServerRunning()) {
                    serverStarted = true;
                }
            }

            // Kill the download server - we'll start fresh
            downloadProcess.kill('SIGTERM');
            await new Promise(r => setTimeout(r, 2000));

            if (serverStarted) {
                downloadSpinner.succeed(selectedModel.name + ' downloaded and verified');
            } else {
                downloadSpinner.warn('Download may not have completed fully');
                console.log(c.gray('  Will attempt to start server...\n'));
            }
        } catch (e: any) {
            downloadSpinner.warn('Download issue: ' + e.message);
            console.log(c.gray('  Will attempt to start server...\n'));
        }
    }

    // Kill any existing server on port 11434
    console.log(c.bold('\n🚀 Starting Server\n'));
    const killSpinner = ora('Clearing port 11434...').start();
    try {
        await killQvacServer();
        await new Promise(r => setTimeout(r, 1000));
        killSpinner.succeed('Port cleared');
    } catch {
        killSpinner.info('Port ready');
    }

    // Start server with improved reliability
    const startSpinner = ora('Starting QVAC server...').start();
    const serverStarted = await tryStartServer(projectDir, selectedModel.name);
    
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
        console.log(c.cyan('  Model: ') + c.gray(selectedModel.name));
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
    console.log(c.cyan('  fundtracer qvac stop         # Stop the server'));
    console.log();
}

async function killQvacServer(): Promise<void> {
    try {
        await execAsync('fuser -k 11434/tcp 2>/dev/null || true', { timeout: 5000 });
    } catch {
        // Ignore
    }
    
    try {
        await execAsync('pkill -f "qvac.*serve" 2>/dev/null || true', { timeout: 5000 });
    } catch {
        // Ignore
    }
    
    await new Promise(r => setTimeout(r, 500));
}

export async function qvacStopCommand() {
    console.log(c.bold('\n🛑 Stopping QVAC Server\n'));
    
    const killSpinner = ora('Stopping server...').start();
    
    try {
        await killQvacServer();
        
        await new Promise(r => setTimeout(r, 1000));
        const isRunning = await checkServerRunning();
        
        if (!isRunning) {
            killSpinner.succeed('QVAC server stopped');
        } else {
            killSpinner.warn('Server may still be running');
        }
    } catch (e: any) {
        killSpinner.fail('Failed to stop: ' + e.message);
    }
    
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
        socket.setTimeout(3000);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.connect(port, host);
    });
}

async function checkModelLoaded(): Promise<boolean> {
    try {
        const response = await fetch('http://127.0.0.1:11434/v1/models', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
            const data = await response.json() as { data?: { id: string }[] | undefined };
            return !!(data?.data && data.data.length > 0);
        }
        return false;
    } catch {
        return false;
    }
}

async function tryStartServer(dir: string, modelName: string): Promise<boolean> {
    const cliPath = path.join(dir, 'node_modules', '@qvac', 'cli', 'dist', 'index.js');
    
    // Calculate wait time based on model size -大幅增加!
    // 600M: ~30s, 1.7B: ~90s, 4B: ~240s, 8B: ~360s
    let maxRetries = 30;
    
    if (modelName.includes('4B')) {
        maxRetries = 200; // 400 seconds (6+ minutes!)
    } else if (modelName.includes('8B')) {
        maxRetries = 300; // 600 seconds
    } else if (modelName.includes('1.7B')) {
        maxRetries = 80; // 160 seconds
    }
    
    console.log(c.gray(`  Starting ${modelName} (this may take a few minutes, please wait)...`));
    
    // Check if server already running with this model
    if (await checkModelLoaded()) {
        console.log(c.green('  Server already running with model loaded'));
        return true;
    }
    
    qvacProcess = spawn('node', [cliPath, 'serve', 'openai'], {
        cwd: dir,
        detached: true,
        stdio: ['ignore', 'ignore', 'pipe']
    });
    
    // Capture stderr to see what's happening
    let stderrData = '';
    qvacProcess.stderr?.on('data', (data: Buffer) => {
        stderrData += data.toString();
    });
    
    qvacProcess.unref();
    
    let lastError = '';
    let progressPrinted = false;
    
    console.log(c.gray('  Waiting for model to load...\n'));
    
    for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 2000));
        
        // Check process status
        if (qvacProcess && qvacProcess.exitCode !== null && qvacProcess.exitCode !== 0) {
            lastError = `Process exited with code ${qvacProcess.exitCode}`;
            if (stderrData) {
                console.log(c.gray('  Error output: ' + stderrData.substring(0, 100)));
            }
            // Keep waiting - maybe another process will pick up
        }
        
        // Print progress every 15 seconds
        if (i > 0 && i % 8 === 0) {
            console.log(c.gray(`  Still loading ${modelName}... (${Math.floor(i * 2 / 60)}min)`));
        }
        
        // Check if model is actually loaded (not just port open)
        if (await checkModelLoaded()) {
            console.log(c.green('  Model loaded successfully!'));
            return true;
        }
    }
    
    console.log(c.gray('  Last error: ' + lastError));
    return false;
}