// ============================================================
// FundTracer CLI - Check Scam Command
// Check if address is in known scam database
// ============================================================

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';

const c = {
    bold: chalk.bold,
    green: chalk.green,
    red: chalk.red,
    cyan: chalk.cyan,
    gray: chalk.gray,
    yellow: chalk.yellow,
};

interface CheckScamOptions {
    chain?: string;
    verbose?: boolean;
}

interface ScamDB {
    version: string;
    updated: string;
    networks: Record<string, { scammers: string[]; suspected: string[]; whales: string[] }>;
    stats: { totalScammers: number; totalSuspected: number; totalWhales: number };
    note: string;
}

function getScamDBPath(): string {
    const localPath = path.join(process.cwd(), 'data', 'scam-db.json');
    const userPath = path.join(os.homedir(), '.fundtracer', 'scam-db.json');
    const cliPath = path.join(__dirname, '..', '..', 'data', 'scam-db.json');
    
    if (fs.existsSync(localPath)) return localPath;
    if (fs.existsSync(userPath)) return userPath;
    if (fs.existsSync(cliPath)) return cliPath;
    return cliPath;
}

function loadScamDB(): ScamDB | null {
    try {
        const dbPath = getScamDBPath();
        if (fs.existsSync(dbPath)) {
            return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        }
    } catch (e) {
        console.log(c.gray('Warning: Could not load scam DB'));
    }
    return null;
}

function checkAddressInList(address: string, list: string[]): boolean {
    const lowerAddr = address.toLowerCase();
    return list.some(a => a.toLowerCase() === lowerAddr);
}

export async function checkScamCommand(address: string, options: CheckScamOptions) {
    const chain = options.chain || 'ethereum';
    const verbose = options.verbose || false;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(c.red('Invalid address'));
        process.exit(1);
    }
    
    const shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
    
    console.log(c.bold('\n🔍 Scam Database Check\n'));
    console.log(c.gray('  Address: ') + shortAddr);
    console.log(c.gray('  Chain: ') + chain);
    
    const db = loadScamDB();
    
    if (!db) {
        console.log(c.yellow('\n⚠️  No scam database found'));
        process.exit(1);
    }
    
    const networkData = db.networks[chain] || db.networks['ethereum'];
    if (!networkData) {
        console.log(c.yellow('No data for chain: ' + chain));
    }
    
    const isScammer = checkAddressInList(address, networkData?.scammers || []);
    const isSuspected = checkAddressInList(address, networkData?.suspected || []);
    const isWhale = checkAddressInList(address, networkData?.whales || []);
    
    if (isScammer) {
        console.log(c.bold(c.red('\n⛔ KNOWN SCAMMER')));
        console.log(c.red('  This address is in our scam database!'));
        console.log(c.gray('  Recommendation: DO NOT send funds'));
    } else if (isSuspected) {
        console.log(c.bold(c.yellow('\n⚠️  SUSPECTED')));
        console.log(c.yellow('  This address has been flagged'));
        console.log(c.gray('  Recommendation: Proceed with caution'));
    } else if (isWhale) {
        console.log(c.bold(c.cyan('\n🐋 WHALE')));
        console.log(c.cyan('  Known large holder'));
    } else {
        console.log(c.bold(c.green('\n✅ CLEAR')));
        console.log(c.green('  No matches in local scam database'));
    }
    
    const scamCount = networkData?.scammers.length || 0;
    const suspectedCount = networkData?.suspected.length || 0;
    const dbInfo = scamCount + ' scammers, ' + suspectedCount + ' suspected';
    console.log(c.gray('\n  Database: ') + dbInfo);
    console.log();
}

export async function reportScamCommand(address: string, options: CheckScamOptions) {
    const chain = options.chain || 'ethereum';
    const isSuspected = options.verbose || false;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(c.red('Invalid address'));
        process.exit(1);
    }
    
    const shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
    
    console.log(c.bold('\n📢 Report Scam Address\n'));
    console.log(c.gray('  Address: ') + shortAddr);
    console.log(c.gray('  Chain: ') + chain);
    console.log(c.gray('  Type: ') + (isSuspected ? 'Suspected' : 'Scammer') + '\n');
    
    // Save to user database
    const userDbPath = path.join(os.homedir(), '.fundtracer', 'scam-db.json');
    const userDir = path.join(os.homedir(), '.fundtracer');
    
    let userDb: ScamDB = { 
        version: '1.0.0', 
        updated: new Date().toISOString().split('T')[0], 
        networks: {}, 
        stats: { totalScammers: 0, totalSuspected: 0, totalWhales: 0 }, 
        note: 'User reported addresses' 
    };
    
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    
    if (fs.existsSync(userDbPath)) {
        try {
            userDb = JSON.parse(fs.readFileSync(userDbPath, 'utf-8'));
        } catch {
            // Use default
        }
    }
    
    if (!userDb.networks[chain]) {
        userDb.networks[chain] = { scammers: [], suspected: [], whales: [] };
    }
    
    const list = isSuspected 
        ? userDb.networks[chain].suspected 
        : userDb.networks[chain].scammers;
    
    if (!checkAddressInList(address, list)) {
        list.push(address);
        fs.writeFileSync(userDbPath, JSON.stringify(userDb, null, 2));
        console.log(c.green('\n✅ Address reported!'));
        console.log(c.gray('  Added to local database'));
    } else {
        console.log(c.yellow('\n⚠️  Already in database'));
    }
    
    console.log(c.gray('\n💡 Check: fundtracer check-scam <address>\n'));
}

export async function scamDbStatsCommand() {
    const db = loadScamDB();
    
    if (!db) {
        console.log(c.yellow('⚠️  No scam database found'));
        process.exit(1);
    }
    
    console.log(c.bold('\n📊 Local Scam Database\n'));
    console.log(c.gray('  Updated: ') + db.updated);
    console.log();
    
    let totalScammers = 0;
    let totalSuspected = 0;
    
    for (const [network, data] of Object.entries(db.networks)) {
        const s = data.scammers.length;
        const sp = data.suspected.length;
        if (s > 0 || sp > 0) {
            console.log('  ' + c.cyan(network.padEnd(12)) + c.red(s + ' scammers') + ', ' + c.yellow(sp + ' suspected'));
            totalScammers += s;
            totalSuspected += sp;
        }
    }
    
    console.log(c.bold('\n  Total: ') + c.red(totalScammers + ' scammers') + ', ' + c.yellow(totalSuspected + ' suspected'));
    console.log();
}