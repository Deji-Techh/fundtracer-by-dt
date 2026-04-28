/**
 * BlogPage - FundTracer Blog
 * SEO-optimized blog for content marketing
 */

import React, { useState, useEffect } from 'react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge } from '../design-system/primitives';
import './BlogPage.css';

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

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  slug: string;
  image?: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 'new',
    title: 'FundTracer x Dune SIM: Real-Time Solana Data at Scale',
    excerpt: 'We\'ve integrated Dune\'s SIM API for instant access to Solana wallet balances, transactions, and on-chain activity. Built for the hackathon.',
    category: 'Engineering',
    date: '2026-04-28',
    readTime: '3 min read',
    slug: 'fundtracer-dune-sim-integration',
  },
  {
    id: '0',
    title: 'FundTracer v2: The Leaderboard That Actually Works',
    excerpt: 'We rebuilt our rewards system from scratch. See how we achieved 98% Firestore read reduction and built a leaderboard that scales.',
    category: 'Engineering',
    date: '2026-04-22',
    readTime: '5 min read',
    slug: 'fundtracer-v2-leaderboard-rebuilt',
  },
  {
    id: '1',
    title: 'FundTracer x Torque: Earn Equity for Analyzing Wallets',
    excerpt: 'We\'ve integrated Torque to power our equity-based loyalty program. Learn how to earn 5% equity ownership by analyzing wallets.',
    category: 'Announcement',
    date: '2026-04-21',
    readTime: '4 min read',
    slug: 'fundtracer-torque-equity-rewards',
  },
  {
    id: '1',
    title: 'What is Sybil Detection in Crypto',
    excerpt: 'Learn how Sybil detection works in cryptocurrency and how it helps identify coordinated bot networks and fake accounts.',
    category: 'Security',
    date: '2026-03-15',
    readTime: '5 min read',
    slug: 'what-is-sybil-detection',
  },
  {
    id: '2',
    title: 'How to Trace Ethereum Wallet Funds',
    excerpt: 'A comprehensive guide to tracing funds on the Ethereum blockchain using block explorers and analytics tools.',
    category: 'Tutorial',
    date: '2026-03-10',
    readTime: '8 min read',
    slug: 'how-to-trace-ethereum-wallet-funds',
  },
  {
    id: '3',
    title: 'How Airdrop Farmers Get Caught',
    excerpt: 'Understanding how blockchain analytics detects airdrop farming and coordinated wallet activity.',
    category: 'Security',
    date: '2026-03-05',
    readTime: '6 min read',
    slug: 'how-airdrop-farmers-get-caught',
  },
  {
    id: '4',
    title: 'Top Blockchain Forensics Tools 2026',
    excerpt: 'A comparison of the best blockchain forensics and on-chain analytics tools available today.',
    category: 'Tools',
    date: '2026-02-28',
    readTime: '7 min read',
    slug: 'top-blockchain-forensics-tools-2026',
  },
  {
    id: '5',
    title: 'What is a Wallet Risk Score',
    excerpt: 'Understanding how wallet risk scores are calculated and how to use them for safer crypto transactions.',
    category: 'Education',
    date: '2026-02-20',
    readTime: '5 min read',
    slug: 'what-is-wallet-risk-score',
  },
  {
    id: '6',
    title: 'How to Read a Blockchain Funding Tree',
    excerpt: 'Learn to interpret funding tree visualizations and trace the origin of crypto assets.',
    category: 'Tutorial',
    date: '2026-02-15',
    readTime: '10 min read',
    slug: 'how-to-read-blockchain-funding-tree',
  },
  {
    id: '7',
    title: 'EVM vs Solana Transaction Tracing',
    excerpt: 'Comparing transaction tracing and wallet analysis across Ethereum Virtual Machine chains and Solana.',
    category: 'Comparison',
    date: '2026-02-10',
    readTime: '6 min read',
    slug: 'evm-vs-solana-transaction-tracing',
  },
  {
    id: '8',
    title: 'How to Use FundTracer API',
    excerpt: 'A complete guide to integrating FundTracer API into your applications for wallet analysis.',
    category: 'Development',
    date: '2026-02-05',
    readTime: '12 min read',
    slug: 'how-to-use-fundtracer-api',
  },
  {
    id: '9',
    title: 'How to Detect Coordinated Wallet Activity',
    excerpt: 'Technical deep-dive into methods used to detect coordinated wallet behavior and Sybil attacks.',
    category: 'Security',
    date: '2026-01-30',
    readTime: '8 min read',
    slug: 'detect-coordinated-wallet-activity',
  },
];

const categories = ['All', 'Security', 'Tutorial', 'Tools', 'Education', 'Comparison', 'Development'];

export function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'Blog | FundTracer';
  }, []);

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <LandingLayout
      navItems={navItems}
      showSearch={false}
    >
      <div className="blog-page">
        <div className="blog-hero">
          <h1 className="blog-hero__title">FundTracer Blog</h1>
          <p className="blog-hero__subtitle">
            Insights, tutorials, and guides on blockchain forensics, wallet analysis, and crypto security
          </p>
        </div>

        <div className="blog-filters">
          <div className="blog-categories">
            {categories.map(category => (
              <button
                key={category}
                className={`blog-category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search articles..."
            className="blog-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="blog-grid">
          {filteredPosts.map(post => (
            <article key={post.id} className="blog-card">
              <div className="blog-card__header">
                <Badge variant="info">{post.category}</Badge>
                <span className="blog-card__date">{post.date}</span>
              </div>
              <h2 className="blog-card__title">{post.title}</h2>
              <p className="blog-card__excerpt">{post.excerpt}</p>
              <div className="blog-card__footer">
                <span className="blog-card__read-time">{post.readTime}</span>
                <a href={`/blog/${post.slug}`} className="blog-card__link">Read more</a>
              </div>
            </article>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="blog-empty">
            <p>No articles found matching your criteria.</p>
          </div>
        )}
      </div>
    </LandingLayout>
  );
}

export default BlogPage;
