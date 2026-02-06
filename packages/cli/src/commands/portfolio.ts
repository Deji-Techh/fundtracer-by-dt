// ============================================================
// FundTracer CLI - Portfolio Command
// View NFT collections and token balances from your terminal
// ============================================================

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import axios from 'axios';
import { ChainId, getChainConfig } from '@fundtracer/core';
import { getApiKeys, formatAddress, formatEth } from '../utils.js';
import fs from 'fs';

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

export async function portfolioCommand(address: string, options: PortfolioOptions) {
    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        console.error(chalk.red('✗ Invalid wallet address format'));
        process.exit(1);
    }

    const chainId = options.chain as ChainId;
    
    // Validate chain
    try {
        getChainConfig(chainId);
    } catch {
        console.error(chalk.red(`✗ Unsupported chain: ${chainId}`));
        console.log(chalk.dim('Supported chains: ethereum, linea, arbitrum, base, optimism, polygon'));
        process.exit(1);
    }

    const apiKeys = getApiKeys();
    if (!apiKeys.alchemy) {
        console.error(chalk.red('✗ Alchemy API key required for portfolio viewing'));
        console.log(chalk.dim('Run: fundtracer config --set-key alchemy:YOUR_KEY'));
        process.exit(1);
    }

    const spinner = ora({
        text: 'Fetching portfolio data...',
        color: 'cyan',
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
        spinner.text = 'Fetching native balance...';
        portfolio.nativeBalance = await fetchNativeBalance(address, chainId, apiKeys.alchemy);

        // Fetch tokens if requested or by default
        if (options.tokens || (!options.nfts && !options.transactions)) {
            spinner.text = 'Fetching token balances...';
            portfolio.tokens = await fetchTokenBalances(address, chainId, apiKeys.alchemy);
        }

        // Fetch NFTs if requested
        if (options.nfts) {
            spinner.text = 'Fetching NFT collection...';
            const nftData = await fetchNFTs(address, chainId, apiKeys.alchemy);
            portfolio.nfts = nftData.nfts;
            portfolio.totalNftCollections = nftData.totalCollections;
            portfolio.totalNftValue = nftData.totalValue;
        }

        spinner.succeed('Portfolio loaded!');
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

    } catch (error) {
        spinner.fail('Failed to fetch portfolio');
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        process.exit(1);
    }
}

async function fetchNativeBalance(address: string, chain: ChainId, apiKey: string): Promise<number> {
    const baseUrl = ALCHEMY_URLS[chain];
    if (!baseUrl) throw new Error(`Unsupported chain: ${chain}`);

    const response = await axios.post(`${baseUrl}${apiKey}`, {
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
        const response = await axios.post(`${baseUrl}${apiKey}`, {
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
                const metadataResponse = await axios.post(`${baseUrl}${apiKey}`, {
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
        console.warn(chalk.yellow('⚠ Could not fetch token balances'));
        return [];
    }
}

async function fetchNFTs(address: string, chain: ChainId, apiKey: string): Promise<{ nfts: NFT[]; totalCollections: number; totalValue: number }> {
    const baseUrl = ALCHEMY_URLS[chain];
    if (!baseUrl) throw new Error(`Unsupported chain: ${chain}`);

    try {
        // Use Alchemy's NFT API
        const response = await axios.get(`${baseUrl}${apiKey}/getNFTs`, {
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
                floorPrice: null, // Would need additional API call
                lastSalePrice: null,
                network: chain,
            });
        }

        return {
            nfts: nfts.slice(0, 50), // Limit to 50 for display
            totalCollections: collections.size,
            totalValue: 0, // Would need pricing data
        };
    } catch (error) {
        console.warn(chalk.yellow('⚠ Could not fetch NFTs'));
        return { nfts: [], totalCollections: 0, totalValue: 0 };
    }
}

function outputTable(portfolio: PortfolioData, options: PortfolioOptions) {
    console.log(chalk.bold.cyan('═══ Wallet Portfolio ═══\n'));

    // Header info
    console.log(`Address: ${chalk.bold(formatAddress(portfolio.address))}`);
    console.log(`Chain: ${chalk.bold(portfolio.chain.toUpperCase())}`);
    console.log(`Native Balance: ${chalk.bold(formatEth(portfolio.nativeBalance) + ' ETH')}`);
    console.log();

    // Token Balances
    if (portfolio.tokens.length > 0 && (options.tokens || (!options.nfts))) {
        console.log(chalk.bold.cyan(`═══ Token Balances (${portfolio.tokens.length}) ═══\n`));
        
        const tokenTable = new Table({
            head: ['Token', 'Symbol', 'Balance'],
            style: { head: ['cyan'] },
        });

        portfolio.tokens.slice(0, 10).forEach(token => {
            tokenTable.push([
                token.name.slice(0, 25),
                chalk.dim(token.symbol),
                formatEth(token.balanceFormatted),
            ]);
        });

        if (portfolio.tokens.length > 10) {
            tokenTable.push([chalk.dim(`... and ${portfolio.tokens.length - 10} more`), '', '']);
        }

        console.log(tokenTable.toString());
        console.log();
    }

    // NFTs
    if (portfolio.nfts.length > 0 && options.nfts) {
        console.log(chalk.bold.cyan(`═══ NFT Collection (${portfolio.nfts.length} items, ${portfolio.totalNftCollections} collections) ═══\n`));
        
        // Group by collection
        const byCollection = portfolio.nfts.reduce((acc, nft) => {
            if (!acc[nft.collectionName]) {
                acc[nft.collectionName] = [];
            }
            acc[nft.collectionName].push(nft);
            return acc;
        }, {} as Record<string, NFT[]>);

        Object.entries(byCollection).forEach(([collection, nfts]) => {
            console.log(chalk.bold(collection));
            console.log(`  Items: ${nfts.length}`);
            
            // Show first 3 NFTs from each collection
            nfts.slice(0, 3).forEach(nft => {
                const name = nft.name.length > 40 ? nft.name.slice(0, 40) + '...' : nft.name;
                console.log(`    ${chalk.dim('•')} ${name}`);
            });

            if (nfts.length > 3) {
                console.log(`    ${chalk.dim(`... and ${nfts.length - 3} more`)}`);
            }
            console.log();
        });
    }

    // Summary
    console.log(chalk.bold.cyan('═══ Summary ═══\n'));
    const summaryTable = new Table({
        style: { head: ['cyan'] },
    });

    summaryTable.push(
        { 'Native Balance': formatEth(portfolio.nativeBalance) + ' ETH' },
        { 'Token Count': portfolio.tokens.length.toString() },
        { 'NFT Items': portfolio.nfts.length.toString() },
        { 'NFT Collections': portfolio.totalNftCollections.toString() },
    );

    console.log(summaryTable.toString());
}

function outputJson(portfolio: PortfolioData, exportPath?: string) {
    const jsonStr = JSON.stringify(portfolio, null, 2);

    if (exportPath) {
        fs.writeFileSync(exportPath, jsonStr);
        console.log(chalk.green(`✓ Portfolio exported to ${exportPath}`));
    } else {
        console.log(jsonStr);
    }
}

function outputCSV(portfolio: PortfolioData, exportPath?: string) {
    const filename = exportPath || `portfolio-${portfolio.address.slice(0, 8)}-${Date.now()}.csv`;
    
    // Create rows for tokens
    const rows = portfolio.tokens.map(token => ({
        type: 'token',
        name: token.name,
        symbol: token.symbol,
        balance: token.balanceFormatted,
        contract: token.contractAddress,
        chain: portfolio.chain,
    }));

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
        console.log(chalk.yellow('⚠ No assets to export'));
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
    console.log(chalk.green(`✓ Portfolio exported to ${filename}`));
    console.log(chalk.dim(`  ${rows.length} assets exported`));
}
