/**
 * BlogPage - FundTracer Blog
 * SEO-optimized blog for content marketing
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
}

const CATEGORY_ICONS: Record<string, string> = {
  Product: 'M13 2L3 14h20L13 2z',
  Engineering: 'M14.7 6.3a1 1 0 00-1.4 0l-8 8a1 1 0 000 1.4l2 2a1 1 0 001.4 0l8-8a1 1 0 000-1.4l-2-2z',
  Security: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  Tutorial: 'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z',
  Announcement: 'M18 8A6 6 0 006 8m6 6v2m0 4h0',
  Tools: 'M14.7 6.3a1 1 0 00-1.4 0l-8 8a1 1 0 000 1.4l2 2a1 1 0 001.4 0l8-8a1 1 0 000-1.4l-2-2zM6.3 17.7L9 20',
  Education: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.42a6 6 0 01.79 2.34L12 17l-6.95-4.08a6 6 0 01.79-2.34L12 14z',
  Comparison: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2-2H9L7 5H4a2 2 0 00-2 2z',
  Development: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

const blogPosts: BlogPost[] = [
  {
    id: 'search-engine-setup',
    title: 'Instant Wallet Lookups: Add FundTracer as a Browser Search Engine',
    excerpt: 'Type "ft" in your address bar, paste a wallet address or explorer URL, and jump straight to analysis — no clicks, no navigation. Works for all 10 supported chains.',
    category: 'Product',
    date: '2026-05-14',
    readTime: '2 min read',
    slug: 'browser-search-engine-setup',
  },
  {
    id: 'qvac-integration',
    title: 'Introducing QVAC: Local AI for Wallet Analysis',
    excerpt: 'FundTracer now integrates QVAC by Tether for on-device AI wallet analysis. No cloud, no API calls, complete privacy.',
    category: 'Product',
    date: '2026-05-03',
    readTime: '4 min read',
    slug: 'qvac-local-ai-integration',
  },
  {
    id: 'claim-improvements',
    title: 'Claim System 2.0: Multiple Claims & Real-Time Updates',
    excerpt: 'We\'ve completely overhauled the equity claim system. Now claim multiple times as you earn more points, track your claim history, and see real-time rewards.',
    category: 'Product',
    date: '2026-04-30',
    readTime: '3 min read',
    slug: 'claim-system-improvements',
  },
  {
    id: 'hackathon-guide',
    title: 'FundTracer Hackathon Starter Kit',
    excerpt: 'Everything you need to build a winning hackathon project with FundTracer. From quick wallet analysis to Torque-powered rewards.',
    category: 'Tutorial',
    date: '2026-04-28',
    readTime: '5 min read',
    slug: 'hackathon-starter-kit',
  },
  {
    id: 'sim',
    title: 'FundTracer x Dune SIM: Real-Time Solana Data at Scale',
    excerpt: 'We\'ve integrated Dune\'s SIM API for instant access to Solana wallet balances, transactions, and on-chain activity.',
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
    id: 'sybil',
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

const categories = ['All', 'Product', 'Tutorial', 'Engineering', 'Security', 'Tools', 'Education', 'Comparison', 'Development'];

function CategoryIcon({ category }: { category: string }) {
  const d = CATEGORY_ICONS[category];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <path d={d} />
    </svg>
  );
}

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
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="blog-page">
        <header className="blog-hero">
          <motion.span
            className="blog-eyebrow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            Insights & Tutorials
          </motion.span>
          <motion.h1
            className="blog-hero__title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            FundTracer Blog
          </motion.h1>
          <motion.p
            className="blog-hero__subtitle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Blockchain forensics, wallet analysis, and crypto security — explained by the FundTracer team
          </motion.p>
        </header>

        {/* Search engine setup promo card */}
        <motion.div
          className="blog-promo"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="blog-promo__content">
            <div className="blog-promo__icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
                <circle cx="9" cy="9" r="5"/><path d="M13 13l6 6"/>
              </svg>
            </div>
            <div>
              <h3 className="blog-promo__title">Instant wallet lookups from your address bar</h3>
              <p className="blog-promo__text">
                Add FundTracer as a browser search engine, type <code>ft</code> + Tab, paste any address or explorer URL, and jump straight to analysis. Works across Chrome, Firefox, Edge and all 10+ supported chains.
              </p>
              <a href="/docs/getting-started#search-engine" className="blog-promo__cta">
                Set it up now →
              </a>
            </div>
          </div>
        </motion.div>

        <div className="blog-filters">
          <div className="blog-categories">
            {categories.map(category => (
              <button
                key={category}
                className={`blog-category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category !== 'All' && <CategoryIcon category={category} />}
                {category}
              </button>
            ))}
          </div>
          <div className="blog-search-wrapper">
            <svg className="blog-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
              <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>
            </svg>
            <input
              type="text"
              placeholder="Search articles..."
              className="blog-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <motion.div className="blog-grid" layout>
          {filteredPosts.map((post, i) => (
            <motion.article
              key={post.id}
              className="blog-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              layout
            >
              <div className="blog-card__header">
                <span className="blog-card__category" data-category={post.category}>
                  <CategoryIcon category={post.category} />
                  {post.category}
                </span>
                <span className="blog-card__date">{post.date}</span>
              </div>
              <h2 className="blog-card__title">
                <a href={`/blog/${post.slug}`}>{post.title}</a>
              </h2>
              <p className="blog-card__excerpt">{post.excerpt}</p>
              <div className="blog-card__footer">
                <span className="blog-card__read-time">{post.readTime}</span>
                <a href={`/blog/${post.slug}`} className="blog-card__link">
                  Read article →
                </a>
              </div>
            </motion.article>
          ))}
        </motion.div>

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
