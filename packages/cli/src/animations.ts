// ============================================================
// FundTracer CLI - Animation & Visual Effects Module
// Flashy animations for the "wow" factor
// ============================================================

import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import { setTimeout } from 'timers/promises';
import cliProgress from 'cli-progress';

// Professional color palette
export const colors: Record<string, any> = {
    // Primary grays for professional look
    gray100: chalk.hex('#f5f5f5'),
    gray200: chalk.hex('#e5e5e5'),
    gray300: chalk.hex('#d4d4d4'),
    gray400: chalk.hex('#a3a3a3'),
    gray500: chalk.hex('#737373'),
    gray600: chalk.hex('#525252'),
    gray700: chalk.hex('#404040'),
    gray800: chalk.hex('#262626'),
    gray900: chalk.hex('#171717'),
    
    // Accent colors
    cyan: chalk.hex('#22d3ee'),
    blue: chalk.hex('#3b82f6'),
    purple: chalk.hex('#a855f7'),
    pink: chalk.hex('#ec4899'),
    green: chalk.hex('#22c55e'),
    yellow: chalk.hex('#eab308'),
    red: chalk.hex('#ef4444'),
    orange: chalk.hex('#f97316'),
    
    // Glassmorphism effects
    glass: {
        bg: chalk.bgHex('#1a1a1a'),
        border: chalk.hex('#333333'),
        glow: chalk.hex('#444444'),
    }
};

// Typewriter effect for text
export async function typewriter(text: string, delay: number = 30): Promise<void> {
    for (const char of text) {
        process.stdout.write(char);
        await setTimeout(delay);
    }
    console.log();
}

// Matrix rain effect for loading
export async function matrixRain(duration: number = 3000): Promise<void> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
    const width = process.stdout.columns || 80;
    const startTime = Date.now();
    
    const interval = setInterval(() => {
        if (Date.now() - startTime > duration) {
            clearInterval(interval);
            process.stdout.write('\n');
            return;
        }
        
        const line = Array(width).fill(0).map(() => {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const color = Math.random() > 0.9 ? colors.green : colors.gray600;
            return color(char);
        }).join('');
        
        process.stdout.write('\r' + line.substring(0, width));
    }, 50);
    
    await setTimeout(duration + 100);
    clearInterval(interval);
}

// Animated banner with gradient effect
export function animatedBanner(): string {
    const lines = [
        '  ███████╗██╗   ██╗███╗   ██╗██████╗ ████████╗██████╗  █████╗  ██████╗███████╗██████╗ ',
        '  ██╔════╝██║   ██║████╗  ██║██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝██╔══██╗',
        '  █████╗  ██║   ██║██╔██╗ ██║██║  ██║   ██║   ██████╔╝███████║██║     █████╗  ██████╔╝',
        '  ██╔══╝  ██║   ██║██║╚██╗██║██║  ██║   ██║   ██╔══██╗██╔══██║██║     ██╔══╝  ██╔══██╗',
        '  ██║     ╚██████╔╝██║ ╚████║██████╔╝   ██║   ██║  ██║██║  ██║╚██████╗███████╗██║  ██║',
        '  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚═╝  ╚═╝',
    ];
    
    return lines.map((line, i) => {
        const gradient = [colors.gray700, colors.gray600, colors.gray500, colors.gray400, colors.gray500, colors.gray600];
        return gradient[i % gradient.length](line);
    }).join('\n');
}

// Rainbow gradient effect
export function rainbow(text: string): string {
    const rainbowColors = [
        chalk.hex('#ff0000'),
        chalk.hex('#ff7f00'),
        chalk.hex('#ffff00'),
        chalk.hex('#00ff00'),
        chalk.hex('#0000ff'),
        chalk.hex('#4b0082'),
        chalk.hex('#9400d3'),
    ];
    
    return text.split('').map((char, i) => {
        const color = rainbowColors[i % rainbowColors.length];
        return color(char);
    }).join('');
}

// Glassmorphism box with gradient border
export function glassBox(content: string[], title?: string): string {
    const width = Math.max(...content.map(line => line.length), 60);
    const horizontal = '─'.repeat(width + 4);
    
    let box = '';
    
    // Top border with gradient
    if (title) {
        const titleStr = ` ${title} `;
        const left = Math.floor((width + 4 - titleStr.length) / 2);
        const right = width + 4 - left - titleStr.length;
        box += colors.gray500('┌' + '─'.repeat(left) + titleStr + '─'.repeat(right) + '┐') + '\n';
    } else {
        box += colors.glass.border('┌' + horizontal + '┐') + '\n';
    }
    
    // Content
    content.forEach(line => {
        const padding = ' '.repeat(width - line.length);
        box += colors.glass.border('│ ') + line + padding + colors.glass.border(' │') + '\n';
    });
    
    // Bottom border
    box += colors.glass.border('└' + horizontal + '┘');
    
    return box;
}

// Glow effect text
export function glow(text: string, color: keyof typeof colors = 'cyan'): string {
    const baseColor = colors[color] || colors.cyan;
    return baseColor.bold(text);
}

// Pulsing animation for status indicators
export function pulse(text: string, color: keyof typeof colors = 'green'): string {
    const c = colors[color] || colors.green;
    // Create a pulsing effect using different intensities
    return c('●') + ' ' + text;
}

// Progress bar with gradient
export function createProgressBar(total: number, title: string = 'Progress'): cliProgress.SingleBar {
    return new cliProgress.SingleBar({
        format: `${colors.gray500(title)} |${colors.cyan('{bar}')}| {percentage}% | {value}/{total} {eta_formatted}`,
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true,
        barGlue: colors.gray600('▒'),
    });
}

// Loading spinner animation frames
export const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Animated spinner with color
export function spinner(frame: number, color: keyof typeof colors = 'cyan'): string {
    const c = colors[color] || colors.cyan;
    return c(spinnerFrames[frame % spinnerFrames.length]);
}

// Hacker-style typing effect
export async function hackerType(text: string, speed: number = 20): Promise<void> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    
    for (let i = 0; i < text.length; i++) {
        const target = text[i];
        const iterations = Math.floor(Math.random() * 3) + 1;
        
        for (let j = 0; j < iterations; j++) {
            process.stdout.write('\r' + text.substring(0, i) + chars[Math.floor(Math.random() * chars.length)]);
            await setTimeout(speed / 2);
        }
        
        process.stdout.write('\r' + text.substring(0, i + 1));
        await setTimeout(speed);
    }
    console.log();
}

// Dashboard widget with glass effect
export function dashboardWidget(title: string, items: Array<{label: string, value: string, status?: 'good' | 'warn' | 'bad' | string}>): string {
    const maxLabel = Math.max(...items.map(i => i.label.length));
    const maxValue = Math.max(...items.map(i => i.value.length));
    const width = maxLabel + maxValue + 6;
    
    let widget = colors.gray500('┌' + '─'.repeat(width - 2) + '┐') + '\n';
    widget += colors.gray500('│ ') + colors.gray300.bold(title.padEnd(width - 4)) + colors.gray500(' │') + '\n';
    widget += colors.gray500('├' + '─'.repeat(width - 2) + '┤') + '\n';
    
    items.forEach(item => {
        const statusColor = item.status === 'good' ? colors.green :
                           item.status === 'warn' ? colors.yellow :
                           item.status === 'bad' ? colors.red :
                           colors.gray400;
        
        const line = `${item.label.padEnd(maxLabel)} : ${statusColor(item.value.padEnd(maxValue))}`;
        widget += colors.gray500('│ ') + line.padEnd(width - 4) + colors.gray500(' │') + '\n';
    });
    
    widget += colors.gray500('└' + '─'.repeat(width - 2) + '┘');
    return widget;
}

// Table with glassmorphism styling
export function styledTable(headers: string[], rows: string[][]): string {
    const colWidths = headers.map((h, i) => {
        const maxData = Math.max(...rows.map(r => (r[i] || '').length));
        return Math.max(h.length, maxData) + 2;
    });
    
    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + colWidths.length + 1;
    
    // Top border
    let table = colors.glass.border('┌' + '─'.repeat(totalWidth - 2) + '┐') + '\n';
    
    // Headers
    const headerRow = headers.map((h, i) => colors.gray300.bold(h.padEnd(colWidths[i]))).join(colors.glass.border('│'));
    table += colors.glass.border('│') + headerRow + colors.glass.border('│') + '\n';
    
    // Separator
    const sep = colWidths.map(w => '─'.repeat(w)).join(colors.glass.border('┼'));
    table += colors.glass.border('├' + sep + '┤') + '\n';
    
    // Data rows
    rows.forEach(row => {
        const dataRow = row.map((cell, i) => colors.gray400((cell || '').padEnd(colWidths[i]))).join(colors.glass.border('│'));
        table += colors.glass.border('│') + dataRow + colors.glass.border('│') + '\n';
    });
    
    // Bottom border
    table += colors.glass.border('└' + '─'.repeat(totalWidth - 2) + '┘');
    
    return table;
}

// Clear screen with style
export function clearScreen(): void {
    console.clear();
    console.log('\n');
}

// Wait for keypress
export async function waitForKey(message: string = 'Press any key to continue...'): Promise<void> {
    console.log(colors.gray500('\n' + message));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    return new Promise(resolve => {
        process.stdin.once('data', () => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve();
        });
    });
}
