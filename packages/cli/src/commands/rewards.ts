// FundTracer CLI - Rewards Command

import chalk from 'chalk';
import Table from 'cli-table3';
import { getApiKeys } from '../utils.js';

interface RewardsOptions {
  me?: boolean;
}

const c = {
  bold: chalk.bold,
  green: chalk.green,
  red: chalk.red,
  yellow: chalk.yellow,
  gray: chalk.gray,
};

export async function rewardsCommand(options: RewardsOptions) {
  const API_BASE = process.env.FUNDTRACER_API || 'https://fundtracer.xyz';
  
  try {
    if (options.me) {
      await showMyStats(API_BASE);
    } else {
      await showLeaderboard(API_BASE);
    }
  } catch (error) {
    console.error(c.red('Error: ') + (error instanceof Error ? error.message : 'Unknown'));
    process.exit(1);
  }
}

async function showLeaderboard(API_BASE: string) {
  const response = await fetch(`${API_BASE}/api/torque-v2/leaderboard`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch leaderboard');
  }
  
  console.log(c.bold('\n🏆 FundTracer Leaderboard\n'));
  console.log('----------------------------------------');
  console.log(c.gray(`Total Wallets Scanned: ${data.totalScanned}\n`));
  
  if (!data.entries || data.entries.length === 0) {
    console.log(c.gray('No entries yet. Be the first!'));
    return;
  }
  
  const table = new Table({
    style: { compact: true },
    head: ['Rank', 'User', 'Scans', 'Points']
  });
  
  for (const entry of data.entries.slice(0, 20)) {
    const name = entry.displayName || entry.userId?.slice(0, 8) || '?';
    table.push([entry.rank, name, entry.walletsScanned, entry.score]);
  }
  
  console.log(table.toString());
  console.log('\n' + c.gray('View your stats: fundtracer rewards --me'));
}

async function showMyStats(API_BASE: string) {
  // Get linked user from config
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  
  const configFile = path.join(os.homedir(), '.fundtracer', 'config.json');
  
  if (!fs.existsSync(configFile)) {
    console.log(c.yellow('Not linked. Run: fundtracer link'));
    console.log(c.gray('Then: fundtracer link FT-XXXX'));
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  const userId = config.linkedUserId;
  
  if (!userId) {
    console.log(c.yellow('Not linked. Run: fundtracer link'));
    return;
  }
  
  // For now, fetch leaderboard and find user
  const response = await fetch(`${API_BASE}/api/torque-v2/leaderboard`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error('Failed to fetch');
  }
  
  const myEntry = data.entries?.find((e: any) => e.userId === userId);
  
  if (!myEntry) {
    console.log(c.yellow('No stats yet. Start scanning!'));
    console.log(c.gray('  fundtracer analyze 0x...'));
    return;
  }
  
  console.log(c.bold('\n📊 Your Stats\n'));
  console.log('----------------------------------------');
  console.log(`Wallets Scanned: ${myEntry.walletsScanned}`);
  console.log(`Points: ${myEntry.score}`);
  console.log(`Rank: #${myEntry.rank}`);
  console.log('----------------------------------------');
}