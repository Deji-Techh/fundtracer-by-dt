import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');

const DOMAIN = 'https://www.fundtracer.xyz';

const pages = {
  '/': {
    title: 'FundTracer | Professional Blockchain Wallet Analyzer & Forensics Platform',
    description: 'Professional blockchain forensics platform for analyzing wallet addresses, detecting Sybil patterns, comparing wallets, and tracing funding sources. Supports Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, BSC.',
    keywords: 'blockchain analyzer, wallet tracker, ethereum analyzer, crypto forensics, sybil detection, wallet analysis, smart contract auditor, whale tracker, on-chain analysis, defi security',
  },
  '/about': {
    title: 'About Us | FundTracer',
    description: 'Learn about FundTracer - a professional blockchain forensics platform built by DT. Our mission is to make on-chain analysis accessible to everyone.',
    keywords: 'about FundTracer, blockchain forensics, crypto analysis, team DT',
  },
  '/features': {
    title: 'Features | FundTracer - Advanced Blockchain Analysis Tools',
    description: 'Explore FundTracer\'s powerful features: wallet analysis, Sybil detection, funding trees, wallet comparison, contract analytics, and real-time Telegram alerts.',
    keywords: 'wallet analysis, sybil detection, funding tree, wallet comparison, blockchain tools, crypto forensics features',
  },
  '/pricing': {
    title: 'Pricing | FundTracer',
    description: 'Choose the right plan for your blockchain analysis needs. Free tier available with 7 analyses every 4 hours. Pro and Max plans for advanced users.',
    keywords: 'FundTracer pricing, blockchain analysis pricing, crypto tools subscription, wallet analyzer pricing',
  },
  '/how-it-works': {
    title: 'How It Works | FundTracer',
    description: 'Learn how FundTracer analyzes blockchain wallets, detects Sybil patterns, and traces funding sources. Step-by-step guide to using our platform.',
    keywords: 'how FundTracer works, blockchain wallet analysis, sybil detection, funding trace tutorial',
  },
  '/faq': {
    title: 'FAQ | FundTracer',
    description: 'Frequently asked questions about FundTracer - blockchain forensics, supported chains, pricing, and getting started.',
    keywords: 'FAQ, FundTracer questions, blockchain analysis FAQ, crypto tools help',
  },
  '/terms': {
    title: 'Terms of Service | FundTracer',
    description: 'FundTracer terms of service. Professional blockchain forensics platform terms and conditions.',
    keywords: 'terms of service, FundTracer terms, legal',
  },
  '/privacy': {
    title: 'Privacy Policy | FundTracer',
    description: 'FundTracer privacy policy. How we protect your data and privacy when using our blockchain analysis platform.',
    keywords: 'privacy policy, FundTracer privacy, data protection',
  },
  '/ext-install': {
    title: 'Install Chrome Extension | FundTracer',
    description: 'Install the FundTracer Chrome extension for quick wallet analysis from any webpage. Right-click any address to instantly analyze it.',
    keywords: 'Chrome extension, FundTracer extension, browser extension, wallet analyzer extension',
  },
  '/telegram': {
    title: 'Telegram Bot | FundTracer',
    description: 'Use FundTracer directly from Telegram. Analyze wallets, check scores, and get alerts without leaving your chat. Download and start using FundTracer Bot today.',
    keywords: 'Telegram bot, FundTracer Telegram, crypto Telegram bot, wallet analysis Telegram',
  },
  '/app-evm': {
    title: 'Launch App (EVM) | FundTracer',
    description: 'Launch the FundTracer web application for EVM chains. Analyze Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, and BSC wallets.',
    keywords: 'FundTracer app, EVM wallet analyzer, Ethereum analyzer, blockchain wallet tool',
    noindex: true,
  },
  '/app-solana': {
    title: 'Launch App (Solana) | FundTracer',
    description: 'Launch the FundTracer web application for Solana. Analyze Solana wallets and trace token flows.',
    keywords: 'FundTracer Solana, Solana wallet analyzer, blockchain Solana',
    noindex: true,
  },
};

function updateHtml(filePath, route) {
  const meta = pages[route];
  if (!meta) {
    console.log(`  ⚠ No meta config for ${route}, skipping`);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf-8');

  // Update title
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${meta.title}</title>`
  );

  // Update meta title
  html = html.replace(
    /<meta name="title" content=".*?" \/>/,
    `<meta name="title" content="${meta.title}" />`
  );

  // Update description
  html = html.replace(
    /<meta name="description" content=".*?" \/>/,
    `<meta name="description" content="${meta.description}" />`
  );

  // Update keywords
  html = html.replace(
    /<meta name="keywords" content=".*?" \/>/,
    `<meta name="keywords" content="${meta.keywords}" />`
  );

  // Update canonical URL (self-referencing!)
  html = html.replace(
    /<link rel="canonical" href=".*?" \/>/,
    `<link rel="canonical" href="${DOMAIN}${route}" />`
  );

  // Update OG URL
  html = html.replace(
    /<meta property="og:url" content=".*?" \/>/,
    `<meta property="og:url" content="${DOMAIN}${route}" />`
  );

  // Update Twitter URL
  html = html.replace(
    /<meta property="twitter:url" content=".*?" \/>/,
    `<meta property="twitter:url" content="${DOMAIN}${route}" />`
  );

  // Add noindex for app pages
  if (meta.noindex) {
    html = html.replace(
      /<meta name="robots" content=".*?" \/>/,
      `<meta name="robots" content="noindex, follow" />`
    );
  }

  // Update structured data URLs
  html = html.replace(
    /"url": "https:\/\/www\.fundtracer\.xyz\/"/,
    `"url": "${DOMAIN}${route}"`
  );

  fs.writeFileSync(filePath, html);
  console.log(`  ✓ Updated ${route}`);
}

function createRouteDir(route) {
  const routeDir = path.join(distDir, route === '/' ? '' : route);
  
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }
  
  const indexPath = path.join(routeDir, 'index.html');
  
  // Copy index.html if it doesn't exist
  if (!fs.existsSync(indexPath)) {
    const mainIndex = path.join(distDir, 'index.html');
    if (fs.existsSync(mainIndex)) {
      fs.copyFileSync(mainIndex, indexPath);
      console.log(`  ✓ Created ${route}/index.html`);
    }
  }
  
  return indexPath;
}

console.log('\n🕸️  Prerendering pages with SEO meta tags...\n');

// Ensure dist exists
if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory not found. Run build first.');
  process.exit(1);
}

// Process each route
for (const [route, meta] of Object.entries(pages)) {
  console.log(`Processing: ${route}`);
  
  // Create directory and copy index.html if needed
  const indexPath = createRouteDir(route);
  
  // Update meta tags
  updateHtml(indexPath, route);
}

console.log('\n✅ Prerendering complete!\n');
