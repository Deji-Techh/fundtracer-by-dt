// ============================================================
// FundTracer CLI - Portfolio Command
// View NFT collections and token balances from your terminal
// ============================================================

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import axios, { AxiosError } from 'axios';
import { ChainId, getLegacyChainConfig } from '@fundtracer/core';
import { getApiKeys, formatAddress, formatEth } from '../utils.js';
import fs from 'fs';

// Configure axios with retry logic
const axiosWithRetry = axios.create({
    timeout: 30000, // 30 second timeout
});

// Add response interceptor for retry logic
axiosWithRetry.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config;
        if (!config) return Promise.reject(error);
        
        // @ts-ignore - add retry count to config
        const retryCount = config.retryCount || 0;
        const maxRetries = 3;
        
        // Retry on network errors or 5xx server errors
        const shouldRetry = retryCount < maxRetries && (
            !error.response || // Network error (ECONNRESET, etc.)
            error.response.status >= 500 || // Server errors
            error.response.status === 429 // Rate limit
        );
        
        if (shouldRetry) {
            // @ts-ignore
            config.retryCount = retryCount + 1;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
            await new Promise(resolve => setTimeout(resolve, delay));
            return axiosWithRetry(config);
        }
        
        return Promise.reject(error);
    }
);

interface PortfolioOptions {
    chain: string;
    output: 'table' | 'json' | 'csv';
    export?: string;
    nfts: boolean;
    tokens: boolean;
    transactions: boolean;
}

interface NFT {
    contractAddress: string;
    tokenId: string;
    name: string;
    collectionName: string;
    imageUrl: string | null;
    floorPrice: number | null;
    lastSalePrice: number | null;
    network: string;
}

interface TokenBalance {
    contractAddress: string;
    name: string;
    symbol: string;
    balance: string;
    balanceFormatted: number;
    priceUsd: number | null;
    valueUsd: number | null;
}

interface PortfolioData {
    address: string;
    chain: ChainId;
    nativeBalance: number;
    tokens: TokenBalance[];
    nfts: NFT[];
    totalNftCollections: number;
    totalNftValue: number;
}

const ALCHEMY_URLS: Partial<Record<ChainId, string>> = {
    ethereum: 'https://eth-mainnet.g.alchemy.com/v2/',
    linea: 'https://linea-mainnet.g.alchemy.com/v2/',
    arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/',
    base: 'https://base-mainnet.g.alchemy.com/v2/',
    optimism: 'https://opt-mainnet.g.alchemy.com/v2/',
    polygon: 'https://polygon-mainnet.g.alchemy.com/v2/',
};

// Professional color scheme
const colors = {
    primary: chalk.hex('#888888'),
    secondary: chalk.hex('#666666'),
    accent: chalk.hex('#60a5fa'),
    success: chalk.hex('#4ade80'),
    warning: chalk.hex('#fbbf24'),
    error: chalk.hex('#ef4444'),
    muted: chalk.hex('#555555'),
    border: chalk.hex('#333333'),
};

export async function portfolioCommand(address: string, options: PortfolioOptions) {
    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(colors.error('Error: Invalid wallet address format'));
        process.exit(1);
    }

    const chainId = options.chain as ChainId;
    
    // Validate chain
    try {
        getLegacyChainConfig(chainId as any);
    } catch {
        console.error(colors.error(`Error: Unsupported chain: ${chainId}`));
        console.log(colors.muted('Supported chains: ethereum, linea, arbitrum, base, optimism, polygon'));
        process.exit(1);
    }

    const apiKeys = getApiKeys();
    if (!apiKeys.alchemy) {
        console.error(colors.error('Error: Alchemy API key required for portfolio viewing'));
        console.log(colors.muted('Run: fundtracer config --set-key alchemy:YOUR_KEY'));
        process.exit(1);
    }

    const spinner = ora({
        text: colors.secondary('Fetching portfolio data...'),
        color: 'gray',
    }).start();

    try {
        const portfolio: PortfolioData = {
            address: address.toLowerCase(),
            chain: chainId,
            nativeBalance: 0,
            tokens: [],
            nfts: [],
            totalNftCollections: 0,
            totalNftValue: 0,
        };

        // Fetch native balance
        spinner.text = colors.secondary('Fetching native balance...');
        portfolio.nativeBalance = await fetchNativeBalance(address, chainId, apiKeys.alchemy);

        // Fetch tokens if requested or by default
        if (options.tokens || (!options.nfts && !options.transactions)) {
            spinner.text = colors.secondary('Fetching token balances...');
            portfolio.tokens = await fetchTokenBalances(address, chainId, apiKeys.alchemy);
        }

        // Fetch NFTs if requested
        if (options.nfts) {
            spinner.text = colors.secondary('Fetching NFT collection...');
            const nftData = await fetchNFTs(address, chainId, apiKeys.alchemy);
            portfolio.nfts = nftData.nfts;
            portfolio.totalNftCollections = nftData.totalCollections;
            portfolio.totalNftValue = nftData.totalValue;
        }

        spinner.succeed(colors.success('Portfolio loaded'));
        console.log();

        // Output based on format
        switch (options.output) {
            case 'json':
                outputJson(portfolio, options.export);
                break;
            case 'csv':
                outputCSV(portfolio, options.export);
                break;
            default:
                outputTable(portfolio, options);
        }

    } catch (error: any) {
        spinner.fail(colors.error('Failed to fetch portfolio'));
        
        // Provide helpful error messages
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            console.error(colors.error('Network error: Unable to connect to Alchemy API'));
            console.log(colors.muted('Please check your internet connection and try again.'));
        } else if (error.response?.status === 429) {
            console.error(colors.error('Rate limit exceeded'));
            console.log(colors.muted('Too many requests. Please wait a moment and try again.'));
        } else if (error.response?.status === 401) {
            console.error(colors.error('Invalid API key'));
            console.log(colors.muted('Please check your Alchemy API key configuration.'));
        } else if (error.message?.includes('timeout')) {
            console.error(colors.error('Request timed out'));
            console.log(colors.muted('The API took too long to respond. Please try again.'));
        } else {
            console.error(colors.error(error?.message || 'Unknown error'));
        }
        
        process.exit(1);
    }
}

async function fetchNativeBalance(address: string, chain: ChainId, apiKey: string): Promise<number> {
    const baseUrl = ALCHEMY_URLS[chain];
    if (!baseUrl) throw new Error(`Unsupported chain: ${chain}`);

    const response = await axiosWithRetry.post(`${baseUrl}${apiKey}`, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
    });

    const balanceHex = response.data.result;
    const balanceWei = parseInt(balanceHex, 16);
    return balanceWei / 1e18;
}

async function fetchTokenBalances(address: string, chain: ChainId, apiKey: string): Promise<TokenBalance[]> {
    const baseUrl = ALCHEMY_URLS[chain];
    if (!baseUrl) throw new Error(`Unsupported chain: ${chain}`);

    try {
        // Use Alchemy's token balances API
        const response = await axiosWithRetry.post(`${baseUrl}${apiKey}`, {
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenBalances',
            params: [address],
        });

        const tokenBalances = response.data.result.tokenBalances || [];
        
        // Filter out zero balances
        const nonZeroBalances = tokenBalances.filter(
            (token: any) => token.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        );

        // Get metadata for tokens (limited to first 20 to avoid rate limits)
        const tokens: TokenBalance[] = [];
        const limitedTokens = nonZeroBalances.slice(0, 20);

        for (const token of limitedTokens) {
            try {
                const metadataResponse = await axiosWithRetry.post(`${baseUrl}${apiKey}`, {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'alchemy_getTokenMetadata',
                    params: [token.contractAddress],
                });

                const metadata = metadataResponse.data.result;
                const decimals = metadata.decimals || 18;
                const rawBalance = parseInt(token.tokenBalance, 16);
                const formattedBalance = rawBalance / Math.pow(10, decimals);

                tokens.push({
                    contractAddress: token.contractAddress,
                    name: metadata.name || 'Unknown Token',
                    symbol: metadata.symbol || '???',
                    balance: token.tokenBalance,
                    balanceFormatted: formattedBalance,
                    priceUsd: null,
                    valueUsd: null,
                });
            } catch (e) {
                // Skip tokens that fail metadata fetch
            }
        }

        // Sort by balance (descending)
        return tokens.sort((a, b) => b.balanceFormatted - a.balanceFormatted);
    } catch (error) {
        console.warn(colors.warning('Could not fetch token balances'));
        return [];
    }
}

async function fetchNFTs(address: string, chain: ChainId, apiKey: string): Promise<{ nfts: NFT[]; totalCollections: number; totalValue: number }> {
    const baseUrl = ALCHEMY_URLS[chain];
    if (!baseUrl) throw new Error(`Unsupported chain: ${chain}`);

    try {
        // Use Alchemy's NFT API
        const response = await axiosWithRetry.get(`${baseUrl}${apiKey}/getNFTs`, {
            params: {
                owner: address,
                pageSize: 100,
                withMetadata: true,
            },
        });

        const ownedNfts = response.data.ownedNfts || [];
        const nfts: NFT[] = [];
        const collections = new Set<string>();

        for (const nft of ownedNfts) {
            const contractAddr = nft.contract?.address;
            if (!contractAddr) continue;

            collections.add(contractAddr);

            nfts.push({
                contractAddress: contractAddr,
                tokenId: nft.id?.tokenId || '0',
                name: nft.title || `${nft.contract?.name || 'Unknown'} #${nft.id?.tokenId}`,
                collectionName: nft.contract?.name || 'Unknown Collection',
                imageUrl: nft.media?.[0]?.gateway || null,
                floorPrice: null,
                lastSalePrice: null,
                network: chain,
            });
        }

        return {
            nfts: nfts.slice(0, 50),
            totalCollections: collections.size,
            totalValue: 0,
        };
    } catch (error) {
        console.warn(colors.warning('Could not fetch NFTs'));
        return { nfts: [], totalCollections: 0, totalValue: 0 };
    }
}

function outputTable(portfolio: PortfolioData, options: PortfolioOptions) {
    console.log(colors.primary.bold('Wallet Portfolio'));
    console.log(colors.border('═'.repeat(60)));
    console.log();

    // Header info
    console.log(`${colors.secondary('Address:')} ${colors.primary(portfolio.address)}`);
    console.log(`${colors.secondary('Chain:')} ${colors.primary(portfolio.chain.toUpperCase())}`);
    console.log(`${colors.secondary('Native Balance:')} ${colors.primary(formatEth(portfolio.nativeBalance) + ' ETH')}`);
    console.log();

    // Token Balances
    if (portfolio.tokens.length > 0 && (options.tokens || (!options.nfts))) {
        console.log(colors.primary.bold(`Token Balances (${portfolio.tokens.length})`));
        console.log(colors.border('─'.repeat(60)));
        console.log();
        
        const tokenTable = new Table({
            head: [colors.secondary('Token'), colors.secondary('Symbol'), colors.secondary('Balance')],
            style: { head: ['gray'] },
            chars: {
                'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
                'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
                'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
                'right': '│', 'right-mid': '┤', 'middle': '│',
            },
        });

        portfolio.tokens.slice(0, 10).forEach(token => {
            tokenTable.push([
                token.name.slice(0, 25),
                colors.muted(token.symbol),
                formatEth(token.balanceFormatted),
            ]);
        });

        if (portfolio.tokens.length > 10) {
            tokenTable.push([colors.muted(`... and ${portfolio.tokens.length - 10} more`), '', '']);
        }

        console.log(tokenTable.toString());
        console.log();
    }

    // NFTs
    if (portfolio.nfts.length > 0 && options.nfts) {
        console.log(colors.primary.bold(`NFT Collection (${portfolio.nfts.length} items, ${portfolio.totalNftCollections} collections)`));
        console.log(colors.border('─'.repeat(60)));
        console.log();
        
        // Group by collection
        const byCollection = portfolio.nfts.reduce((acc, nft) => {
            if (!acc[nft.collectionName]) {
                acc[nft.collectionName] = [];
            }
            acc[nft.collectionName].push(nft);
            return acc;
        }, {} as Record<string, NFT[]>);

        Object.entries(byCollection).forEach(([collection, nfts]) => {
            console.log(colors.secondary.bold(collection));
            console.log(`  Items: ${nfts.length}`);
            
            // Show first 3 NFTs from each collection
            nfts.slice(0, 3).forEach(nft => {
                const name = nft.name.length > 40 ? nft.name.slice(0, 40) + '...' : nft.name;
                console.log(`    ${colors.muted('-')} ${name}`);
            });

            if (nfts.length > 3) {
                console.log(`    ${colors.muted(`... and ${nfts.length - 3} more`)}`);
            }
            console.log();
        });
    }

    // Summary
    console.log(colors.primary.bold('Summary'));
    console.log(colors.border('─'.repeat(60)));
    console.log();
    const summaryTable = new Table({
        style: { head: ['gray'] },
        chars: {
            'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
            'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
            'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
            'right': '', 'right-mid': '', 'middle': ' ',
        },
    });

    summaryTable.push(
        { [colors.secondary('Native Balance')]: formatEth(portfolio.nativeBalance) + ' ETH' },
        { [colors.secondary('Token Count')]: portfolio.tokens.length.toString() },
        { [colors.secondary('NFT Items')]: portfolio.nfts.length.toString() },
        { [colors.secondary('NFT Collections')]: portfolio.totalNftCollections.toString() },
    );

    console.log(summaryTable.toString());
}

function outputJson(portfolio: PortfolioData, exportPath?: string) {
    const jsonStr = JSON.stringify(portfolio, null, 2);

    if (exportPath) {
        fs.writeFileSync(exportPath, jsonStr);
        console.log(colors.success(`Portfolio exported to ${exportPath}`));
    } else {
        console.log(jsonStr);
    }
}

function outputCSV(portfolio: PortfolioData, exportPath?: string) {
    const filename = exportPath || `portfolio-${portfolio.address.slice(0, 8)}-${Date.now()}.csv`;
    
    // Create rows for tokens
    const rows: any[] = [];
    
    portfolio.tokens.forEach(token => {
        rows.push({
            type: 'token',
            name: token.name,
            symbol: token.symbol,
            balance: token.balanceFormatted,
            contract: token.contractAddress,
            chain: portfolio.chain,
        });
    });

    // Add NFTs
    portfolio.nfts.forEach(nft => {
        rows.push({
            type: 'nft',
            name: nft.name,
            symbol: '',
            balance: 1,
            contract: nft.contractAddress,
            chain: portfolio.chain,
        });
    });

    if (rows.length === 0) {
        console.log(colors.warning('No assets to export'));
        return;
    }

    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of rows) {
        const values = headers.map(header => {
            const value = (row as any)[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
        });
        csvRows.push(values.join(','));
    }

    fs.writeFileSync(filename, csvRows.join('\n'));
    console.log(colors.success(`Portfolio exported to ${filename}`));
    console.log(colors.muted(`  ${rows.length} assets exported`));
}
