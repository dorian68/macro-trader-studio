/**
 * SEO Hub Page definitions for the question-led content architecture.
 * Each hub aggregates question articles by topic via tags.
 */

export interface SEOHubSection {
  title: string;
  description: string;
  articleSlugs: string[];
}

export interface SEOHubPage {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroDescription: string;
  sections: SEOHubSection[];
  relatedHubs: string[];
  ctaText: string;
}

export const seoHubPages: SEOHubPage[] = [
  {
    slug: 'ai-trading',
    title: 'AI Trading',
    metaTitle: 'AI Trading Guide | AlphaLens AI',
    metaDescription: 'Learn how AI trading works, profitability, signal accuracy, and the best tools for beginners. Expert guides from AlphaLens AI.',
    heroDescription: 'AI trading uses machine learning and statistical models to analyze markets, generate signals, and execute strategies faster than any human can. Explore our expert guides to understand how AI is transforming trading across FX, crypto, and commodities.',
    sections: [
      {
        title: 'Getting Started with AI Trading',
        description: 'Foundational concepts every trader should understand.',
        articleSlugs: ['what-is-ai-trading', 'how-does-ai-trading-work', 'best-ai-trading-software-beginners'],
      },
      {
        title: 'Performance & Accuracy',
        description: 'How profitable is AI trading and how accurate are the signals?',
        articleSlugs: ['is-ai-trading-profitable', 'how-accurate-are-ai-trading-signals'],
      },
      {
        title: 'AI vs Algorithmic Trading',
        description: 'Understanding the key differences between rule-based and adaptive systems.',
        articleSlugs: ['difference-algorithmic-trading-ai-trading'],
      },
    ],
    relatedHubs: ['forex-ai', 'crypto-ai', 'quant-education'],
    ctaText: 'Start using AI-powered trading intelligence today',
  },
  {
    slug: 'forex-ai',
    title: 'Forex AI',
    metaTitle: 'AI Forex Trading Guide | AlphaLens AI',
    metaDescription: 'How to use AI for forex trading — predictions, entry/exit levels, and signal generation. Practical guides for FX traders.',
    heroDescription: 'The forex market trades $7.5 trillion daily, making it the ideal playground for AI-powered analysis. Learn how machine learning can help predict currency moves, generate precise entry and exit levels, and filter noise from high-frequency price data.',
    sections: [
      {
        title: 'AI for Forex Trading',
        description: 'Practical guides on using AI in your FX workflow.',
        articleSlugs: ['how-to-use-ai-for-forex-trading', 'can-ai-predict-forex-moves', 'can-ai-generate-forex-entry-stop-loss-take-profit'],
      },
    ],
    relatedHubs: ['ai-trading', 'macro-analysis', 'portfolio-risk'],
    ctaText: 'Get AI-powered forex signals and analysis',
  },
  {
    slug: 'crypto-ai',
    title: 'Crypto AI',
    metaTitle: 'AI Crypto Trading Guide | AlphaLens AI',
    metaDescription: 'Can AI predict crypto prices? How to use AI for crypto trading. Expert analysis and practical strategies.',
    heroDescription: 'Cryptocurrency markets operate 24/7 with extreme volatility — precisely the conditions where AI excels. Discover how machine learning models analyze on-chain data, sentiment, and technical patterns to help crypto traders make better decisions.',
    sections: [
      {
        title: 'AI for Crypto Markets',
        description: 'How AI handles crypto volatility and prediction.',
        articleSlugs: ['how-to-use-ai-for-crypto-trading', 'can-ai-predict-crypto-prices'],
      },
      {
        title: 'AI for Commodities',
        description: 'Gold, oil, and commodity trading with AI assistance.',
        articleSlugs: ['how-to-use-ai-for-gold-trading', 'can-ai-help-predict-oil-prices'],
      },
    ],
    relatedHubs: ['ai-trading', 'forex-ai', 'portfolio-risk'],
    ctaText: 'Explore AI-powered crypto and commodity analysis',
  },
  {
    slug: 'macro-analysis',
    title: 'Macro Analysis',
    metaTitle: 'Macro Trading Analysis Guide | AlphaLens AI',
    metaDescription: 'How interest rates, central banks, CPI, and GDP affect markets. Learn to combine macro analysis with AI trading.',
    heroDescription: 'Macro analysis is the backbone of institutional trading. Understanding how central bank decisions, inflation data, and GDP releases move markets gives traders a structural edge. Learn how to integrate macro intelligence with AI-driven signal generation.',
    sections: [
      {
        title: 'Central Banks & Interest Rates',
        description: 'How monetary policy drives currency and asset prices.',
        articleSlugs: ['how-do-interest-rates-affect-forex', 'how-does-the-fed-affect-us-dollar', 'how-to-read-central-bank-statement-trading'],
      },
      {
        title: 'Economic Indicators',
        description: 'Key data releases and their market impact.',
        articleSlugs: ['how-do-cpi-inflation-reports-affect-trading', 'how-does-gdp-impact-currency-markets', 'what-economic-calendar-events-matter-traders'],
      },
      {
        title: 'Advanced Macro',
        description: 'Combining macro analysis with AI and modern techniques.',
        articleSlugs: ['how-to-combine-macro-analysis-with-ai-trading', 'what-is-nowcasting-macro-investing'],
      },
    ],
    relatedHubs: ['ai-trading', 'forex-ai', 'portfolio-risk'],
    ctaText: 'Access AI-powered macro intelligence',
  },
  {
    slug: 'portfolio-risk',
    title: 'Portfolio & Risk',
    metaTitle: 'Portfolio & Risk Management Guide | AlphaLens AI',
    metaDescription: 'How to manage risk in AI trading — position sizing, drawdown reduction, stop-loss, and AI portfolio allocation.',
    heroDescription: 'Risk management is what separates profitable traders from the rest. Learn how to size positions using volatility, reduce drawdowns, use stop-loss and take-profit effectively, and leverage AI for smarter portfolio allocation.',
    sections: [
      {
        title: 'Risk Management Essentials',
        description: 'Core risk concepts every trader must master.',
        articleSlugs: ['how-to-manage-risk-in-ai-trading', 'how-to-size-positions-using-volatility', 'how-to-use-stop-loss-take-profit-effectively'],
      },
      {
        title: 'Portfolio Optimization',
        description: 'AI-driven portfolio construction and allocation.',
        articleSlugs: ['what-is-portfolio-optimization-trading', 'how-to-reduce-drawdown-ai-trading', 'can-ai-improve-portfolio-allocation'],
      },
    ],
    relatedHubs: ['ai-trading', 'quant-education', 'macro-analysis'],
    ctaText: 'Optimize your portfolio with AI analytics',
  },
  {
    slug: 'quant-education',
    title: 'Quant Education',
    metaTitle: 'Quant Trading Education | AlphaLens AI',
    metaDescription: 'Learn backtesting, overfitting, walk-forward optimization, Monte Carlo simulation, and how to evaluate AI trading models.',
    heroDescription: 'Quantitative trading combines statistics, programming, and market knowledge to build systematic strategies. Master the essential concepts — from backtesting and overfitting to Sharpe ratios and Monte Carlo simulations — with practical, expert-level guides.',
    sections: [
      {
        title: 'Backtesting & Validation',
        description: 'How to test and validate trading strategies properly.',
        articleSlugs: ['what-is-backtesting-ai-trading', 'how-to-backtest-ai-trading-strategy', 'what-is-overfitting-trading-models', 'what-is-walk-forward-optimization'],
      },
      {
        title: 'Advanced Methods',
        description: 'Statistical techniques for robust strategy development.',
        articleSlugs: ['what-is-monte-carlo-simulation-trading', 'how-to-evaluate-ai-trading-model'],
      },
      {
        title: 'Metrics & Strategy Design',
        description: 'Understanding the numbers that matter.',
        articleSlugs: ['which-metrics-matter-trading-strategy-evaluation', 'what-is-sharpe-ratio-simple-terms', 'what-is-quantitative-trading-strategy'],
      },
    ],
    relatedHubs: ['ai-trading', 'portfolio-risk', 'macro-analysis'],
    ctaText: 'Build better strategies with AI-powered backtesting',
  },
];

export function getHubBySlug(slug: string): SEOHubPage | undefined {
  return seoHubPages.find(h => h.slug === slug);
}
