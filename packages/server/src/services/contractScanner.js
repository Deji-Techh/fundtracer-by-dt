import { AlchemyClient } from './alchemyClient.js';
import { getFirestore, admin } from '../firebase.js';
import axios from 'axios';

const Timestamp = admin.firestore.Timestamp;

export class ContractScanner {
  constructor(alchemyApiKey, lineascanApiKey = null) {
    this.alchemy = new AlchemyClient(alchemyApiKey);
    this.lineascanKey = lineascanApiKey;
    this.db = getFirestore();
  }

  // Main scan method
  async scan(contractAddress) {
    const startTime = Date.now();
    
    // Check cache first
    const cached = await this.getCachedScan(contractAddress);
    if (cached) {
      console.log(`[ContractScanner] Returning cached result for ${contractAddress}`);
      return cached;
    }
    
    console.log(`[ContractScanner] Starting scan for ${contractAddress}`);
    
    // Step 1: Validate address
    if (!this.isValidAddress(contractAddress)) {
      throw new Error('Invalid contract address format');
    }
    
    // Step 2: Check if it's actually a contract
    const metadata = await this.alchemy.getContractMetadata(contractAddress);
    
    if (!metadata.code || metadata.code === '0x') {
      throw new Error('Address is not a contract (EOA)');
    }
    
    // Step 3: Detect contract type
    const contractType = this.detectContractType(metadata);
    
    // Step 4: Get creation info (creator, timestamp)
    const creationInfo = await this.getCreationInfo(contractAddress);
    
    // Step 5: Fetch all transfers (incoming + outgoing in parallel)
    console.log(`[ContractScanner] Fetching transfers for ${contractAddress}...`);
    const [incomingTransfers, outgoingTransfers] = await Promise.all([
      this.fetchTransfersWithProgress({
        toBlock: "latest",
        toAddress: contractAddress,
        category: ["external", "erc20", "erc721", "erc1155", "internal"],
        withMetadata: true
      }),
      this.fetchTransfersWithProgress({
        toBlock: "latest",
        fromAddress: contractAddress,
        category: ["external", "erc20", "erc721", "erc1155", "internal"],
        withMetadata: true
      })
    ]);
    
    console.log(`[ContractScanner] Got ${incomingTransfers.length} incoming, ${outgoingTransfers.length} outgoing transfers`);
    
    // Step 6: Aggregate wallet data
    const { wallets, stats } = this.aggregateWallets(
      incomingTransfers, 
      outgoingTransfers, 
      contractAddress
    );
    
    // Sort by interactions and assign ranks
    wallets.sort((a, b) => b.interactions - a.interactions);
    wallets.forEach((wallet, index) => {
      wallet.rank = index + 1;
    });
    
    // Build response
    const result = {
      contract: {
        address: contractAddress.toLowerCase(),
        name: metadata.name || 'Unknown',
        symbol: metadata.symbol || null,
        type: contractType,
        decimals: metadata.decimals,
        totalSupply: metadata.totalSupply ? this.formatBigNumber(metadata.totalSupply, metadata.decimals || 18) : null,
        creator: creationInfo.creator,
        creationTxHash: creationInfo.txHash,
        createdAt: creationInfo.createdAt,
        balanceETH: this.formatETH(metadata.balance),
        isContract: true
      },
      stats: {
        uniqueWallets: wallets.length,
        totalTransfers: stats.totalTransfers,
        incomingTransfers: stats.incomingTransfers,
        outgoingTransfers: stats.outgoingTransfers,
        categoryCounts: stats.categoryCounts
      },
      wallets: wallets,
      scannedAt: new Date().toISOString(),
      scanDurationMs: Date.now() - startTime
    };
    
    // Cache result
    await this.cacheScan(contractAddress, result);
    
    return result;
  }

  // Validate Ethereum address
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Detect contract type from metadata
  detectContractType(metadata) {
    if (metadata.isERC721) return 'ERC-721 (NFT)';
    if (metadata.isERC1155) return 'ERC-1155 (Multi-Token)';
    if (metadata.name && metadata.symbol && metadata.decimals !== null) {
      return 'ERC-20 (Token)';
    }
    return 'Smart Contract (Unverified Type)';
  }

  // Get contract creation info
  async getCreationInfo(contractAddress) {
    const result = {
      creator: null,
      txHash: null,
      createdAt: null
    };
    
    // Try Lineascan API first
    if (this.lineascanKey) {
      try {
        const response = await axios.get(
          `https://api.lineascan.build/api`,
          {
            params: {
              module: 'contract',
              action: 'getcontractcreation',
              contractaddresses: contractAddress,
              apikey: this.lineascanKey
            },
            timeout: 10000
          }
        );
        
        if (response.data?.result?.[0]) {
          const info = response.data.result[0];
          result.creator = info.contractCreator?.toLowerCase();
          result.txHash = info.txHash?.toLowerCase();
          
          // Get block timestamp from transaction
          if (result.txHash) {
            const receipt = await this.alchemy.singleCall('eth_getTransactionReceipt', [result.txHash]);
            if (receipt?.blockNumber) {
              const block = await this.alchemy.singleCall('eth_getBlockByNumber', [receipt.blockNumber, false]);
              if (block?.timestamp) {
                result.createdAt = new Date(parseInt(block.timestamp, 16) * 1000).toISOString();
              }
            }
          }
          
          return result;
        }
      } catch (error) {
        console.warn('[ContractScanner] Lineascan API failed:', error.message);
      }
    }
    
    // Fallback: Show as unavailable
    result.creator = 'Unknown';
    result.txHash = 'Unknown';
    result.createdAt = null;
    
    return result;
  }

  // Fetch transfers with progress logging
  async fetchTransfersWithProgress(params) {
    const transfers = [];
    let pageKey = null;
    let pageCount = 0;
    const maxPages = 200; // 200 * 1000 = 200k transfers max
    
    do {
      const requestParams = {
        ...params,
        maxCount: '0x3E8' // 1000 per page
      };
      
      if (pageKey) {
        requestParams.pageKey = pageKey;
      }
      
      try {
        const result = await this.alchemy.singleCall('alchemy_getAssetTransfers', [requestParams]);
        
        if (result?.transfers) {
          transfers.push(...result.transfers);
        }
        
        pageKey = result?.pageKey;
        pageCount++;
        
        if (pageCount % 10 === 0) {
          console.log(`[ContractScanner] Fetched ${transfers.length} transfers (page ${pageCount})...`);
        }
        
        // Small delay between pages
        if (pageKey && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error('[ContractScanner] Error fetching transfers:', error);
        break;
      }
    } while (pageKey && pageCount < maxPages);
    
    return transfers;
  }

  // Aggregate wallet data from transfers
  aggregateWallets(incoming, outgoing, contractAddress) {
    const walletMap = new Map();
    const categoryCounts = {
      external: 0,
      erc20: 0,
      erc721: 0,
      erc1155: 0,
      internal: 0
    };
    
    // Process incoming transfers (wallets sending TO contract)
    for (const tx of incoming) {
      const from = tx.from?.toLowerCase();
      if (!from) continue;
      
      categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1;
      
      if (!walletMap.has(from)) {
        walletMap.set(from, this.createWalletEntry(from));
      }
      
      const wallet = walletMap.get(from);
      wallet.interactions++;
      wallet.sentToContract++;
      wallet.categories[tx.category] = (wallet.categories[tx.category] || 0) + 1;
      
      if (tx.metadata?.blockTimestamp) {
        const ts = new Date(tx.metadata.blockTimestamp);
        if (!wallet.firstSeen || ts < wallet.firstSeen) {
          wallet.firstSeen = ts;
        }
        if (!wallet.lastSeen || ts > wallet.lastSeen) {
          wallet.lastSeen = ts;
        }
      }
      
      if (tx.asset) {
        wallet.uniqueAssets.add(tx.asset);
      }
    }
    
    // Process outgoing transfers (contract sending TO wallets)
    for (const tx of outgoing) {
      const to = tx.to?.toLowerCase();
      if (!to) continue;
      
      categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1;
      
      if (!walletMap.has(to)) {
        walletMap.set(to, this.createWalletEntry(to));
      }
      
      const wallet = walletMap.get(to);
      wallet.interactions++;
      wallet.receivedFromContract++;
      wallet.categories[tx.category] = (wallet.categories[tx.category] || 0) + 1;
      
      if (tx.metadata?.blockTimestamp) {
        const ts = new Date(tx.metadata.blockTimestamp);
        if (!wallet.firstSeen || ts < wallet.firstSeen) {
          wallet.firstSeen = ts;
        }
        if (!wallet.lastSeen || ts > wallet.lastSeen) {
          wallet.lastSeen = ts;
        }
      }
      
      if (tx.asset) {
        wallet.uniqueAssets.add(tx.asset);
      }
    }
    
    // Convert to array and calculate top category for each
    const wallets = Array.from(walletMap.values()).map(wallet => {
      // Find top category
      let topCategory = 'external';
      let maxCount = 0;
      
      for (const [cat, count] of Object.entries(wallet.categories)) {
        if (count > maxCount) {
          maxCount = count;
          topCategory = cat;
        }
      }
      
      return {
        ...wallet,
        firstSeen: wallet.firstSeen?.toISOString() || null,
        lastSeen: wallet.lastSeen?.toISOString() || null,
        topCategory,
        uniqueAssets: Array.from(wallet.uniqueAssets)
      };
    });
    
    const stats = {
      totalTransfers: incoming.length + outgoing.length,
      incomingTransfers: incoming.length,
      outgoingTransfers: outgoing.length,
      categoryCounts
    };
    
    return { wallets, stats };
  }

  // Create initial wallet entry
  createWalletEntry(address) {
    return {
      rank: 0,
      address,
      interactions: 0,
      firstSeen: null,
      lastSeen: null,
      sentToContract: 0,
      receivedFromContract: 0,
      topCategory: 'external',
      categories: {
        external: 0,
        erc20: 0,
        erc721: 0,
        erc1155: 0,
        internal: 0
      },
      uniqueAssets: new Set()
    };
  }

  // Format big number with decimals
  formatBigNumber(value, decimals) {
    try {
      const num = BigInt(value);
      const divisor = BigInt(10) ** BigInt(decimals);
      const integer = num / divisor;
      const fractional = num % divisor;
      return `${integer}.${fractional.toString().padStart(decimals, '0').slice(0, 4)}`;
    } catch {
      return value;
    }
  }

  // Format ETH balance
  formatETH(balanceHex) {
    if (!balanceHex || balanceHex === '0x') return '0.0000';
    try {
      const wei = BigInt(balanceHex);
      const eth = Number(wei) / 1e18;
      return eth.toFixed(4);
    } catch {
      return '0.0000';
    }
  }

  // Get cached scan from Firestore
  async getCachedScan(address) {
    try {
      const docRef = this.db.collection('contractScans').doc(address.toLowerCase());
      const doc = await docRef.get();
      
      if (doc.exists) {
        const data = doc.data();
        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - data.cachedAt.toMillis();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          return data.result;
        }
      }
    } catch (error) {
      console.warn('[ContractScanner] Cache read error:', error.message);
    }
    return null;
  }

  // Cache scan result in Firestore
  async cacheScan(address, result) {
    try {
      const docRef = this.db.collection('contractScans').doc(address.toLowerCase());
      await docRef.set({
        result,
        cachedAt: Timestamp.now(),
        address: address.toLowerCase()
      });
    } catch (error) {
      console.warn('[ContractScanner] Cache write error:', error.message);
    }
  }
}

export default ContractScanner;
