/**
 * Single source of truth for all public, indexable routes.
 * Add a new entry here when creating a new public page —
 * the sitemap will update automatically on next build.
 */
export interface SitemapRoute {
  path: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export const SITE_URL = 'https://alphalensai.com';

export const sitemapRoutes: SitemapRoute[] = [
  // Core
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/blog', changefreq: 'daily', priority: 0.9 },
  { path: '/features', changefreq: 'monthly', priority: 0.9 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.9 },
  { path: '/product', changefreq: 'monthly', priority: 0.8 },
  { path: '/docs', changefreq: 'monthly', priority: 0.8 },
  { path: '/api', changefreq: 'monthly', priority: 0.7 },

  // Company
  { path: '/about', changefreq: 'monthly', priority: 0.7 },
  { path: '/contact', changefreq: 'monthly', priority: 0.7 },
  { path: '/help', changefreq: 'monthly', priority: 0.6 },

  // Legal
  { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { path: '/terms', changefreq: 'yearly', priority: 0.3 },

  // Blog articles
  { path: '/blog/ai-macro-market-analysis-guide', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/market-data-to-decision-ready-commentary', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/quant-research-workflow-data-to-signal', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-fx-research-workflows', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-crypto-market-intelligence', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/commodities-research-ai-assistance', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-explainability-trading-research', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/manual-vs-ai-market-research', changefreq: 'weekly', priority: 0.7 },

  // Wave 2 articles
  { path: '/blog/ai-backtest-trading-strategy', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-risk-management-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-research-desk-finance', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/institutional-ai-market-intelligence', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-signal-validation-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-portfolio-monitoring', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-trading-tools-comparison', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/fx-carry-trade-ai-analysis', changefreq: 'weekly', priority: 0.7 },
];
