import{o as b}from"./rolldown-runtime-MddlTo9B.js";import{Ar as c,Cr as f,Dn as d,Ln as g,Or as l,Qn as v,Wl as N,_r as o,ar as A,au as C,br as T,dr as k,fr as h,gr as P,ir as R,mr as E,ur as I,xr as w}from"./vendor-Cuqyg8AN.js";import{t as n}from"./proxy-DquDPPlH.js";import{t as _}from"./LandingLayout-Dlfvu7mw.js";var x=b(C(),1),e=N(),z=[{label:"About",href:"/about"},{label:"Features",href:"/features"},{label:"Pricing",href:"/pricing"},{label:"How It Works",href:"/how-it-works"},{label:"FAQ",href:"/faq"},{label:"API",href:"/api-docs"},{label:"CLI",href:"/cli"}];function q(){const[m,r]=(0,x.useState)(null),[a,p]=(0,x.useState)("introduction"),j=(i,t)=>{navigator.clipboard.writeText(i),r(t),setTimeout(()=>r(null),2e3)},u=()=>{navigator.clipboard.writeText(`# FundTracer API Documentation

## Base URL
\`https://api.fundtracer.xyz/api\`

## Authentication
All API requests require authentication using an API key. Include your API key in the Authorization header.

### Authorization Header
\`\`\`
Authorization: Bearer ft_live_YOUR_API_KEY
\`\`\`

### Alternative: X-API-Key Header
\`\`\`
X-API-Key: ft_live_YOUR_API_KEY
\`\`\`

## Supported Chains
- ethereum
- linea
- arbitrum
- base
- optimism
- polygon
- bsc

## Endpoints

### POST /analyze/wallet
Get comprehensive wallet analysis including balance, transactions, risk score, and labels.

**Request Body:**
\`\`\`json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "limit": 100,
    "offset": 0
  }
}
\`\`\`

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "chain": "ethereum",
    "balance": "1.5234 ETH",
    "balanceUSD": 2847.32,
    "riskScore": 65,
    "labels": ["whale", "early-adopter"],
    "transactions": [
      {
        "hash": "0x1234...",
        "from": "0x742d...",
        "to": "0xabcd...",
        "value": "0.5 ETH",
        "timestamp": 1709234567
      }
    ],
    "tokens": [
      {
        "symbol": "USDC",
        "balance": "1000",
        "valueUSD": 1000
      }
    ]
  },
  "usageRemaining": 95
}
\`\`\`

**Optional Parameters:**
- \`options.limit\`: Number of transactions to return (default: 100, max: 10000)
- \`options.offset\`: Pagination offset (default: 0)
- \`options.includeTokens\`: Include token balances (default: true)
- \`options.includeNFTs\`: Include NFT holdings (default: false)

### POST /analyze/funding-tree
Get funding flow graph showing sources and destinations of funds.

**Request Body:**
\`\`\`json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "treeConfig": {
      "maxDepth": 3
    }
  }
}
\`\`\`

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "inflow": [
      { "address": "0xabcd...ef12", "amount": "5.2 ETH", "txCount": 12 }
    ],
    "outflow": [
      { "address": "0x9876...5432", "amount": "2.1 ETH", "txCount": 5 }
    ],
    "topInteractors": [
      { "address": "0x1111...2222", "totalFlow": "10.5 ETH" }
    ]
  },
  "usageRemaining": 94
}
\`\`\`

**Optional Parameters:**
- \`options.treeConfig.maxDepth\`: Depth of funding tree (default: 3, max: 5)
- \`options.includeContracts\`: Include contract interactions (default: true)
- \`options.minTransactionCount\`: Minimum tx count to include (default: 1)

### POST /analyze/compare
Compare multiple wallets to find shared interactions and connections.

**Request Body:**
\`\`\`json
{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  ],
  "chain": "ethereum"
}
\`\`\`

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "addresses": ["0x742d...", "0xd8dA..."],
    "sharedInteractions": [
      { "address": "0xaaaa...bbbb", "sharedWith": ["0x742d...", "0xd8dA..."], "txCount": 15 }
    ],
    "commonTokens": ["USDC", "WBTC"],
    "similarityScore": 0.73
  },
  "usageRemaining": 93
}
\`\`\`

**Optional Parameters:**
- \`options.includeTokens\`: Compare token holdings (default: true)
- \`options.minTxCount\`: Minimum transactions to consider (default: 3)

### POST /analyze/sybil
Detect Sybil attack patterns and coordinated behavior. Provide a contract address to analyze its interactors for sybil patterns.

**Request Body:**
\`\`\`json
{
  "contractAddress": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "chain": "ethereum"
}
\`\`\`

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "contractAddress": "0x742d...",
    "sybilScore": 0.85,
    "flaggedAddresses": [
      { "address": "0xaaaa...bbbb", "confidence": 0.92, "reasons": ["copy trading", "same timing"] }
    ],
    "clusterCount": 3,
    "totalFlagged": 47
  },
  "usageRemaining": 92
}
\`\`\`

**Optional Parameters:**
- \`options.confidenceThreshold\`: Min confidence to flag (default: 0.5)
- \`options.analyzeTiming\`: Include transaction timing analysis (default: true)

### POST /analyze/contract
Analyze smart contracts and their interactions.

**Request Body:**
\`\`\`json
{
  "contractAddress": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "chain": "ethereum",
  "options": {
    "maxInteractors": 50,
    "analyzeFunding": true
  }
}
\`\`\`

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "address": "0x7a250...",
    "name": "Uniswap V2 Router",
    "type": "dex",
    "interactions": 1523,
    "uniqueInteractors": 892,
    "topInteractors": [
      { "address": "0xbbb...", "txCount": 234 }
    ],
    "totalVolume": "12500 ETH"
  },
  "usageRemaining": 91
}
\`\`\`

**Optional Parameters:**
- \`options.maxInteractors\`: Max top interactor addresses (default: 50, max: 200)
- \`options.analyzeFunding\`: Include funding analysis (default: true)
- \`options.includeTransactions\`: Include sample transactions (default: false)

### POST /analyze/batch
Analyze multiple wallet addresses in a single batch request (max 50 addresses).

**Request Body:**
\`\`\`json
{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  ],
  "chain": "ethereum"
}
\`\`\`

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "totalRequested": 2,
    "successful": 2,
    "failed": 0,
    "analyses": [
      { "address": "0x742d...", "balance": "1.5 ETH", "riskScore": 45 },
      { "address": "0xd8dA...", "balance": "0.8 ETH", "riskScore": 72 }
    ]
  },
  "usageRemaining": 90
}
\`\`\`

**Optional Parameters:**
- \`options.includeDetails\`: Include full analysis for each address (default: false)
- \`options.priority\`: Processing priority "high" or "low" (default: "high")

### GET /gas?chain=ethereum
Get current gas prices (low, medium, high) for supported chains.

**Query Parameters:**
- \`chain\`: The blockchain network (ethereum, linea, arbitrum, base, optimism, polygon, bsc)

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "chain": "ethereum",
    "gasPrices": {
      "low": "20 gwei",
      "medium": "30 gwei",
      "high": "45 gwei"
    },
    "lastUpdated": 1709234567
  },
  "usageRemaining": 89
}
\`\`\`

### GET /portfolio/:address?chain=ethereum
Get portfolio data including token balances, NFT holdings, and total value.

**Path Parameters:**
- \`address\`: Wallet address

**Query Parameters:**
- \`chain\`: The blockchain network

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "address": "0x742d...",
    "chain": "ethereum",
    "totalValueUSD": 15420.50,
    "tokens": [
      { "symbol": "ETH", "balance": "1.5", "valueUSD": 2847 },
      { "symbol": "USDC", "balance": "5000", "valueUSD": 5000 }
    ],
    "nfts": [
      { "collection": "Bored Ape", "tokenId": "1234" }
    ]
  },
  "usageRemaining": 88
}
\`\`\`

**Optional Query Parameters:**
- \`includeNFTs\`: Include NFT holdings (default: false)
- \`includeDust\`: Include tokens with value < $1 (default: false)

### GET /tx/:chain/:hash
Fetch detailed information about a specific transaction including logs, gas costs, and decoded events.

**Path Parameters:**
- \`chain\`: The blockchain network
- \`hash\`: Transaction hash

**Response Example:**
\`\`\`json
{
  "success": true,
  "result": {
    "hash": "0x1234...",
    "chain": "ethereum",
    "from": "0x742d...",
    "to": "0xabcd...",
    "value": "0.5 ETH",
    "gasUsed": "21000",
    "gasPrice": "30 gwei",
    "logs": [
      { "address": "0x...", "topics": [...], "data": "..." }
    ]
  },
  "usageRemaining": 87
}
\`\`\`

## Response Format

### Success Response
\`\`\`json
{
  "success": true,
  "result": {},
  "usageRemaining": 95
}
\`\`\`

### Error Response
\`\`\`json
{
  "success": false,
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "Invalid wallet address format"
  }
}
\`\`\`

## Rate Limits
- Free tier: 100 requests/day, 2 API keys max
- Pro tier: 10,000 requests/day, 10 API keys max
- Enterprise tier: 100,000 requests/day, unlimited API keys

## API Key Limits
- Free: Maximum 2 keys
- Pro: Maximum 10 keys
- Enterprise: Unlimited keys

## Error Codes

| Code | Description |
|------|-------------|
| INVALID_ADDRESS | The provided address is not a valid blockchain address |
| INVALID_CHAIN | The specified chain is not supported |
| UNAUTHORIZED | Missing or invalid API key |
| RATE_LIMIT_EXCEEDED | Daily request limit reached |
| SERVER_ERROR | Internal server error, please retry later |
| NOT_FOUND | The requested resource was not found |
| BAD_REQUEST | Invalid request parameters |

## Code Examples

### cURL
\`\`\`bash
curl -X POST "https://api.fundtracer.xyz/api/analyze/wallet" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum"}'
\`\`\`

### JavaScript
\`\`\`javascript
const response = await fetch(
  'https://api.fundtracer.xyz/api/analyze/wallet',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
      chain: 'ethereum'
    })
  }
);
const data = await response.json();
\`\`\`

### Python
\`\`\`python
import requests

response = requests.post(
    'https://api.fundtracer.xyz/api/analyze/wallet',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        'chain': 'ethereum'
    }
)
data = response.json()
print(data['result'])
\`\`\`

### Go
\`\`\`go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

func main() {
    client := &http.Client{}
    reqBody, _ := json.Marshal(map[string]string{
        "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
        "chain": "ethereum",
    })
    req, _ := http.NewRequest("POST", "https://api.fundtracer.xyz/api/analyze/wallet", bytes.NewBuffer(reqBody))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer ft_live_YOUR_API_KEY")
    resp, _ := client.Do(req)
    defer resp.Body.Close()
}
\`\`\`
`),r("markdown"),setTimeout(()=>r(null),2e3)},y=[{id:"introduction",label:"Introduction",icon:(0,e.jsx)(f,{size:18})},{id:"authentication",label:"Authentication",icon:(0,e.jsx)(v,{size:18})},{id:"endpoints",label:"Endpoints",icon:(0,e.jsx)(P,{size:18})},{id:"chains",label:"Supported Chains",icon:(0,e.jsx)(h,{size:18})},{id:"responses",label:"Response Format",icon:(0,e.jsx)(A,{size:18})},{id:"errors",label:"Error Handling",icon:(0,e.jsx)(c,{size:18})},{id:"rate-limits",label:"Rate Limits",icon:(0,e.jsx)(o,{size:18})},{id:"examples",label:"Code Examples",icon:(0,e.jsx)(d,{size:18})}],s=(i,t)=>(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>j(i,t),children:m===t?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(T,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(E,{size:14})," Copy"]})});return(0,e.jsx)(_,{navItems:z,showSearch:!1,children:(0,e.jsx)("div",{className:"api-docs-page",children:(0,e.jsxs)("div",{className:"api-docs-container",children:[(0,e.jsxs)(n.div,{className:"api-docs-header",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h1",{children:"FundTracer API Documentation"}),(0,e.jsx)("p",{children:"Complete reference guide for integrating blockchain intelligence into your applications"}),(0,e.jsxs)("div",{className:"header-actions",children:[(0,e.jsxs)("a",{href:"/api/keys",className:"get-started-btn",children:["Get API Key",(0,e.jsx)(l,{size:18})]}),(0,e.jsxs)("button",{className:"get-started-btn secondary",onClick:()=>u(),title:"Copy entire page as Markdown",children:[(0,e.jsx)(I,{size:18}),"Copy as Markdown"]})]})]}),(0,e.jsxs)("div",{className:"api-docs-layout",children:[(0,e.jsx)("nav",{className:"api-docs-sidebar",children:y.map(i=>(0,e.jsxs)("button",{className:`sidebar-link ${a===i.id?"active":""}`,onClick:()=>p(i.id),children:[i.icon,(0,e.jsx)("span",{children:i.label})]},i.id))}),(0,e.jsxs)("div",{className:"api-docs-content",children:[a==="introduction"&&(0,e.jsxs)(n.div,{className:"docs-section",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h2",{children:"Introduction"}),(0,e.jsx)("p",{className:"section-intro",children:"The FundTracer API provides programmatic access to blockchain analytics data across multiple chains. Build powerful applications that trace wallet funding sources, analyze transaction patterns, detect Sybil attacks, and visualize fund flows."}),(0,e.jsxs)("div",{className:"docs-features",children:[(0,e.jsxs)("div",{className:"docs-feature",children:[(0,e.jsx)("div",{className:"feature-icon",children:(0,e.jsx)(d,{size:24})}),(0,e.jsxs)("div",{children:[(0,e.jsx)("h3",{children:"Real-time Analysis"}),(0,e.jsx)("p",{children:"Get instant wallet analysis with transaction history, balances, and risk scores"})]})]}),(0,e.jsxs)("div",{className:"docs-feature",children:[(0,e.jsx)("div",{className:"feature-icon",children:(0,e.jsx)(R,{size:24})}),(0,e.jsxs)("div",{children:[(0,e.jsx)("h3",{children:"Funding Trees"}),(0,e.jsx)("p",{children:"Visualize complete funding flows showing where every token originated"})]})]}),(0,e.jsxs)("div",{className:"docs-feature",children:[(0,e.jsx)("div",{className:"feature-icon",children:(0,e.jsx)(g,{size:24})}),(0,e.jsxs)("div",{children:[(0,e.jsx)("h3",{children:"Risk Detection"}),(0,e.jsx)("p",{children:"Identify suspicious activity patterns and Sybil attack networks"})]})]}),(0,e.jsxs)("div",{className:"docs-feature",children:[(0,e.jsx)("div",{className:"feature-icon",children:(0,e.jsx)(h,{size:24})}),(0,e.jsxs)("div",{children:[(0,e.jsx)("h3",{children:"Multi-Chain Support"}),(0,e.jsx)("p",{children:"Query across 7+ major blockchain networks from a single API"})]})]})]}),(0,e.jsx)("h3",{children:"Base URL"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("code",{children:"https://api.fundtracer.xyz/api"}),s("https://api.fundtracer.xyz/api","base-url")]})]}),a==="authentication"&&(0,e.jsxs)(n.div,{className:"docs-section",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h2",{children:"Authentication"}),(0,e.jsx)("p",{className:"section-intro",children:"All API requests require authentication using an API key. Include your API key in the Authorization header."}),(0,e.jsx)("h3",{children:"Authorization Header"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"Authorization: Bearer ft_live_YOUR_API_KEY"})}),s("Authorization: Bearer ft_live_YOUR_API_KEY","auth-header")]}),(0,e.jsx)("h3",{children:"Alternative: X-API-Key Header"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"X-API-Key: ft_live_YOUR_API_KEY"})}),s("X-API-Key: ft_live_YOUR_API_KEY","api-key-header")]}),(0,e.jsx)("h3",{children:"API Key Types"}),(0,e.jsxs)("div",{className:"key-types-grid",children:[(0,e.jsxs)("div",{className:"key-type-card live",children:[(0,e.jsx)("h4",{children:"Live Keys"}),(0,e.jsx)("code",{children:"ft_live_..."}),(0,e.jsx)("p",{children:"For production applications. Count against your rate limits."})]}),(0,e.jsxs)("div",{className:"key-type-card test",children:[(0,e.jsx)("h4",{children:"Test Keys"}),(0,e.jsx)("code",{children:"ft_test_..."}),(0,e.jsx)("p",{children:"For development and testing. Don't count against limits."})]})]}),(0,e.jsxs)("div",{className:"note-box",children:[(0,e.jsx)(c,{size:18}),(0,e.jsx)("p",{children:"Never expose your API keys in client-side code or public repositories. Use environment variables."})]})]}),a==="endpoints"&&(0,e.jsxs)(n.div,{className:"docs-section",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h2",{children:"API Endpoints"}),(0,e.jsx)("p",{className:"section-intro",children:"Most endpoints use POST method and accept JSON request bodies. GET endpoints (gas prices, transaction lookup) use path/query parameters. Authentication is required for all endpoints."}),(0,e.jsxs)("div",{className:"endpoint-docs",children:[(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/wallet"})]}),(0,e.jsx)("p",{children:"Get comprehensive wallet analysis including balance, transactions, risk score, and labels."}),(0,e.jsx)("h4",{children:"Request Body"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "limit": 100,
    "offset": 0
  }
}`})}),s(`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "limit": 100,
    "offset": 0
  }
}`,"wallet-request")]}),(0,e.jsx)("h4",{children:"Parameters"}),(0,e.jsxs)("table",{className:"params-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Name"}),(0,e.jsx)("th",{children:"Type"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsxs)("tbody",{children:[(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"address"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Wallet address (0x... format)"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"chain"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Blockchain: ethereum, linea, arbitrum, base, optimism, polygon, bsc"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"options.limit"})}),(0,e.jsx)("td",{children:"number"}),(0,e.jsx)("td",{children:"Number of transactions (default: 100, max: 500)"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"options.offset"})}),(0,e.jsx)("td",{children:"number"}),(0,e.jsx)("td",{children:"Pagination offset (default: 0)"})]})]})]})]}),(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/funding-tree"})]}),(0,e.jsx)("p",{children:"Get funding flow graph showing sources and destinations of funds."}),(0,e.jsx)("h4",{children:"Request Body"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "treeConfig": {
      "maxDepth": 3
    }
  }
}`})}),s(`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum",
  "options": {
    "treeConfig": {
      "maxDepth": 3
    }
  }
}`,"tree-request")]}),(0,e.jsx)("h4",{children:"Parameters"}),(0,e.jsxs)("table",{className:"params-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Name"}),(0,e.jsx)("th",{children:"Type"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsxs)("tbody",{children:[(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"address"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Wallet address to trace"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"chain"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Blockchain network"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"options.treeConfig.maxDepth"})}),(0,e.jsx)("td",{children:"number"}),(0,e.jsx)("td",{children:"Trace depth (1-5, default: 3)"})]})]})]})]}),(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/compare"})]}),(0,e.jsx)("p",{children:"Compare multiple wallets to find shared interactions and connections."}),(0,e.jsx)("h4",{children:"Request Body"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  ],
  "chain": "ethereum"
}`})}),s(`{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  ],
  "chain": "ethereum"
}`,"compare-request")]})]}),(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/sybil"})]}),(0,e.jsx)("p",{children:"Detect Sybil attack patterns and coordinated behavior."}),(0,e.jsx)("h4",{children:"Request Body"}),(0,e.jsx)("div",{className:"api-code-block",children:(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
  "chain": "ethereum"
}`})})})]}),(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/contract"})]}),(0,e.jsx)("p",{children:"Analyze smart contracts and their interactions."}),(0,e.jsx)("h4",{children:"Request Body"}),(0,e.jsx)("div",{className:"api-code-block",children:(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "contractAddress": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  "chain": "ethereum",
  "options": {
    "maxInteractors": 50,
    "analyzeFunding": true
  }
}`})})})]}),(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/batch"})]}),(0,e.jsx)("p",{children:"Analyze multiple wallet addresses in a single batch request (max 50 addresses)."}),(0,e.jsx)("h4",{children:"Request Body"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  ],
  "chain": "ethereum",
  "options": {}
}`})}),s(`{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
  ],
  "chain": "ethereum",
  "options": {}
}`,"batch-request")]}),(0,e.jsx)("h4",{children:"Parameters"}),(0,e.jsxs)("table",{className:"params-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Name"}),(0,e.jsx)("th",{children:"Type"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsxs)("tbody",{children:[(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"addresses"})}),(0,e.jsx)("td",{children:"string[]"}),(0,e.jsx)("td",{children:"Array of wallet addresses (max 50)"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"chain"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Blockchain network"})]})]})]})]}),(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method get",children:"GET"}),(0,e.jsx)("code",{children:"/tx/:chain/:hash"})]}),(0,e.jsx)("p",{children:"Fetch detailed information about a specific transaction including logs, gas costs, and decoded events."}),(0,e.jsx)("h4",{children:"Parameters"}),(0,e.jsxs)("table",{className:"params-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Name"}),(0,e.jsx)("th",{children:"Type"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsxs)("tbody",{children:[(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"chain"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Blockchain: ethereum, linea, arbitrum, base, optimism, polygon, bsc"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"hash"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Transaction hash (0x... format)"})]})]})]}),(0,e.jsx)("h4",{children:"Example Response"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "success": true,
  "result": {
    "hash": "0xabc123...",
    "blockNumber": 19200000,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "from": { "address": "0x...", "label": "Vitalik.eth" },
    "to": { "address": "0x...", "label": "Uniswap V2" },
    "value": "1000000000000000000",
    "valueInEth": "1.0",
    "gasUsed": "21000",
    "effectiveGasPrice": "30000000000",
    "gasCostInEth": "0.00063",
    "status": "success",
    "logs": []
  }
}`})}),s(`{
  "success": true,
  "result": {
    "hash": "0xabc123...",
    "blockNumber": 19200000,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "from": { "address": "0x...", "label": "Vitalik.eth" },
    "to": { "address": "0x...", "label": "Uniswap V2" },
    "value": "1000000000000000000",
    "valueInEth": "1.0",
    "gasUsed": "21000",
    "effectiveGasPrice": "30000000000",
    "gasCostInEth": "0.00063",
    "status": "success",
    "logs": []
  }
}`,"tx-response")]})]}),(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method get",children:"GET"}),(0,e.jsx)("code",{children:"/gas?chain=ethereum"})]}),(0,e.jsx)("p",{children:"Get current gas prices (low, medium, high) for supported chains."}),(0,e.jsx)("h4",{children:"Query Parameters"}),(0,e.jsxs)("table",{className:"params-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Name"}),(0,e.jsx)("th",{children:"Type"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsx)("tbody",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"chain"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Blockchain: ethereum, arbitrum, optimism, polygon, bsc, base (default: ethereum)"})]})})]}),(0,e.jsx)("h4",{children:"Example Response"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "success": true,
  "result": {
    "chain": "ethereum",
    "chainId": 1,
    "unit": "gwei",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "low": { "gasPrice": 20, "time": "<= 5 min" },
    "medium": { "gasPrice": 35, "time": "<= 3 min" },
    "high": { "gasPrice": 60, "time": "<= 30 sec" }
  }
}`})}),s(`{
  "success": true,
  "result": {
    "chain": "ethereum",
    "chainId": 1,
    "unit": "gwei",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "low": { "gasPrice": 20, "time": "<= 5 min" },
    "medium": { "gasPrice": 35, "time": "<= 3 min" },
    "high": { "gasPrice": 60, "time": "<= 30 sec" }
  }
}`,"gas-response")]})]}),(0,e.jsxs)("div",{className:"endpoint-item",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method get",children:"GET"}),(0,e.jsx)("code",{children:"/portfolio/:address?chain=ethereum"})]}),(0,e.jsx)("p",{children:"Get portfolio data including token balances, NFT holdings, and total value for a wallet address."}),(0,e.jsx)("h4",{children:"Query Parameters"}),(0,e.jsxs)("table",{className:"params-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Name"}),(0,e.jsx)("th",{children:"Type"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsxs)("tbody",{children:[(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"address"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Wallet address (in path)"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"chain"})}),(0,e.jsx)("td",{children:"string"}),(0,e.jsx)("td",{children:"Blockchain: ethereum, arbitrum, optimism, polygon, bsc, base, linea (default: ethereum)"})]})]})]}),(0,e.jsx)("h4",{children:"Example"}),(0,e.jsx)("div",{className:"api-code-block",children:(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"GET /portfolio/0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1?chain=ethereum"})})})]})]})]}),a==="chains"&&(0,e.jsxs)(n.div,{className:"docs-section",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h2",{children:"Supported Chains"}),(0,e.jsx)("p",{className:"section-intro",children:"The FundTracer API supports multiple blockchain networks. Use the chain identifier in your requests."}),(0,e.jsxs)("div",{className:"chains-grid",children:[(0,e.jsxs)("div",{className:"chain-card",children:[(0,e.jsx)("div",{className:"chain-icon ethereum"}),(0,e.jsx)("h4",{children:"Ethereum"}),(0,e.jsx)("code",{children:"ethereum"})]}),(0,e.jsxs)("div",{className:"chain-card",children:[(0,e.jsx)("div",{className:"chain-icon linea"}),(0,e.jsx)("h4",{children:"Linea"}),(0,e.jsx)("code",{children:"linea"})]}),(0,e.jsxs)("div",{className:"chain-card",children:[(0,e.jsx)("div",{className:"chain-icon arbitrum"}),(0,e.jsx)("h4",{children:"Arbitrum"}),(0,e.jsx)("code",{children:"arbitrum"})]}),(0,e.jsxs)("div",{className:"chain-card",children:[(0,e.jsx)("div",{className:"chain-icon base"}),(0,e.jsx)("h4",{children:"Base"}),(0,e.jsx)("code",{children:"base"})]}),(0,e.jsxs)("div",{className:"chain-card",children:[(0,e.jsx)("div",{className:"chain-icon optimism"}),(0,e.jsx)("h4",{children:"Optimism"}),(0,e.jsx)("code",{children:"optimism"})]}),(0,e.jsxs)("div",{className:"chain-card",children:[(0,e.jsx)("div",{className:"chain-icon polygon"}),(0,e.jsx)("h4",{children:"Polygon"}),(0,e.jsx)("code",{children:"polygon"})]}),(0,e.jsxs)("div",{className:"chain-card",children:[(0,e.jsx)("div",{className:"chain-icon bsc"}),(0,e.jsx)("h4",{children:"BNB Chain"}),(0,e.jsx)("code",{children:"bsc"})]})]}),(0,e.jsx)("h3",{children:"Example Usage"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`// Ethereum wallet
{ "chain": "ethereum", "address": "0x742d..." }

// Linea wallet
{ "chain": "linea", "address": "0x742d..." }

// Arbitrum wallet
{ "chain": "arbitrum", "address": "0x742d..." }`})}),s('"chain": "ethereum"',"chain-example")]})]}),a==="responses"&&(0,e.jsxs)(n.div,{className:"docs-section",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h2",{children:"Response Format"}),(0,e.jsx)("p",{className:"section-intro",children:"All API responses follow a consistent JSON structure."}),(0,e.jsx)("h3",{children:"Success Response"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "success": true,
  "result": {
    // Response data here
  },
  "usageRemaining": 95
}`})}),s(`{
  "success": true,
  "result": {},
  "usageRemaining": 95
}`,"success-response")]}),(0,e.jsx)("h3",{children:"Rate Limit Headers"}),(0,e.jsx)("p",{children:"Every response includes headers showing your current rate limit status:"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000`})}),s("X-RateLimit-Limit: 100","rate-headers")]}),(0,e.jsx)("h3",{children:"Wallet Analysis Response"}),(0,e.jsx)("div",{className:"api-code-block",children:(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "success": true,
  "result": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1",
    "chain": "ethereum",
    "balance": "1.2345 ETH",
    "balanceRaw": 1234500000000000000,
    "transactionCount": 156,
    "firstTransaction": "2021-05-12T10:30:00Z",
    "lastTransaction": "2024-01-15T14:22:33Z",
    "riskScore": 25,
    "labels": ["DeFi User", "NFT Trader"],
    "tokens": [...],
    "transactions": [...]
  },
  "usageRemaining": 94
}`})})})]}),a==="errors"&&(0,e.jsxs)(n.div,{className:"docs-section",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h2",{children:"Error Handling"}),(0,e.jsx)("p",{className:"section-intro",children:"The API uses standard HTTP status codes and returns detailed error messages."}),(0,e.jsx)("h3",{children:"Error Response Format"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}`})}),s(`{
  "success": false,
  "error": "",
  "code": ""
}`,"error-response")]}),(0,e.jsx)("h3",{children:"HTTP Status Codes"}),(0,e.jsxs)("table",{className:"params-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Code"}),(0,e.jsx)("th",{children:"Meaning"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsxs)("tbody",{children:[(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"200"})}),(0,e.jsx)("td",{className:"success",children:"Success"}),(0,e.jsx)("td",{children:"Request completed successfully"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"400"})}),(0,e.jsx)("td",{className:"error",children:"Bad Request"}),(0,e.jsx)("td",{children:"Invalid request parameters"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"401"})}),(0,e.jsx)("td",{className:"error",children:"Unauthorized"}),(0,e.jsx)("td",{children:"Invalid or missing API key"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"403"})}),(0,e.jsx)("td",{className:"error",children:"Forbidden"}),(0,e.jsx)("td",{children:"API key revoked or rate limit exceeded"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"429"})}),(0,e.jsx)("td",{className:"error",children:"Too Many Requests"}),(0,e.jsx)("td",{children:"Rate limit exceeded, slow down"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"500"})}),(0,e.jsx)("td",{className:"error",children:"Server Error"}),(0,e.jsx)("td",{children:"Something went wrong on our end"})]})]})]}),(0,e.jsx)("h3",{children:"Common Error Codes"}),(0,e.jsxs)("table",{className:"params-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Code"}),(0,e.jsx)("th",{children:"Description"})]})}),(0,e.jsxs)("tbody",{children:[(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"KEY_INVALID"})}),(0,e.jsx)("td",{children:"API key is invalid or not found"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"KEY_REVOKED"})}),(0,e.jsx)("td",{children:"API key has been revoked"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"RATE_LIMITED"})}),(0,e.jsx)("td",{children:"Too many requests, wait and retry"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"INVALID_ADDRESS"})}),(0,e.jsx)("td",{children:"Wallet address format is invalid"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"UNSUPPORTED_CHAIN"})}),(0,e.jsx)("td",{children:"Chain not supported"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:(0,e.jsx)("code",{children:"ADDRESS_NOT_FOUND"})}),(0,e.jsx)("td",{children:"No data found for this address"})]})]})]})]}),a==="rate-limits"&&(0,e.jsxs)(n.div,{className:"docs-section",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h2",{children:"Rate Limits"}),(0,e.jsx)("p",{className:"section-intro",children:"Rate limits ensure fair usage and protect the API from abuse."}),(0,e.jsxs)("div",{className:"rate-limits-grid",children:[(0,e.jsxs)("div",{className:"rate-limit-card",children:[(0,e.jsx)("div",{className:"rate-limit-icon",children:(0,e.jsx)(d,{size:24})}),(0,e.jsx)("h3",{children:"100 requests"}),(0,e.jsx)("p",{children:"per minute"})]}),(0,e.jsxs)("div",{className:"rate-limit-card",children:[(0,e.jsx)("div",{className:"rate-limit-icon",children:(0,e.jsx)(o,{size:24})}),(0,e.jsx)("h3",{children:"1,000 requests"}),(0,e.jsx)("p",{children:"per hour"})]}),(0,e.jsxs)("div",{className:"rate-limit-card",children:[(0,e.jsx)("div",{className:"rate-limit-icon",children:(0,e.jsx)(k,{size:24})}),(0,e.jsx)("h3",{children:"Unlimited"}),(0,e.jsx)("p",{children:"with paid plans"})]})]}),(0,e.jsxs)("div",{className:"note-box success",children:[(0,e.jsx)(w,{size:18}),(0,e.jsx)("p",{children:"Test keys (ft_test_...) do not count against rate limits. Use them for development."})]}),(0,e.jsx)("h3",{children:"Checking Your Rate Limit"}),(0,e.jsx)("p",{children:"Use the response headers to monitor your usage:"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`// Check these headers in every response
X-RateLimit-Limit: 100      // Your limit per window
X-RateLimit-Remaining: 95  // Requests remaining
X-RateLimit-Reset: 1640000060  // Unix timestamp when limit resets`})}),s("X-RateLimit-Remaining: 95","rate-usage")]})]}),a==="examples"&&(0,e.jsxs)(n.div,{className:"docs-section",initial:{opacity:0,y:20},animate:{opacity:1,y:0},children:[(0,e.jsx)("h2",{children:"Code Examples"}),(0,e.jsx)("p",{className:"section-intro",children:"Ready-to-use code snippets for integrating the FundTracer API."}),(0,e.jsx)("h3",{children:"JavaScript / Node.js"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`const response = await fetch(
  'https://api.fundtracer.xyz/api/analyze/wallet',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
      chain: 'ethereum'
    })
  }
);

const data = await response.json();`})}),s(`const response = await fetch(
  'https://api.fundtracer.xyz/api/analyze/wallet',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
      chain: 'ethereum'
    })
  }
);

const data = await response.json();`,"js-example")]}),(0,e.jsx)("h3",{children:"Python"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`import requests

response = requests.post(
    'https://api.fundtracer.xyz/api/analyze/wallet',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        'chain': 'ethereum'
    }
)

data = response.json()
print(data['result'])`})}),s(`import requests

response = requests.post(
    'https://api.fundtracer.xyz/api/analyze/wallet',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        'chain': 'ethereum'
    }
)

data = response.json()
print(data['result'])`,"python-example")]}),(0,e.jsx)("h3",{children:"cURL"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`curl -X POST "https://api.fundtracer.xyz/api/analyze/wallet" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum"}'`})}),s(`curl -X POST "https://api.fundtracer.xyz/api/analyze/wallet" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum"}'`,"curl-example")]})]}),(0,e.jsxs)("div",{className:"docs-cta",children:[(0,e.jsx)("h3",{children:"Ready to Start?"}),(0,e.jsx)("p",{children:"Get your API key and start building in minutes."}),(0,e.jsxs)("a",{href:"/api/keys",className:"cta-btn",children:["Get API Key",(0,e.jsx)(l,{size:18})]})]})]})]})]})})})}export{q as ApiDocsPage,q as default};
