// FundTracer CLI - Link Command

import chalk from 'chalk';
import { getApiKeys } from '../utils.js';

const c = {
  bold: chalk.bold,
  green: chalk.green,
  red: chalk.red,
  yellow: chalk.yellow,
  gray: chalk.gray,
  cyan: chalk.cyan,
};

export async function linkCommand(code?: string) {
  const API_BASE = process.env.FUNDTRACER_API || 'https://fundtracer.xyz';
  
  // Phase 1: Verify code (if user provides argument)
  if (code) {
    // Verify and link
    try {
      console.log(c.gray('Verifying link code...'));
      
      const response = await fetch(`${API_BASE}/api/torque-v2/cli/link/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkCode: code })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        console.error(c.red('Link failed: ' + (data.error || 'Unknown error')));
        process.exit(1);
      }
      
      // Save linked user ID to config
      const config = await import('../utils.js');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const configDir = path.join(os.homedir(), '.fundtracer');
      const configFile = path.join(configDir, 'config.json');
      
      let existingConfig: any = {};
      if (fs.existsSync(configFile)) {
        existingConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      }
      
      existingConfig.linkedUserId = data.userId;
      existingConfig.linkedName = data.displayName;
      existingConfig.cliLinkCode = code;
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configFile, JSON.stringify(existingConfig, null, 2));
      
      console.log(c.green('✓ Linked to ') + c.bold(data.displayName || 'Account'));
      console.log(c.gray('  Your scans will now count toward rewards.'));
      
    } catch (error) {
      console.error(c.red('Error: ') + (error instanceof Error ? error.message : 'Unknown'));
      process.exit(1);
    }
    return;
  }
  
  // Phase 2: Show linking instructions
  console.log(c.bold('\n🔗 FundTracer CLI Link\n'));
  console.log('----------------------------------------');
  console.log(c.gray('1. Open ') + c.cyan('https://fundtracer.xyz/cli') + c.gray(' in your browser'));
  console.log(c.gray('2. Sign in with Google'));
  console.log(c.gray('3. Run: ') + c.cyan('fundtracer link FT-XXXX'));
  console.log('----------------------------------------');
  console.log();
  console.log(c.gray('Your scans will sync with your web account.'));
  console.log(c.gray('Earn rewards and appear on the leaderboard!\n'));
}