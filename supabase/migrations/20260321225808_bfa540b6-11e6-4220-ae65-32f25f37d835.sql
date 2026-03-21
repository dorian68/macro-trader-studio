-- Reassign cover images: diversify from 14 to 20 images

-- 1. US/Shanghai - Commodities (from coins group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-us-shanghai.jpg'
WHERE slug IN ('crude-oil-supply-demand-ai','natural-gas-trading-ai','energy-transition-commodities-ai','commodity-supercycle-ai-analysis','industrial-metals-ai-analysis');

-- 2. Trading screen - Quant backtesting (from futuristic group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-trading-screen.jpg'
WHERE slug IN ('backtesting-pitfalls-overfitting-ai','walk-forward-optimization-ai','monte-carlo-simulation-trading-ai','factor-models-ai-trading','model-validation-ai-trading');

-- 3. Dirham - FX (from dollar-bill and dollar-globe groups)
UPDATE blog_posts SET cover_image = '/images/blog/cover-dirham.jpg'
WHERE slug IN ('emerging-market-fx-ai','asian-fx-markets-ai','fx-technical-patterns-ai','fx-news-sentiment-trading','ai-fx-pair-selection','ai-fx-research-workflows');

-- 4. Frankfurt - Institutional (from laptop group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-frankfurt.jpg'
WHERE slug IN ('mifid-compliance-ai-research','research-automation-buy-side','ai-trading-desk-integration','ai-model-governance-finance','future-of-ai-trading-2026');

-- 5. AI Data - Quant advanced (from futuristic group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-ai-data.jpg'
WHERE slug IN ('feature-engineering-trading-ai','ensemble-methods-trading-ai','alternative-data-trading-ai','reinforcement-learning-trading','quantitative-strategy-lifecycle-ai','how-ai-generates-trading-signals');