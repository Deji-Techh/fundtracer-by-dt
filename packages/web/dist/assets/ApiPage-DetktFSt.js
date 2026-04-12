import{o as w}from"./rolldown-runtime-MddlTo9B.js";import{Bn as A,Dn as k,Lr as P,On as S,Rn as F,Tr as s,Xl as B,_r as T,du as E,lr as I,pr as x,rr as O,xr as R,yr as r}from"./vendor-DHU1kG0o.js";import{t as j}from"./proxy-CZnCAoOE.js";import{t as D}from"./AnimatePresence-C3ijTVle.js";import{t as Y}from"./LandingLayout-BlMJOrFT.js";var c=w(E(),1),e=B(),q=[{label:"About",href:"/about"},{label:"Features",href:"/features"},{label:"Pricing",href:"/pricing"},{label:"How It Works",href:"/how-it-works"},{label:"FAQ",href:"/faq"},{label:"API",href:"/api-docs",active:!0},{label:"CLI",href:"/cli"}];function W(){const[i,u]=(0,c.useState)(null),[l,g]=(0,c.useState)("overview"),[C,p]=(0,c.useState)(!1),[y,f]=(0,c.useState)(!1),[z,b]=(0,c.useState)(!1),[N,h]=(0,c.useState)(""),[t,v]=(0,c.useState)({name:"",company:"",email:"",message:""}),[K,L]=(0,c.useState)(!1),m=a=>{v(o=>({...o,[a.target.name]:a.target.value})),h("")},_=async a=>{if(a.preventDefault(),!t.name||!t.email||!t.message){h("Please fill in all required fields");return}f(!0),h("");try{const o=await(await fetch("/api/contact/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).json();o.success?(b(!0),v({name:"",company:"",email:"",message:""})):h(o.error||"Failed to send message")}catch{h("Failed to send message. Please try again.")}finally{f(!1)}},n=(a,o)=>{navigator.clipboard.writeText(a),u(o),setTimeout(()=>u(null),2e3)},d={wallet:{curl:`curl -X POST "https://api.fundtracer.xyz/api/analyze/wallet" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum"}'`,js:`const response = await fetch(
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
const data = await response.json();`,python:`import requests

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
data = response.json()`},fundingTree:{curl:`curl -X POST "https://api.fundtracer.xyz/api/analyze/funding-tree" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "chain": "ethereum", "options": {"treeConfig": {"maxDepth": 3}}}"'`,js:`const response = await fetch(
  'https://api.fundtracer.xyz/api/analyze/funding-tree',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
      chain: 'ethereum',
      options: { treeConfig: { maxDepth: 3 } }
    })
  }
);
const data = await response.json();`,python:`import requests

response = requests.post(
    'https://api.fundtracer.xyz/api/analyze/funding-tree',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'address': '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        'chain': 'ethereum',
        'options': {'treeConfig': {'maxDepth': 3}}
    }
)
data = response.json()`},compare:{curl:`curl -X POST "https://api.fundtracer.xyz/api/analyze/compare" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ft_live_YOUR_API_KEY" \\
  -d '{"addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"], "chain": "ethereum"}'`,js:`const response = await fetch(
  'https://api.fundtracer.xyz/api/analyze/compare',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    body: JSON.stringify({
      addresses: [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      ],
      chain: 'ethereum'
    })
  }
);
const data = await response.json();`,python:`import requests

response = requests.post(
    'https://api.fundtracer.xyz/api/analyze/compare',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ft_live_YOUR_API_KEY'
    },
    json={
        'addresses': [
            '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
            '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        ],
        'chain': 'ethereum'
    }
)
data = response.json()`}};return(0,e.jsx)(e.Fragment,{children:(0,e.jsxs)(Y,{navItems:q,showSearch:!1,children:[(0,e.jsx)("div",{className:"api-page",children:(0,e.jsxs)("div",{className:"api-container",children:[(0,e.jsxs)(j.div,{className:"api-header",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.5},children:[(0,e.jsxs)("div",{className:"api-logo",children:[(0,e.jsx)(R,{size:48,strokeWidth:1.5}),(0,e.jsx)("span",{children:"FundTracer API"})]}),(0,e.jsx)("h1",{children:"Build with Blockchain Intelligence"}),(0,e.jsx)("p",{children:"Integrate wallet analytics, transaction graphs, and risk scoring into your applications. The same powerful blockchain forensics engine used by FundTracer, available via API."}),(0,e.jsxs)("div",{className:"api-header-actions",children:[(0,e.jsxs)("a",{href:"/api/keys",className:"api-btn primary",children:[(0,e.jsx)(O,{size:18}),"Get API Key"]}),(0,e.jsxs)("a",{href:"/api/docs",className:"api-btn secondary",target:"_blank",rel:"noopener noreferrer",children:[(0,e.jsx)(x,{size:18}),"Full Documentation"]})]})]}),(0,e.jsx)("div",{className:"api-nav-tabs",children:[{id:"overview",label:"Overview"},{id:"authentication",label:"Authentication"},{id:"endpoints",label:"Endpoints"},{id:"sdks",label:"SDKs"},{id:"pricing",label:"Pricing"}].map(a=>(0,e.jsx)("button",{className:`api-tab ${l===a.id?"active":""}`,onClick:()=>g(a.id),children:a.label},a.id))}),(0,e.jsxs)(j.div,{className:"api-content",initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.5,delay:.1},children:[l==="overview"&&(0,e.jsxs)("div",{className:"api-section",children:[(0,e.jsx)("h2",{children:"API Overview"}),(0,e.jsx)("p",{className:"api-intro",children:"The FundTracer API provides programmatic access to blockchain analytics data across multiple chains. Query wallet information, transaction history, funding flows, risk scores, and more."}),(0,e.jsxs)("div",{className:"api-features-grid",children:[(0,e.jsxs)("div",{className:"api-feature",children:[(0,e.jsx)("div",{className:"feature-icon",children:(0,e.jsx)(k,{size:24})}),(0,e.jsx)("h3",{children:"Real-time Data"}),(0,e.jsx)("p",{children:"Access up-to-date wallet balances, transaction history, and on-chain activity"})]}),(0,e.jsxs)("div",{className:"api-feature",children:[(0,e.jsx)("div",{className:"feature-icon",children:(0,e.jsx)(I,{size:24})}),(0,e.jsx)("h3",{children:"Funding Graphs"}),(0,e.jsx)("p",{children:"Visualize fund flows with detailed source and destination analysis"})]}),(0,e.jsxs)("div",{className:"api-feature",children:[(0,e.jsx)("div",{className:"feature-icon",children:(0,e.jsx)(F,{size:24})}),(0,e.jsx)("h3",{children:"Risk Scoring"}),(0,e.jsx)("p",{children:"Evaluate wallet risk levels and detect suspicious activity patterns"})]}),(0,e.jsxs)("div",{className:"api-feature",children:[(0,e.jsx)("div",{className:"feature-icon",children:(0,e.jsx)(T,{size:24})}),(0,e.jsx)("h3",{children:"Multi-Chain"}),(0,e.jsx)("p",{children:"Support for Ethereum, Linea, Arbitrum, Base, Optimism, Polygon, and BSC"})]})]}),(0,e.jsxs)("div",{className:"api-base-url",children:[(0,e.jsx)("h3",{children:"Base URL"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("code",{children:"https://api.fundtracer.xyz/api"}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n("https://api.fundtracer.xyz/api","base-url"),children:i==="base-url"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]})]}),(0,e.jsxs)("div",{className:"api-chains",children:[(0,e.jsx)("h3",{children:"Supported Chains"}),(0,e.jsx)("div",{className:"api-chains-list",children:["Ethereum","Linea","Arbitrum","Base","Optimism","Polygon","BSC"].map(a=>(0,e.jsx)("span",{className:"api-chain-badge",children:a},a))})]})]}),l==="authentication"&&(0,e.jsxs)("div",{className:"api-section",id:"authentication",children:[(0,e.jsx)("h2",{children:"Authentication"}),(0,e.jsx)("p",{className:"api-intro",children:"All API requests require authentication using an API key. Include your API key in the Authorization header."}),(0,e.jsxs)("div",{className:"api-auth-methods",children:[(0,e.jsx)("h3",{children:"Using Authorization Header"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"Authorization: Bearer ft_live_YOUR_API_KEY"})}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n("Authorization: Bearer ft_live_YOUR_API_KEY","auth-header"),children:i==="auth-header"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]}),(0,e.jsx)("h3",{children:"Alternative: X-API-Key Header"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"X-API-Key: ft_live_YOUR_API_KEY"})}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n("X-API-Key: ft_live_YOUR_API_KEY","api-key-header"),children:i==="api-key-header"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]})]}),(0,e.jsxs)("div",{className:"api-key-types",children:[(0,e.jsx)("h3",{children:"API Key Types"}),(0,e.jsxs)("div",{className:"api-key-types-grid",children:[(0,e.jsxs)("div",{className:"api-key-type",children:[(0,e.jsx)("h4",{children:"Live Keys"}),(0,e.jsx)("code",{children:"ft_live_..."}),(0,e.jsx)("p",{children:"For production applications. Count against your rate limits."})]}),(0,e.jsxs)("div",{className:"api-key-type",children:[(0,e.jsx)("h4",{children:"Test Keys"}),(0,e.jsx)("code",{children:"ft_test_..."}),(0,e.jsx)("p",{children:"For development and testing. Don't count against limits."})]})]})]}),(0,e.jsxs)("div",{className:"api-rate-headers",children:[(0,e.jsx)("h3",{children:"Rate Limit Headers"}),(0,e.jsx)("p",{children:"Every response includes headers showing your current rate limit status:"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000`})}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n(`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000`,"rate-headers"),children:i==="rate-headers"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]})]})]}),l==="endpoints"&&(0,e.jsxs)("div",{className:"api-section",id:"endpoints",children:[(0,e.jsx)("h2",{children:"API Endpoints"}),(0,e.jsxs)("p",{className:"api-intro",children:["All endpoints require authentication. Base URL: ",(0,e.jsx)("code",{children:"https://api.fundtracer.xyz/api"})]}),(0,e.jsxs)("div",{className:"api-endpoints",children:[(0,e.jsxs)("div",{className:"api-endpoint",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/wallet"})]}),(0,e.jsx)("p",{children:"Get comprehensive wallet analysis including balance, transactions, risk score, and labels."}),(0,e.jsxs)("div",{className:"endpoint-params",children:[(0,e.jsx)("span",{className:"param",children:"address"}),(0,e.jsx)("span",{className:"param-desc",children:"Wallet address (0x...)"}),(0,e.jsx)("span",{className:"param",children:"chain"}),(0,e.jsx)("span",{className:"param-desc",children:"ethereum, linea, arbitrum, base, optimism, polygon, bsc"})]}),(0,e.jsxs)("div",{className:"endpoint-example",children:[(0,e.jsx)("h4",{children:"Example Request"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:d.wallet.curl})}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n(d.wallet.curl,"wallet-curl"),children:i==="wallet-curl"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]})]})]}),(0,e.jsxs)("div",{className:"api-endpoint",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/funding-tree"})]}),(0,e.jsx)("p",{children:"Get funding flow graph showing sources and destinations of funds."}),(0,e.jsxs)("div",{className:"endpoint-params",children:[(0,e.jsx)("span",{className:"param",children:"address"}),(0,e.jsx)("span",{className:"param-desc",children:"Wallet address to trace"}),(0,e.jsx)("span",{className:"param",children:"chain"}),(0,e.jsx)("span",{className:"param-desc",children:"Blockchain network"}),(0,e.jsx)("span",{className:"param",children:"options.treeConfig.maxDepth"}),(0,e.jsx)("span",{className:"param-desc",children:"Trace depth (1-5)"})]}),(0,e.jsxs)("div",{className:"endpoint-example",children:[(0,e.jsx)("h4",{children:"Example Request"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:d.fundingTree.curl})}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n(d.fundingTree.curl,"tree-curl"),children:i==="tree-curl"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]})]})]}),(0,e.jsxs)("div",{className:"api-endpoint",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/compare"})]}),(0,e.jsx)("p",{children:"Compare multiple wallets to find shared interactions and connections."}),(0,e.jsxs)("div",{className:"endpoint-params",children:[(0,e.jsx)("span",{className:"param",children:"addresses"}),(0,e.jsx)("span",{className:"param-desc",children:"Array of wallet addresses (2-20)"}),(0,e.jsx)("span",{className:"param",children:"chain"}),(0,e.jsx)("span",{className:"param-desc",children:"Blockchain network"})]}),(0,e.jsxs)("div",{className:"endpoint-example",children:[(0,e.jsx)("h4",{children:"Example Request"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:d.compare.curl})}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n(d.compare.curl,"compare-curl"),children:i==="compare-curl"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]})]})]}),(0,e.jsxs)("div",{className:"api-endpoint",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/sybil"})]}),(0,e.jsx)("p",{children:"Detect Sybil attack patterns and coordinated behavior."}),(0,e.jsxs)("div",{className:"endpoint-params",children:[(0,e.jsx)("span",{className:"param",children:"contractAddress"}),(0,e.jsx)("span",{className:"param-desc",children:"Contract or wallet address"}),(0,e.jsx)("span",{className:"param",children:"chain"}),(0,e.jsx)("span",{className:"param-desc",children:"Blockchain network"})]})]}),(0,e.jsxs)("div",{className:"api-endpoint",children:[(0,e.jsxs)("div",{className:"endpoint-header",children:[(0,e.jsx)("span",{className:"method post",children:"POST"}),(0,e.jsx)("code",{children:"/analyze/contract"})]}),(0,e.jsx)("p",{children:"Analyze smart contracts and their interactions."}),(0,e.jsxs)("div",{className:"endpoint-params",children:[(0,e.jsx)("span",{className:"param",children:"contractAddress"}),(0,e.jsx)("span",{className:"param-desc",children:"Contract address"}),(0,e.jsx)("span",{className:"param",children:"chain"}),(0,e.jsx)("span",{className:"param-desc",children:"Blockchain network"})]})]}),(0,e.jsxs)("a",{href:"/api/docs",className:"api-full-docs-link",target:"_blank",rel:"noopener noreferrer",children:[(0,e.jsx)(x,{size:18}),"View Full Documentation"]})]})]}),l==="sdks"&&(0,e.jsxs)("div",{className:"api-section",id:"sdks",children:[(0,e.jsx)("h2",{children:"SDKs & Libraries"}),(0,e.jsx)("p",{className:"api-intro",children:"Official SDKs for easy integration into your projects."}),(0,e.jsxs)("div",{className:"api-sdks-grid",children:[(0,e.jsxs)("div",{className:"api-sdk",children:[(0,e.jsx)("h3",{children:"JavaScript / TypeScript"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("code",{children:"npm install @fundtracer/api"}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n("npm install @fundtracer/api","npm-sdk"),children:i==="npm-sdk"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]}),(0,e.jsxs)("div",{className:"sdk-example",children:[(0,e.jsx)("h4",{children:"Usage"}),(0,e.jsxs)("div",{className:"api-code-block",children:[(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`import { FundTracerAPI } from '@fundtracer/api';

const ft = new FundTracerAPI('ft_live_YOUR_API_KEY');

// Analyze a wallet
const { data: wallet } = await ft.analyzeWallet(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  { chain: 'ethereum', includeTransactions: true }
);

// Get funding tree
const { data: tree } = await ft.getFundingTree(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  { chain: 'ethereum', maxDepth: 3 }
);

// Detect Sybil behavior
const { data: sybil } = await ft.detectSybil(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  'ethereum'
);

// Batch analyze multiple wallets
const { data: batch } = await ft.analyzeBatch(
  ['0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
  'ethereum'
);

// Get transaction details
const { data: tx } = await ft.getTransaction('ethereum', '0xabc123def456...');

// Get gas prices
const { data: gas } = await ft.getGasPrices('ethereum');`})}),(0,e.jsx)("button",{className:"api-copy-btn",onClick:()=>n(`import { FundTracerAPI } from '@fundtracer/api';

const ft = new FundTracerAPI('ft_live_YOUR_API_KEY');

// Analyze a wallet
const { data: wallet } = await ft.analyzeWallet(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  { chain: 'ethereum', includeTransactions: true }
);

// Get funding tree
const { data: tree } = await ft.getFundingTree(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  { chain: 'ethereum', maxDepth: 3 }
);

// Detect Sybil behavior
const { data: sybil } = await ft.detectSybil(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1',
  'ethereum'
);

// Batch analyze multiple wallets
const { data: batch } = await ft.analyzeBatch(
  ['0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
  'ethereum'
);

// Get transaction details
const { data: tx } = await ft.getTransaction('ethereum', '0xabc123def456...');

// Get gas prices
const { data: gas } = await ft.getGasPrices('ethereum');`,"js-sdk"),children:i==="js-sdk"?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(s,{size:14})," Copied"]}):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(r,{size:14})," Copy"]})})]})]})]}),(0,e.jsxs)("div",{className:"api-sdk",children:[(0,e.jsx)("h3",{children:"Python (Coming Soon)"}),(0,e.jsx)("p",{children:"Official Python client library."}),(0,e.jsx)("div",{className:"coming-soon-badge",children:"Coming Q3 2026"})]}),(0,e.jsxs)("div",{className:"api-sdk",children:[(0,e.jsx)("h3",{children:"Go (Coming Soon)"}),(0,e.jsx)("p",{children:"Official Go client library."}),(0,e.jsx)("div",{className:"coming-soon-badge",children:"Coming Q2 2026"})]})]}),(0,e.jsxs)("div",{className:"api-openapi",children:[(0,e.jsx)("h3",{children:"SDK Reference"}),(0,e.jsx)("p",{children:"TypeScript types and full SDK documentation are available on npm."}),(0,e.jsxs)("div",{className:"api-openapi-actions",children:[(0,e.jsxs)("a",{href:"https://www.npmjs.com/package/@fundtracer/api",target:"_blank",rel:"noopener noreferrer",className:"api-btn secondary",children:[(0,e.jsx)(x,{size:16}),"View on npm"]}),(0,e.jsxs)("a",{href:"/api/docs",className:"api-btn secondary",children:[(0,e.jsx)(x,{size:16}),"Full Documentation"]})]})]})]}),l==="pricing"&&(0,e.jsxs)("div",{className:"api-section",children:[(0,e.jsx)("h2",{children:"Pricing & Rate Limits"}),(0,e.jsx)("p",{className:"api-intro",children:"Choose the plan that fits your needs. Start free, upgrade as you grow."}),(0,e.jsxs)("div",{className:"api-pricing-grid",children:[(0,e.jsxs)("div",{className:"api-pricing-tier",children:[(0,e.jsx)("h3",{children:"Free"}),(0,e.jsxs)("div",{className:"tier-price",children:["$0",(0,e.jsx)("span",{children:"/month"})]}),(0,e.jsxs)("ul",{className:"tier-features",children:[(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," 100 requests/day"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," 10 requests/minute"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," Basic endpoints"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," Community support"]})]}),(0,e.jsx)("a",{href:"/api/keys?plan=free",className:"api-btn secondary",children:"Get Free Key"})]}),(0,e.jsxs)("div",{className:"api-pricing-tier featured",children:[(0,e.jsx)("div",{className:"tier-badge",children:"Most Popular"}),(0,e.jsx)("h3",{children:"Pro"}),(0,e.jsxs)("div",{className:"tier-price",children:["$15",(0,e.jsx)("span",{children:"/month"})]}),(0,e.jsxs)("ul",{className:"tier-features",children:[(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," 10,000 requests/day"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," 60 requests/minute"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," All endpoints"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," Graph & analysis"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," Priority support"]})]}),(0,e.jsx)("button",{className:"api-btn primary",disabled:!0,style:{opacity:.6,cursor:"not-allowed"},children:"Coming Soon"})]}),(0,e.jsxs)("div",{className:"api-pricing-tier",children:[(0,e.jsx)("h3",{children:"Enterprise"}),(0,e.jsx)("div",{className:"tier-price",children:"Custom"}),(0,e.jsxs)("ul",{className:"tier-features",children:[(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," Unlimited requests"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," 300+ requests/minute"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," Webhooks & alerts"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," Dedicated support"]}),(0,e.jsxs)("li",{children:[(0,e.jsx)(s,{size:16})," SLA guarantee"]})]}),(0,e.jsx)("button",{className:"api-btn secondary",onClick:()=>p(!0),children:"Contact Sales"})]})]}),(0,e.jsxs)("div",{className:"api-rate-limits",children:[(0,e.jsx)("h3",{children:"Rate Limit Details"}),(0,e.jsxs)("table",{className:"rate-limits-table",children:[(0,e.jsx)("thead",{children:(0,e.jsxs)("tr",{children:[(0,e.jsx)("th",{children:"Tier"}),(0,e.jsx)("th",{children:"Daily Limit"}),(0,e.jsx)("th",{children:"Per Minute"}),(0,e.jsx)("th",{children:"Burst"})]})}),(0,e.jsxs)("tbody",{children:[(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:"Free"}),(0,e.jsx)("td",{children:"100"}),(0,e.jsx)("td",{children:"10"}),(0,e.jsx)("td",{children:"20"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:"Pro"}),(0,e.jsx)("td",{children:"10,000"}),(0,e.jsx)("td",{children:"60"}),(0,e.jsx)("td",{children:"100"})]}),(0,e.jsxs)("tr",{children:[(0,e.jsx)("td",{children:"Enterprise"}),(0,e.jsx)("td",{children:"Unlimited"}),(0,e.jsx)("td",{children:"300+"}),(0,e.jsx)("td",{children:"1000+"})]})]})]})]})]})]})]})}),(0,e.jsx)(D,{children:C&&(0,e.jsx)(j.div,{className:"modal-overlay",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:a=>{a.target===a.currentTarget&&p(!1)},children:(0,e.jsxs)(j.div,{className:"contact-modal",initial:{opacity:0,scale:.95,y:20},animate:{opacity:1,scale:1,y:0},exit:{opacity:0,scale:.95,y:20},transition:{duration:.2},children:[(0,e.jsxs)("div",{className:"contact-modal__header",children:[(0,e.jsx)("h2",{children:"Contact Sales"}),(0,e.jsx)("button",{className:"contact-modal__close",onClick:()=>p(!1),children:(0,e.jsx)(S,{size:20})})]}),z?(0,e.jsxs)("div",{className:"contact-modal__success",children:[(0,e.jsx)("div",{className:"success-icon",children:(0,e.jsx)(s,{size:32})}),(0,e.jsx)("h3",{children:"Message Sent!"}),(0,e.jsx)("p",{children:"We'll be in touch with you shortly."}),(0,e.jsx)("button",{className:"api-btn primary",onClick:()=>{p(!1),b(!1)},children:"Close"})]}):(0,e.jsxs)("form",{className:"contact-modal__form",onSubmit:_,children:[(0,e.jsxs)("div",{className:"form-group",children:[(0,e.jsxs)("label",{htmlFor:"name",children:["Name ",(0,e.jsx)("span",{className:"required",children:"*"})]}),(0,e.jsx)("input",{type:"text",id:"name",name:"name",value:t.name,onChange:m,placeholder:"John Doe",required:!0})]}),(0,e.jsxs)("div",{className:"form-group",children:[(0,e.jsx)("label",{htmlFor:"company",children:"Company"}),(0,e.jsx)("input",{type:"text",id:"company",name:"company",value:t.company,onChange:m,placeholder:"Acme Corp (optional)"})]}),(0,e.jsxs)("div",{className:"form-group",children:[(0,e.jsxs)("label",{htmlFor:"email",children:["Email ",(0,e.jsx)("span",{className:"required",children:"*"})]}),(0,e.jsx)("input",{type:"email",id:"email",name:"email",value:t.email,onChange:m,placeholder:"john@acme.com",required:!0})]}),(0,e.jsxs)("div",{className:"form-group",children:[(0,e.jsxs)("label",{htmlFor:"message",children:["How can we help? ",(0,e.jsx)("span",{className:"required",children:"*"})]}),(0,e.jsx)("textarea",{id:"message",name:"message",value:t.message,onChange:m,placeholder:"Tell us about your use case, expected volume, and any specific requirements...",rows:4,required:!0})]}),N&&(0,e.jsxs)("div",{className:"form-error",children:[(0,e.jsx)(P,{size:16}),N]}),(0,e.jsx)("button",{type:"submit",className:"api-btn primary submit-btn",disabled:y,children:y?"Sending...":(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(A,{size:16}),"Send Message"]})})]})]})})})]})})}export{W as ApiPage,W as default};
