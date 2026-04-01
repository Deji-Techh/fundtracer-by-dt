/**
 * BlogPostPage - Individual blog post template
 * SEO-optimized blog post with JSON-LD Article schema
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge } from '../design-system/primitives';
import './BlogPostPage.css';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  slug: string;
}

const navItems = [
  { label: 'Intel', href: '/' },
  { label: 'Blog', href: '/blog', active: true },
  { label: 'Docs', href: '/docs/getting-started' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
  { label: 'About', href: '/about' },
];

const blogPostsData: Record<string, BlogPost> = {
  'what-is-sybil-detection': {
    id: '1',
    title: 'What is Sybil Detection in Crypto',
    excerpt: 'Learn how Sybil detection works in cryptocurrency and how it helps identify coordinated bot networks and fake accounts.',
    category: 'Security',
    date: '2026-03-15',
    readTime: '5 min read',
    author: 'FundTracer Team',
    slug: 'what-is-sybil-detection',
    content: `
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
    `
  },
  'how-to-trace-ethereum-wallet-funds': {
    id: '2',
    title: 'How to Trace Ethereum Wallet Funds',
    excerpt: 'A comprehensive guide to tracing funds on the Ethereum blockchain using block explorers and analytics tools.',
    category: 'Tutorial',
    date: '2026-03-10',
    readTime: '8 min read',
    author: 'FundTracer Team',
    slug: 'how-to-trace-ethereum-wallet-funds',
    content: `
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
    `
  },
  'how-airdrop-farmers-get-caught': {
    id: '3',
    title: 'How Airdrop Farmers Get Caught',
    excerpt: 'Understanding how blockchain analytics detects airdrop farming and coordinated wallet activity.',
    category: 'Security',
    date: '2026-03-05',
    readTime: '6 min read',
    author: 'FundTracer Team',
    slug: 'how-airdrop-farmers-get-caught',
    content: `
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
    `
  }
};

export function BlogPostPage() {
  const location = useLocation();
  const slug = location.pathname.split('/').pop() || '';
  const post = blogPostsData[slug];

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | FundTracer Blog`;
      
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt,
        "author": {
          "@type": "Organization",
          "name": post.author
        },
        "datePublished": post.date,
        "readTime": post.readTime,
        "url": `https://www.fundtracer.xyz/blog/${post.slug}`
      });
      document.head.appendChild(script);
      
      return () => {
        document.head.removeChild(script);
      };
    }
  }, [post]);

  if (!post) {
    return (
      <LandingLayout navItems={navItems} showSearch={false}>
        <div className="blog-post-error">
          <h1>Post Not Found</h1>
          <p>The blog post you're looking for doesn't exist.</p>
          <a href="/blog">Back to Blog</a>
        </div>
      </LandingLayout>
    );
  }

  const contentSections = post.content.split('\n\n').filter(s => s.trim());

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <article className="blog-post">
        <header className="blog-post__header">
          <Badge variant="info">{post.category}</Badge>
          <div className="blog-post__meta">
            <span>{post.date}</span>
            <span>{post.readTime}</span>
          </div>
        </header>
        
        <h1 className="blog-post__title">{post.title}</h1>
        <p className="blog-post__excerpt">{post.excerpt}</p>

        <div className="blog-post__content">
          {contentSections.map((section, index) => {
            if (section.startsWith('## ')) {
              return <h2 key={index}>{section.replace('## ', '')}</h2>;
            }
            if (section.startsWith('### ')) {
              return <h3 key={index}>{section.replace('### ', '')}</h3>;
            }
            if (section.startsWith('- ')) {
              const items = section.split('\n').filter(s => s.startsWith('- '));
              return (
                <ul key={index}>
                  {items.map((item, i) => (
                    <li key={i}>{item.replace('- ', '')}</li>
                  ))}
                </ul>
              );
            }
            if (/^\d+\./.test(section)) {
              const items = section.split('\n').filter(s => /^\d+\./.test(s));
              return (
                <ol key={index}>
                  {items.map((item, i) => (
                    <li key={i}>{item.replace(/^\d+\.\s*/, '')}</li>
                  ))}
                </ol>
              );
            }
            return <p key={index}>{section}</p>;
          })}
        </div>

        <footer className="blog-post__footer">
          <a href="/blog" className="blog-post__back">Back to Blog</a>
        </footer>
      </article>
    </LandingLayout>
  );
}

export default BlogPostPage;
