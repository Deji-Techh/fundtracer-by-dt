# FundTracer CLI

Command-line interface for blockchain wallet forensics and analysis. Now with optimized Sybil detection using 20 API keys and parallel processing.

## Installation

```bash
# Clone the repository
git clone https://github.com/Deji-Tech/fundtracer-by-dt.git
cd fundtracer-by-dt

# Install dependencies
npm install

# Build all packages
npm run build

# Link CLI globally
npm link --workspace=@fundtracer/cli
# OR add to PATH:
export PATH="$HOME/.local/bin:$PATH"
```

## Configuration

Before using the CLI, set your Alchemy API key:

```bash
# Set your API key
fundtracer config --set-key alchemy:YOUR_ALCHEMY_API_KEY

# Add optional providers for faster analysis
fundtracer config --set-key moralis:YOUR_MORALIS_KEY
fundtracer config --set-key dune:YOUR_DUNE_KEY

# Configure Sybil detection keys (20 keys for parallel processing)
# Set these as environment variables:
export SYBIL_WALLET_KEY_1=your_key_1
export SYBIL_WALLET_KEY_2=your_key_2
# ... up to SYBIL_WALLET_KEY_10

export SYBIL_CONTRACT_KEY_1=your_key_1
export SYBIL_CONTRACT_KEY_2=your_key_2
# ... up to SYBIL_CONTRACT_KEY_10

# Verify configuration
fundtracer config --show
```

**Get Free API Keys:**
- Alchemy: https://dashboard.alchemy.com/
- Moralis: https://admin.moralis.io/
- Dune: https://dune.com/settings/api

## Usage

### Analyze a Single Wallet

```bash
# Basic analysis
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71

# Specify chain
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --chain ethereum

# Set analysis depth (1-5)
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --depth 3

# Output as JSON
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --output json

# Export to CSV
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --output csv --export results.csv

# Filter by minimum value
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --min-value 0.1
```

### Sybil Detection (Compare Multiple Wallets)

Uses **OptimizedSybilAnalyzer** with 20 API keys for parallel processing (10-20x faster):

```bash
# Compare 2+ wallets
fundtracer compare 0xAddress1 0xAddress2 0xAddress3

# Read from file
fundtracer compare --file addresses.txt

# Custom cluster size threshold
fundtracer compare 0xAddr1 0xAddr2 --min-cluster 5

# Adjust parallelism (1-20)
fundtracer compare 0xAddr1 0xAddr2 --concurrency 15

# Export results
fundtracer compare 0xAddr1 0xAddr2 --output csv --export sybil-results.csv
```

### View Portfolio (NFTs & Tokens)

```bash
# View all assets
fundtracer portfolio 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71

# NFTs only
fundtracer portfolio 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --nfts

# Tokens only
fundtracer portfolio 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --tokens

# Export to CSV
fundtracer portfolio 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --output csv
```

### Batch Analysis

Analyze multiple wallets from a file efficiently:

```bash
# Create address file
cat > addresses.txt << EOF
0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71
0x8ba1f109551bD432803012645Hac136c82C3e72c
0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF

# Run batch analysis
fundtracer batch addresses.txt

# Parallel processing (faster)
fundtracer batch addresses.txt --parallel 10

# Export results
fundtracer batch addresses.txt --output csv --export batch-results.csv
```

### Interactive Mode

```bash
# Start interactive shell
fundtracer
# or
fundtracer interactive

# Commands in interactive mode:
> analyze 0x...
> compare 0x... 0x...
> portfolio 0x...
> batch addresses.txt
> config
> exit
```

## Supported Chains

| Chain     | Flag        | Status     |
|-----------|-------------|------------|
| Ethereum  | `ethereum`  | ✅ Supported  |
| Linea     | `linea`     | ✅ Supported  |
| Arbitrum  | `arbitrum`  | ✅ Supported  |
| Base      | `base`      | ✅ Supported  |
| Optimism  | `optimism`  | ✅ Supported  |
| Polygon   | `polygon`   | ✅ Supported  |

## Output Examples

### Wallet Analysis
```
═══ Wallet Information ═══
┌──────────────────┬────────────────────────────────────────────┐
│ Address          │ 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 │
│ Chain            │ ETHEREUM                                   │
│ Balance          │ 2.5 ETH                                    │
│ Total Transactions│ 42                                        │
│ Is Contract      │ No                                         │
└──────────────────┴────────────────────────────────────────────┘

═══ Risk Assessment ═══
Risk Score:  72/100  (HIGH)

⚠ Suspicious Activity Detected:
┌────────────────────┬──────────┬──────────────────────────────────────────┐
│ Type               │ Severity │ Description                              │
├────────────────────┼──────────┼──────────────────────────────────────────┤
│ rapid movement     │ high     │ 5 rapid fund movements detected          │
│ same block activity│ medium   │ Transactions in 3 same blocks            │
│ circular flow      │ medium   │ Circular fund flow detected              │
└────────────────────┴──────────┴──────────────────────────────────────────┘
```

### Sybil Detection Results
```
🔍 Sybil Detection Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wallets: 150
API Keys: 20 (for parallel processing)
Concurrency: 10x

✓ Analysis complete in 12.5s!

═══ Sybil Analysis Results ═══

⚠ HIGH RISK: Sybil Activity Detected

═══ Risk Distribution ═══
┌─────────────┬─────────┬────────────┐
│ Risk Level  │ Count   │ Percentage │
├─────────────┼─────────┼────────────┤
│ 🔴 High     │ 45      │ 30.0%      │
│ 🟡 Medium   │ 30      │ 20.0%      │
│ 🟢 Low      │ 75      │ 50.0%      │
└─────────────┴─────────┴────────────┘

═══ Detected Clusters (3) ═══

Cluster #1
  Sybil Score: 92/100
  Wallets: 25
  Funding Source: 0xabc...def
  Flags: rapid_funding, similar_amounts
```

## Performance

### Sybil Detection Speed
- **Without optimization**: 90-160 seconds for 1000 wallets
- **With 20 API keys**: 10-20 seconds for 1000 wallets
- **Speedup**: 10-16x faster

### Factors Affecting Speed
- Number of API keys configured (more = faster)
- `--concurrency` setting (default: 10)
- Network latency
- Alchemy API rate limits

## Environment Variables

```bash
# Primary API keys
export ALCHEMY_API_KEY=your_key
export MORALIS_API_KEY=your_key
export DUNE_API_KEY=your_key

# Sybil detection keys (20 keys for parallel processing)
export SYBIL_WALLET_KEY_1=your_key
export SYBIL_WALLET_KEY_2=your_key
# ... up to SYBIL_WALLET_KEY_10

export SYBIL_CONTRACT_KEY_1=your_key
export SYBIL_CONTRACT_KEY_2=your_key
# ... up to SYBIL_CONTRACT_KEY_10
```

## Troubleshooting

### "No API keys configured"
Run `fundtracer config --set-key alchemy:YOUR_KEY` first.

### Rate Limiting
The CLI automatically handles rate limits with exponential backoff. For heavy usage:
1. Add more API keys (up to 20)
2. Reduce `--concurrency` if needed
3. Upgrade your Alchemy plan

### Invalid Address Errors
Ensure addresses are valid 42-character Ethereum addresses starting with `0x`.

### Sybil Analysis Too Slow
Configure 20 API keys via environment variables for 10-20x speed improvement.

## License

MIT License - Built by DT Development
