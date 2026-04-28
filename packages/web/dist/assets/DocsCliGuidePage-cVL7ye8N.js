import{o as r}from"./rolldown-runtime-MddlTo9B.js";import{dc as i,xc as n}from"./vendor-J89_OWP8.js";import{t}from"./DocsPage-CwJ83uKU.js";var d=r(n(),1),e=i(),a=[{id:"overview",title:"Overview"},{id:"installation",title:"Installation"},{id:"commands",title:"Commands"},{id:"configuration",title:"Configuration"}];function c(){return(0,e.jsxs)(t,{title:"CLI Guide",description:"Command-line interface for FundTracer. Analyze wallets directly from your terminal.",sections:a,children:[(0,e.jsx)("h2",{id:"overview",children:"Overview"}),(0,e.jsx)("p",{children:"The FundTracer CLI allows you to analyze wallet addresses directly from your terminal. It's perfect for automation, batch processing, and integrating into your workflows."}),(0,e.jsxs)("div",{className:"callout",children:[(0,e.jsx)("div",{className:"callout-title",children:"Prerequisites"}),(0,e.jsx)("p",{children:"Node.js 18+ and npm or yarn installed on your system."})]}),(0,e.jsx)("h2",{id:"installation",children:"Installation"}),(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`# Install globally via npm
npm install -g fundtracer-cli

# Or via yarn
yarn global add fundtracer-cli

# Verify installation
fundtracer --version`})}),(0,e.jsx)("h2",{id:"commands",children:"Commands"}),(0,e.jsx)("h3",{children:"Analyze a Wallet"}),(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1 --chain ethereum"})}),(0,e.jsx)("h3",{children:"Get Funding Tree"}),(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"fundtracer funding-tree 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1 --depth 3"})}),(0,e.jsx)("h3",{children:"Compare Wallets"}),(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"fundtracer compare 0x123... 0x456..."})}),(0,e.jsx)("h3",{children:"Export Results"}),(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:"fundtracer analyze 0x742d... --format json --output results.json"})}),(0,e.jsx)("h2",{id:"configuration",children:"Configuration"}),(0,e.jsxs)("p",{children:["Set your API key using the ",(0,e.jsx)("code",{children:"FT_API_KEY"})," environment variable or configure it in the CLI settings:"]}),(0,e.jsx)("pre",{children:(0,e.jsx)("code",{children:`# Set API key
fundtracer config set-api-key ft_live_your_api_key

# View current config
fundtracer config show`})})]})}export{c as CliGuidePage,c as default};
