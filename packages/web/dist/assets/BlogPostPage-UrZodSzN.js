import{o as c}from"./rolldown-runtime-MddlTo9B.js";import{Xl as d,cu as u,du as h}from"./vendor-DHU1kG0o.js";import{s as m}from"./primitives-Ko5fSwFT.js";import{t as r}from"./LandingLayout-BGxKAhFn.js";var g=c(h(),1),e=d(),o=[{label:"Intel",href:"/"},{label:"Blog",href:"/blog",active:!0},{label:"Docs",href:"/docs/getting-started"},{label:"Features",href:"/features"},{label:"Pricing",href:"/pricing"},{label:"How It Works",href:"/how-it-works"},{label:"FAQ",href:"/faq"},{label:"API",href:"/api-docs"},{label:"CLI",href:"/cli"},{label:"About",href:"/about"}],p={"what-is-sybil-detection":{id:"1",title:"What is Sybil Detection in Crypto",excerpt:"Learn how Sybil detection works in cryptocurrency and how it helps identify coordinated bot networks and fake accounts.",category:"Security",date:"2026-03-15",readTime:"5 min read",author:"FundTracer Team",slug:"what-is-sybil-detection",content:`
## What is Sybil Attack?

A Sybil attack occurs when a single entity creates multiple fake identities (called Sybils) to manipulate a blockchain network. In the context of cryptocurrency, this often means creating numerous wallet addresses to:

- Manipulate governance voting outcomes
- Inflate trading volumes artificially
- Exploit airdrop programs
- Create fake social proof for projects

## How Sybil Detection Works

Sybil detection uses various techniques to identify coordinated wallet activity:

### 1. Transaction Pattern Analysis

Analyzes when transactions occur. Wallets that consistently execute transactions in the same block often indicate bot activity.

### 2. Funding Source Clustering

Groups wallets that share common funding sources. If multiple wallets receive funds from the same source, they may be controlled by the same entity.

### 3. Behavioral Similarity

Compares transaction patterns across wallets. Similar timing, amounts, and destinations can indicate coordinated behavior.

### 4. Gas Usage Patterns

Analyzes gas spending behavior. Bots often have consistent gas patterns that differ from regular users.

## Common Sybil Indicators

- Same-block transactions from multiple wallets
- Shared funding sources
- Similar transaction timing
- Uniform token transfer patterns
- New wallets with similar behavior

## Why Sybil Detection Matters

Detecting Sybil activity is crucial for:

- **Airdrop Distribution**: Ensuring tokens reach legitimate users
- **Governance**: Preventing vote manipulation
- **Security**: Identifying potential threats
- **Analytics**: Accurate user metrics

## Using FundTracer for Sybil Detection

FundTracer provides a comprehensive Sybil detection feature that analyzes wallet clusters and provides risk scores. Simply input wallet addresses to identify potential Sybil activity.

Learn more about our [Sybil Detection](/docs/sybil-detection) feature.
    `},"how-to-trace-ethereum-wallet-funds":{id:"2",title:"How to Trace Ethereum Wallet Funds",excerpt:"A comprehensive guide to tracing funds on the Ethereum blockchain using block explorers and analytics tools.",category:"Tutorial",date:"2026-03-10",readTime:"8 min read",author:"FundTracer Team",slug:"how-to-trace-ethereum-wallet-funds",content:`
## Why Trace Wallet Funds?

Tracing Ethereum wallet funds is essential for:

- Verifying the source of funds before transactions
- Investigating suspicious addresses
- Understanding wallet behavior
- Due diligence for DeFi transactions

## Basic Methods to Trace Funds

### Using Etherscan

1. Visit etherscan.io
2. Enter the wallet address
3. View transaction history
4. Analyze token transfers

### Using FundTracer

FundTracer provides advanced tracing:

- Complete transaction timeline
- Funding source analysis
- Risk scoring
- Cross-chain analysis

## Understanding Transaction Flow

When tracing funds, look for:

- **First Source**: Where did the initial funds come from?
- **Intermediaries**: Through which addresses did funds pass?
- **Final Destination**: Where did the funds end up?

## Key Metrics to Analyze

1. **Transaction Frequency**: How often does the wallet transact?
2. **Token Holdings**: What tokens does the wallet hold?
3. **Contract Interactions**: Which DeFi protocols has it used?
4. **Age**: When was the wallet first active?

## Red Flags to Watch For

- Mixing services usage
- Newly created wallets with large transactions
- Direct funding from known exchanges
- Interaction with suspicious contracts

## Advanced Tracing with FundTracer

Our platform provides:

- [Funding Tree Analysis](/docs/funding-tree-analysis) for visual fund flows
- [Risk Scoring](/docs/wallet-risk-score) to assess wallet safety
- Cross-chain analysis for multi-chain portfolios
    `},"how-airdrop-farmers-get-caught":{id:"3",title:"How Airdrop Farmers Get Caught",excerpt:"Understanding how blockchain analytics detects airdrop farming and coordinated wallet activity.",category:"Security",date:"2026-03-05",readTime:"6 min read",author:"FundTracer Team",slug:"how-airdrop-farmers-get-caught",content:`
## What is Airdrop Farming?

Airdrop farming involves creating multiple wallet addresses to maximize airdrop rewards from blockchain projects. Projects use these rewards to incentivize early adoption, but farmers exploit this by creating fake activity.

## How Projects Detect Airdrop Farmers

### 1. Wallet Clustering

Projects analyze wallet clusters to find wallets controlled by the same entity:

- Shared funding sources
- Similar transaction patterns
- Gas fee correlations

### 2. Behavioral Analysis

Legitimate users and farmers have different behaviors:

- **Farmers**: Consistent, automated patterns
- **Users**: Varied, unpredictable patterns

### 3. On-Chain Metrics

Projects analyze:

- Transaction timing
- Gas usage patterns
- Contract interaction diversity
- Wallet age

### 4. Cross-Reference Analysis

Looking for:

- Wallets that only interact with one protocol
- Coordinated activity patterns
- Unusual transaction volumes

## Common Detection Methods

### Same-Block Detection

Farmers often use bots that execute multiple transactions in the same block. This creates a detectable pattern.

### Funding Correlation

Wallets funded from the same source are likely controlled by the same entity.

### Gas Pattern Analysis

Bots typically have consistent gas prices and limits.

### Interaction Similarity

Farmers often interact with the same contracts in similar patterns.

## How to Avoid Detection

If you're farming (not recommended), consider:

- Using different funding sources
- Varying transaction timing
- Avoiding automated tools
- Creating natural-looking patterns

## The Bottom Line

Projects are increasingly sophisticated in detecting farming. The best strategy is to be a genuine user rather than trying to game the system.

Learn more about [Sybil Detection](/docs/sybil-detection) and [Wallet Risk Scores](/docs/wallet-risk-score).
    `},"top-blockchain-forensics-tools-2026":{id:"4",title:"Top Blockchain Forensics Tools 2026",excerpt:"A comparison of the best blockchain forensics and on-chain analytics tools available today.",category:"Tools",date:"2026-02-28",readTime:"7 min read",author:"FundTracer Team",slug:"top-blockchain-forensics-tools-2026",content:`
## Why Blockchain Forensics Tools Matter

Blockchain forensics tools are essential for anyone working in cryptocurrency - from investors conducting due diligence to security researchers investigating fraud. These tools help you analyze wallet addresses, trace fund flows, detect suspicious patterns, and make informed decisions.

With the exponential growth of on-chain activity, manually analyzing transactions is impossible. Professional-grade forensics tools provide the automation and visualization needed to understand complex fund flows and identify risks.

## The Leading Blockchain Forensics Tools in 2026

### 1. FundTracer

FundTracer is a professional blockchain forensics platform designed for researchers, investors, and compliance teams. It offers comprehensive wallet analysis across multiple blockchain networks.

**Key Features:**
- Multi-chain support (Ethereum, Linea, Base, Arbitrum, Optimism, Polygon, BSC, Sui)
- Wallet analysis with transaction history and token holdings
- Sybil detection for identifying coordinated bot networks
- Funding tree visualization for tracing fund flows
- Wallet risk scoring based on behavioral analysis
- Contract analytics for security insights

**Pricing:** Free tier with 7 analyses every 4 hours; Pro and Max plans for unlimited access.

**Best For:** Researchers, investors, compliance teams, and DeFi users.

### 2. Chainalysis

Chainalysis is one of the largest and most established blockchain analytics companies, primarily serving government agencies and large financial institutions.

**Key Features:**
- Blockchain data platform
- Investigations and compliance tools
- Market intelligence
- Reactor (investigations software)
- KYT (know-your-transaction) compliance

**Pricing:** Enterprise-level pricing; not suitable for individual users.

**Best For:** Government agencies, exchanges, financial institutions.

### 3. Elliptic

Elliptic provides blockchain analytics and crypto compliance solutions for financial institutions and crypto businesses.

**Key Features:**
- Wallet screening
- Transaction monitoring
- Crypto compliance
- Blockchain analytics
- NFT analysis

**Pricing:** Enterprise pricing.

**Best For:** Financial institutions, crypto businesses, compliance teams.

### 4. Nansen

Nansen combines on-chain data with wallet labels to provide analytics for crypto investors.

**Key Features:**
- Wallet labels and profiles
- Token holder tracking
- Smart money alerts
- DeFi analytics
- NFT insights

**Pricing:** Subscription-based with tiered plans.

**Best For:** Crypto investors, traders, DeFi participants.

### 5. Arkham Intelligence

Arkham is a blockchain intelligence platform that deanonymizes on-chain activity through AI-powered analysis.

**Key Features:**
- Deanonymization engine
- Entity identification
- Smart alerts
- Intelligence dashboard
- Heavily crowdsourced labeling

**Pricing:** Free tier available; Pro plans for advanced features.

**Best For:** Traders, researchers, anyone wanting to identify whale wallets.

### 6. Dune Analytics

Dune Analytics is a powerful platform for querying and visualizing blockchain data.

**Key Features:**
- SQL-based queries
- Custom dashboards
- Community-created visualizations
- Extensive pre-built datasets
- API access

**Pricing:** Free tier with limits; team plans available.

**Best For:** Data analysts, researchers, DeFi power users.

### 7. Etherscan / Blockscout

Block explorers are the foundation of blockchain analysis, providing free access to transaction data.

**Key Features:**
- Transaction history
- Token transfers
- Contract interaction
- Basic analytics
- Free to use

**Pricing:** Free (with premium features on some).

**Best For:** Anyone needing basic transaction lookup.

## Comparing the Tools

| Tool | Best For | Price | Multi-Chain |
|------|----------|-------|-------------|
| FundTracer | Research, Due Diligence | Free tier | Yes (8 chains) |
| Chainalysis | Enterprise, Compliance | Enterprise | Yes |
| Elliptic | Financial Institutions | Enterprise | Yes |
| Nansen | Investors, Trading | Subscription | Yes |
| Arkham | Whales, Research | Free tier | Yes |
| Dune | Data Analysis | Free tier | Yes |
| Etherscan | Basic Lookup | Free | Limited |

## Which Tool Should You Use?

The right tool depends on your needs:

- **For comprehensive wallet analysis with risk scoring:** Use FundTracer
- **For enterprise compliance:** Use Chainalysis or Elliptic
- **For trading insights:** Use Nansen or Arkham
- **For data analysis:** Use Dune
- **For basic transactions:** Use Etherscan

Many researchers use multiple tools in combination. FundTracer provides an excellent starting point with its free tier and comprehensive feature set.

## Conclusion

The blockchain forensics landscape has matured significantly. Whether you're conducting due diligence, investigating fraud, or simply want to understand wallet activity, there's a tool for every use case and budget.

Start with FundTracer for free at fundtracer.xyz and explore our documentation to learn more about wallet analysis.
    `},"what-is-wallet-risk-score":{id:"5",title:"What is a Wallet Risk Score",excerpt:"Understanding how wallet risk scores are calculated and how to use them for safer crypto transactions.",category:"Education",date:"2026-02-20",readTime:"5 min read",author:"FundTracer Team",slug:"what-is-wallet-risk-score",content:`
## Understanding Wallet Risk Scores

A wallet risk score is a numerical assessment that indicates the potential risk level associated with a cryptocurrency wallet address. Think of it as a credit score for blockchain wallets - it helps you quickly evaluate whether a wallet is trustworthy before making transactions.

Risk scores typically range from 0 to 100, with higher scores indicating greater risk. Some systems use letter grades (A-F) or simple labels (Low/Medium/High).

## How Wallet Risk Scores Work

Wallet risk scoring algorithms analyze multiple factors to determine risk:

### 1. Transaction Patterns

The algorithm examines:
- Transaction frequency and timing
- Average transaction sizes
- Patterns consistent with bot activity
- Same-block transaction patterns

### 2. Fund Sources

Analysis includes:
- Origin of initial funding
- Connection to known entities (exchanges, mixers)
- Funding from high-risk sources
- Cross-chain bridge usage

### 3. Contract Interactions

Scoring considers:
- Types of protocols interacted with
- Smart contract deployment
- Interaction with known malicious contracts
- DeFi protocol usage patterns

### 4. Behavioral Indicators

- Wallet age and activity history
- Similarity to known Sybil clusters
- Coordinated activity with other wallets
- Unusual token holding patterns

## Risk Score Ranges

| Score Range | Risk Level | Action Required |
|-------------|------------|------------------|
| 0-39 | Low Risk | Proceed normally |
| 40-59 | Medium Risk | Standard precautions |
| 60-79 | High Risk | Exercise caution |
| 80-100 | Critical Risk | Avoid transactions |

## What Factors Increase Risk Score

### High Risk Indicators

- **Mixer Usage:** Interaction with Tornado Cash or other mixers
- **New Wallets:** Recently created addresses with large transactions
- **Same-Block Activity:** Consistent same-block transactions suggest bots
- **Shared Funding:** Wallets funded from the same source
- **Known Scams:** Interaction with flagged malicious contracts

### Low Risk Indicators

- **Age:** Long-standing wallet with consistent activity
- **CEX Deposits:** Funding from verified exchanges
- **Diverse Interactions:** Usage of reputable DeFi protocols
- **Clean History:** No interaction with suspicious contracts

## Why Wallet Risk Scores Matter

### For Investors

- Verify source of funds before investment
- Identify whale wallets to follow
- Assess counterparty risk in DeFi transactions

### For Projects

- Detect airdrop farmers
- Identify Sybil attacks in governance
- Filter for legitimate users

### For Compliance

- Screen wallet addresses
- Meet AML requirements
- Document due diligence

### For Traders

- Identify potential pump-and-dump wallets
- Follow smart money indicators
- Avoid scam tokens

## Using Wallet Risk Scores Effectively

### Best Practices

1. **Don't rely solely on scores** - Use them as one input in your decision-making
2. **Understand the methodology** - Different tools use different algorithms
3. **Check multiple factors** - Look at the underlying data behind the score
4. **Consider context** - A high score might be legitimate depending on use case

### Red Flags to Watch

- Risk score doesn't match wallet behavior
- Score changes dramatically in short period
- Critical risk score for well-known entities (likely false positive)

## FundTracer's Risk Scoring

FundTracer provides comprehensive risk scoring that combines multiple factors:

- Multi-chain analysis across 8 blockchain networks
- Sybil detection to identify coordinated activity
- Funding source analysis
- Contract interaction history
- Behavioral pattern recognition

Try it free at fundtracer.xyz and learn more about our Risk Scoring documentation.

## Conclusion

Wallet risk scores are a powerful tool for making informed decisions in the crypto space. They provide a quick way to assess potential risks, but should be used as part of a broader due diligence process.

Understanding how these scores work helps you make better decisions and avoid common pitfalls in cryptocurrency transactions.
    `},"how-to-read-blockchain-funding-tree":{id:"6",title:"How to Read a Blockchain Funding Tree",excerpt:"Learn to interpret funding tree visualizations and trace the origin of crypto assets.",category:"Tutorial",date:"2026-02-15",readTime:"10 min read",author:"FundTracer Team",slug:"how-to-read-blockchain-funding-tree",content:`
## What is a Funding Tree?

A funding tree (also called a funding graph or transaction tree) is a visual representation of how funds flow into and out of a cryptocurrency wallet. It shows the origin of funds, the intermediaries they passed through, and where they ultimately ended up.

Think of it as a family tree for money - you can see the lineage of every token, tracing it back to its source.

## Why Funding Trees Matter

Understanding fund flows is crucial for:

### Due Diligence

Before making a transaction, you want to know: "Where did this money come from?" A funding tree reveals the complete history.

### Investigations

Security researchers and investigators use funding trees to trace stolen funds, identify scammers, and build cases.

### Compliance

Anti-money laundering (AML) requirements often necessitate understanding fund sources.

### Research

Analyzing fund flows helps understand market dynamics, whale movements, and protocol usage.

## Reading a Funding Tree

### Understanding the Structure

In a typical funding tree visualization:

- **Central node:** The wallet you are analyzing
- **Parent nodes:** Sources of funds (where money came from)
- **Child nodes:** Destinations of funds (where money went)
- **Edges (lines):** Show the direction and amount of flow

### Node Types

Different entities are typically color-coded:

| Entity Type | Description | Common Color |
|-------------|-------------|---------------|
| Centralized Exchange (CEX) | Binance, Coinbase, etc. | Orange/Amber |
| Decentralized Exchange (DEX) | Uniswap, Raydium, etc. | Purple |
| Bridge | Cross-chain bridges | Cyan |
| Mixer | Privacy mixers | Red/Pink |
| Smart Contract | DeFi protocols | Indigo |
| Regular Wallet | Personal addresses | Green |

### Edge Information

The lines connecting nodes typically show:
- Amount transferred
- Token type
- Timestamp

### Depth Levels

Funding trees can show multiple generations or depth levels:

- **Level 1:** Direct sources/destinations
- **Level 2:** Sources of sources
- **Level 3+:** Deeper history

## Practical Example

Lets say you want to analyze a wallet that received 10 ETH from wallet A. The funding tree might show:

Wallet A flows to Your Target Wallet, which flows to a DEX Pool and Another Wallet.

This reveals:
1. Wallet A funded your target
2. Your target also sent funds to a DEX
3. Your target received funds from another wallet

## Key Metrics in Funding Tree Analysis

### 1. Number of Sources

Many sources suggest diversified activity. Few sources might indicate centralized control.

### 2. Source Types

Funds from exchanges are generally cleaner than funds from mixers or known scam addresses.

### 3. Flow Patterns

- Does money flow through many intermediaries?
- Is there a pattern of layering?
- Are funds being dispersed widely?

### 4. Timing Patterns

- All activity at similar times suggests automation
- Regular patterns suggest scheduled transactions

## Red Flags in Funding Trees

### High Risk Indicators

- **Mixer usage:** Any connection to mixers like Tornado Cash
- **Direct from exchange to mixer:** Attempting to hide the trail
- **New wallet with large inflows:** Could be newly created for scams
- **Circle of doom:** Funds cycling between same wallets
- **Direct from known scam:** Immediate red flag

### Medium Risk Indicators

- Many intermediaries making tracking difficult
- Interaction with known high-risk protocols
- Recent wallet age with significant activity

## Using FundTracers Funding Tree

FundTracer provides an interactive D3-powered funding tree visualization:

### Features

- **Interactive visualization:** Zoom, pan, click to expand
- **Entity identification:** Automatically identifies exchanges, protocols
- **Depth control:** Configure how many levels to trace
- **Suspicious flags:** Highlights potential risks

### How to Use

1. Enter any wallet address on fundtracer.xyz
2. Select Funding Tree analysis mode
3. Choose depth level (1-5 recommended for initial analysis)
4. Explore the visualization

Read our full Funding Tree documentation for more details.

## Best Practices for Funding Tree Analysis

1. **Start shallow:** Begin with Level 1-2 before going deeper
2. **Check source types:** Focus on entity types, not just amounts
3. **Look for patterns:** Automated transactions have distinctive patterns
4. **Cross-reference:** Use multiple tools to verify findings
5. **Document your findings:** Save screenshots for compliance

## Conclusion

Funding tree analysis is one of the most powerful techniques in blockchain forensics. It transforms complex transaction data into visual stories that reveal fund origins and destinations.

Mastering this skill helps with due diligence, investigations, and understanding on-chain activity. FundTracers visualization makes it accessible to anyone - no technical background required.

Start analyzing funding trees at fundtracer.xyz.
    `},"evm-vs-solana-transaction-tracing":{id:"7",title:"EVM vs Solana Transaction Tracing",excerpt:"Comparing transaction tracing and wallet analysis across Ethereum Virtual Machine chains and Solana.",category:"Comparison",date:"2026-02-10",readTime:"6 min read",author:"FundTracer Team",slug:"evm-vs-solana-transaction-tracing",content:`
## Understanding EVM vs Solana Architecture

The two largest smart contract platforms in crypto - Ethereum (and its EVM-compatible chains) and Solana - have fundamentally different architectures that affect how we trace transactions and analyze wallets.

## Key Architectural Differences

### 1. Account Model

**EVM (Ethereum Virtual Machine):**
- Uses an Account-Based model
- Every address has: nonce, balance, storage root, code hash
- Externally Owned Accounts (EOAs) vs Contract Accounts
- Explicit separation between wallet and contract

**Solana:**
- Uses a different model with Program-Derived Addresses (PDAs)
- Programs (smart contracts) can own accounts
- More complex account structure
- Multiple signatures possible per transaction

### 2. Transaction Structure

**EVM Transactions:**
- Include: nonce, gas price, gas limit, to address, value, data, signature
- Simpler structure
- One signature per transaction

**Solana Transactions:**
- Include: recent blockhash, fee, instructions
- Multiple instructions per transaction
- Multiple signers possible
- More complex but more flexible

### 3. Block Production

**EVM:**
- Block time: 12 seconds (Ethereum), varies on L2s
- Transactions ordered by gas price
- Mempool visible to all

**Solana:**
- Block time: 400ms (much faster)
- Leader-based ordering
- Different mempool characteristics

## Tracing Differences

### Wallet Analysis on EVM Chains

EVM chains are well-supported by tools like Etherscan and FundTracer:

- Complete transaction history visible
- ERC-20 token transfers easily tracked
- Contract interactions clearly logged
- Standard address format (0x...)
- Multiple EVM chains (Base, Arbitrum, Polygon, etc.)

### Wallet Analysis on Solana

Solana presents unique challenges:

- Different address format (base58)
- SPL tokens (vs ERC-20)
- Program interactions more complex
- PDA derivation different from traditional addresses
- Requires specialized tooling

### What Works Similarly

Both chains allow:
- Viewing transaction history
- Tracking token transfers
- Analyzing contract interactions
- Identifying wallet behavior patterns

## Supported Chains Comparison

| Feature | EVM (ETH, Base, Arbitrum, etc.) | Solana |
|---------|----------------------------------|--------|
| Address Format | 0x... | Base58 |
| Token Standard | ERC-20 | SPL |
| NFT Standard | ERC-721 | Metaplex |
| Block Time | 12s (ETH), faster L2s | 400ms |
| Tools Available | Many | Fewer, specialized |
| FundTracer Support | Full | Full |

## Cross-Chain Considerations

### EVM-Compatible Chains

With FundTracer, you can analyze:
- Ethereum
- Linea
- Base
- Arbitrum
- Optimism
- Polygon
- BSC

All share the same address format and EVM architecture.

### Solana Integration

Solana requires separate handling due to its unique architecture. FundTracer provides full support for Solana wallet analysis.

## Which Should You Use?

### Use EVM When:

- Working with DeFi protocols (Uniswap, Aave, etc.)
- Analyzing Ethereum-based tokens and NFTs
- Need broader tool availability
- Focus on compliance (EVM chains have more established AML frameworks)

### Use Solana When:

- Analyzing NFT activity (Solana has vibrant NFT ecosystem)
- Need faster block times for real-time analysis
- Working with Solana-specific protocols (Tensor, Magic Eden, etc.)
- Following specific Solana-native projects

## FundTracer Support

FundTracer provides comprehensive analysis for both:

- **EVM chains:** Full wallet analysis, transaction history, risk scoring
- **Solana:** Dedicated Solana analysis with SPL token tracking, NFT analysis

You can switch between chains seamlessly on our platform.

## Conclusion

While EVM and Solana have different architectures, both are traceable with the right tools. The key differences affect how data is presented but do not fundamentally prevent analysis.

The most important factor is using tools built for each specific chain. FundTracer supports both, allowing you to analyze wallets across the crypto ecosystem.

Try it at fundtracer.xyz - analyze EVM chains at /app-evm and Solana at /app-solana.

For more details, see our documentation on Ethereum Wallet Tracker and Solana Wallet Tracker.
    `},"how-to-use-fundtracer-api":{id:"8",title:"How to Use FundTracer API",excerpt:"A complete guide to integrating FundTracer API into your applications for wallet analysis.",category:"Development",date:"2026-02-05",readTime:"12 min read",author:"FundTracer Team",slug:"how-to-use-fundtracer-api",content:`
## Introduction to FundTracer API

The FundTracer API allows developers to integrate our powerful blockchain forensics capabilities directly into their applications, services, and workflows. Whether you are building a crypto portfolio tracker, compliance tool, or research dashboard, our API provides the data you need.

## Getting Started

### Authentication

To use the API, you need an API key. Here is how to get one:

1. Sign up at fundtracer.xyz
2. Navigate to your profile settings
3. Generate a new API key
4. Keep your key secure - never expose it in client-side code

### Base URL

All API requests go through:
https://api.fundtracer.xyz/v1

### Authentication Header

Include your API key in the request header:
Authorization: Bearer YOUR_API_KEY

## API Endpoints

### 1. Wallet Analysis

**Endpoint:** GET /wallet/{address}

**Parameters:**
- address - The wallet address to analyze
- chain - The blockchain network (ethereum, solana, base, etc.)

**Example Request:**
curl -X GET "https://api.fundtracer.xyz/v1/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1?chain=ethereum" -H "Authorization: Bearer YOUR_API_KEY"

**Example Response:**
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "balance": "1.5234",
  "balanceUSD": 2847.32,
  "riskScore": 45,
  "labels": ["early-adopter", "defi-user"],
  "transactions": [...],
  "tokens": [...],
  "firstSeen": "2017-06-15"
}

### 2. Transaction History

**Endpoint:** GET /wallet/{address}/transactions

**Parameters:**
- address - Wallet address
- chain - Blockchain network
- limit - Number of transactions (default: 50)
- cursor - Pagination cursor

### 3. Token Holdings

**Endpoint:** GET /wallet/{address}/tokens

Returns all ERC-20/SPL tokens held by the wallet with current values.

### 4. Funding Tree

**Endpoint:** GET /wallet/{address}/funding-tree

**Parameters:**
- depth - How many levels to trace (1-5)
- direction - "inbound", "outbound", or "both"

Returns the funding flow visualization data.

### 5. Risk Score

**Endpoint:** GET /wallet/{address}/risk

Returns detailed risk score breakdown with factors.

### 6. Sybil Analysis

**Endpoint:** POST /sybil/analyze

**Body:**
{
  "addresses": ["0x...", "0x...", "0x..."],
  "chain": "ethereum"
}

Returns cluster analysis identifying potential Sybil activity.

## Code Examples

### JavaScript / TypeScript

const axios = require('axios');

const API_KEY = process.env.FUNDTRACER_API_KEY;
const BASE_URL = 'https://api.fundtracer.xyz/v1';

async function analyzeWallet(address, chain = 'ethereum') {
  try {
    const response = await axios.get(
      BASE_URL + '/wallet/' + address,
      {
        params: { chain },
        headers: { Authorization: 'Bearer ' + API_KEY }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage
const result = await analyzeWallet('0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1');
console.log(result.riskScore);

### Python

import requests
import os

API_KEY = os.getenv('FUNDTRACER_API_KEY')
BASE_URL = 'https://api.fundtracer.xyz/v1'

def analyze_wallet(address, chain='ethereum'):
    headers = {'Authorization': 'Bearer ' + API_KEY}
    params = {'chain': chain}
    
    response = requests.get(
        BASE_URL + '/wallet/' + address,
        headers=headers,
        params=params
    )
    return response.json()

# Usage
result = analyze_wallet('0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1')
print(result['risk_score'])

## Rate Limits

| Plan | Requests/minute | Daily Limit |
|------|-----------------|-------------|
| Free | 10 | 100 |
| Pro | 60 | 10,000 |
| Max | 200 | Unlimited |

## Best Practices

### 1. Cache Results

Do not make API calls for the same wallet repeatedly. Cache results for at least 5-10 minutes.

### 2. Handle Errors Gracefully

try {
  const data = await analyzeWallet(address);
} catch (error) {
  if (error.response?.status === 429) {
    // Rate limited - wait and retry
    await sleep(60000);
  } else if (error.response?.status === 404) {
    // Wallet not found
  }
}

### 3. Use Webhooks for Large Scale

For monitoring many wallets, use webhooks instead of polling.

### 4. Secure Your API Key

Never commit API keys to version control. Use environment variables.

## Use Cases

### Compliance Tool

Build automated AML screening by checking wallet risk scores before transactions.

### Portfolio Tracker

Add wallet analysis to track portfolio performance and whale movements.

### Research Dashboard

Create custom dashboards for on-chain research with historical data.

### Alert Systems

Monitor wallets for significant changes and send alerts.

## Documentation

Full API documentation is available at fundtracer.xyz/docs/api-reference.

## Getting Help

- Check our API Docs
- Join our community
- Contact support for enterprise needs

## Conclusion

The FundTracer API provides powerful blockchain forensics capabilities for developers. Whether you are building compliance tools, research dashboards, or consumer apps, our API has you covered.

Get started with a free account at fundtracer.xyz and generate your API key today.
    `},"detect-coordinated-wallet-activity":{id:"9",title:"How to Detect Coordinated Wallet Activity",excerpt:"Technical deep-dive into methods used to detect coordinated wallet behavior and Sybil attacks.",category:"Security",date:"2026-01-30",readTime:"8 min read",author:"FundTracer Team",slug:"detect-coordinated-wallet-activity",content:`
## Understanding Coordinated Wallet Activity

Coordinated wallet activity occurs when multiple wallets act in concert, whether intentionally (like a trading bot) or maliciously (like a Sybil attack). Detecting this coordination is crucial for security, compliance, and research.

## What is Coordinated Activity?

Coordinated activity means multiple wallets displaying synchronized behavior that suggests common control or coordination. This includes:

- **Same-block transactions:** Multiple wallets transacting within the same block
- **Shared funding sources:** Wallets funded from the same origin
- **Similar patterns:** Identical transaction timing, amounts, or destinations
- **Group behavior:** Acting together toward a common goal

## Why Detect Coordinated Activity?

### For Projects

- **Prevent Sybil attacks:** Stop fake users from inflating metrics
- **Fair airdrops:** Ensure tokens reach genuine users
- **Governance integrity:** Protect against vote manipulation

### For Investors

- **Avoid pump schemes:** Identify coordinated price manipulation
- **Due diligence:** Verify legitimate activity before investing
- **Risk assessment:** Understand true market dynamics

### For Compliance

- **AML requirements:** Identify potential money laundering
- **Investigation support:** Trace criminal fund flows
- **Reporting obligations:** Document suspicious activity

## Detection Methods

### 1. Temporal Analysis

**Same-Block Detection**

The most obvious indicator is multiple transactions in the same block:

Block 15,432,987:
- Wallet A -> DEX (0.5 ETH)
- Wallet B -> DEX (0.5 ETH)
- Wallet C -> DEX (0.5 ETH)
- Wallet D -> DEX (0.5 ETH)

This pattern strongly suggests coordination (likely automated).

**Timing Correlation**

Even without same-block activity, wallets with similar transaction timing are suspicious:

- Consistent intervals between transactions
- Same time of day patterns
- Synchronized with external events

### 2. Funding Analysis

**Common Source Detection**

Wallets funded from the same source are likely related:

Wallet A: funded by 0x1111...
Wallet B: funded by 0x1111...
Wallet C: funded by 0x1111...

**Funding Pattern Matching**

Similar funding patterns indicate common control:

- Same token received from same addresses
- Similar funding amounts and timing
- Cross-chain funding from same sources

### 3. Behavioral Clustering

**Transaction Similarity**

Wallets with identical transaction patterns:

- Same tokens transferred
- Same destination addresses
- Similar amounts
- Similar frequency

**Contract Interaction Patterns**

Similar DeFi interactions:

- Same protocols used
- Same transaction types
- Similar swap patterns

### 4. Network Analysis

**Cluster Identification**

Using graph theory to identify connected wallets:

- Central nodes connecting multiple wallets
- Dense subgraph connections
- Bridge wallets linking clusters

### 5. Machine Learning Approaches

Modern detection uses ML models trained on:

- Known Sybil clusters
- Labeled training data
- Pattern recognition
- Anomaly detection

## Practical Detection Steps

### Step 1: Gather Data

Collect transaction history for all wallets in question.

### Step 2: Temporal Analysis

Look for:
- Same-block transactions
- Timing correlations
- Periodic patterns

### Step 3: Funding Analysis

Trace fund sources:
- Common ancestors
- Shared funding patterns
- Cross-chain correlations

### Step 4: Behavioral Comparison

Compare:
- Token holdings
- Contract interactions
- Transaction types

### Step 5: Cluster Formation

Identify groups using:
- Graph analysis
- Similarity scores
- Machine learning

## Using FundTracer for Detection

FundTracer provides built-in Sybil detection:

### Features

- **Cluster analysis:** Identifies related wallets
- **Risk scoring:** Quantifies coordination likelihood
- **Funding tree:** Visualizes fund flows
- **Behavioral comparison:** Side-by-side analysis

### How to Use

1. Enter wallet addresses on fundtracer.xyz
2. Select Sybil Detection mode
3. View cluster analysis and risk scores

Try our Sybil Detection documentation for detailed guide.

## Red Flags Summary

| Indicator | Risk Level |
|-----------|------------|
| Same-block transactions | High |
| Shared funding source | High |
| Identical patterns | High |
| Similar timing | Medium |
| Common contracts | Medium |
| Network connections | Medium |

## Conclusion

Detecting coordinated wallet activity requires analyzing multiple dimensions: timing, funding sources, behavior patterns, and network connections. The key is combining multiple detection methods rather than relying on any single indicator.

FundTracers Sybil detection does this automatically, scoring wallets based on multiple factors and identifying clusters of related addresses.

For more on this topic, see our articles on What is Sybil Detection and How Airdrop Farmers Get Caught.
    `}};function k(){const t=p[u().pathname.split("/").pop()||""];if((0,g.useEffect)(()=>{if(t){document.title=`${t.title} | FundTracer Blog`;const a=document.createElement("script");return a.type="application/ld+json",a.textContent=JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:t.title,description:t.excerpt,author:{"@type":"Organization",name:t.author},datePublished:t.date,readTime:t.readTime,url:`https://www.fundtracer.xyz/blog/${t.slug}`}),document.head.appendChild(a),()=>{document.head.removeChild(a)}}},[t]),!t)return(0,e.jsx)(r,{navItems:o,showSearch:!1,children:(0,e.jsxs)("div",{className:"blog-post-error",children:[(0,e.jsx)("h1",{children:"Post Not Found"}),(0,e.jsx)("p",{children:"The blog post you're looking for doesn't exist."}),(0,e.jsx)("a",{href:"/blog",children:"Back to Blog"})]})});const l=t.content.split(`

`).filter(a=>a.trim());return(0,e.jsx)(r,{navItems:o,showSearch:!1,children:(0,e.jsxs)("article",{className:"blog-post",children:[(0,e.jsxs)("header",{className:"blog-post__header",children:[(0,e.jsx)(m,{variant:"info",children:t.category}),(0,e.jsxs)("div",{className:"blog-post__meta",children:[(0,e.jsx)("span",{children:t.date}),(0,e.jsx)("span",{children:t.readTime})]})]}),(0,e.jsx)("h1",{className:"blog-post__title",children:t.title}),(0,e.jsx)("p",{className:"blog-post__excerpt",children:t.excerpt}),(0,e.jsx)("div",{className:"blog-post__content",children:l.map((a,n)=>a.startsWith("## ")?(0,e.jsx)("h2",{children:a.replace("## ","")},n):a.startsWith("### ")?(0,e.jsx)("h3",{children:a.replace("### ","")},n):a.startsWith("- ")?(0,e.jsx)("ul",{children:a.split(`
`).filter(i=>i.startsWith("- ")).map((i,s)=>(0,e.jsx)("li",{children:i.replace("- ","")},s))},n):/^\d+\./.test(a)?(0,e.jsx)("ol",{children:a.split(`
`).filter(i=>/^\d+\./.test(i)).map((i,s)=>(0,e.jsx)("li",{children:i.replace(/^\d+\.\s*/,"")},s))},n):(0,e.jsx)("p",{children:a},n))}),(0,e.jsx)("footer",{className:"blog-post__footer",children:(0,e.jsx)("a",{href:"/blog",className:"blog-post__back",children:"Back to Blog"})})]})})}export{k as BlogPostPage,k as default};
