-- Reassign cover images for 34 articles to new images

-- 1. Finance charts - Quant signals (from skyscrapers)
UPDATE blog_posts SET cover_image = '/images/blog/cover-finance-charts.jpg'
WHERE slug IN ('ai-signal-noise-filtering','ai-signal-validation-trading','real-time-signal-generation','regime-detection-trading-ai','momentum-vs-mean-reversion-ai','multi-timeframe-signal-analysis');

-- 2. Dollar globe - FX (from dollar-bill)
UPDATE blog_posts SET cover_image = '/images/blog/cover-dollar-globe.jpg'
WHERE slug IN ('fx-carry-trade-ai-analysis','fx-carry-trade-optimization','fx-volatility-forecasting-ai','fx-order-flow-analysis-ai','usd-strength-ai-model','fx-hedging-strategies-ai');

-- 3. Hundred bills - Portfolio (from market-rise)
UPDATE blog_posts SET cover_image = '/images/blog/cover-hundred-bills.jpg'
WHERE slug IN ('drawdown-management-ai','tail-risk-hedging-ai','liquidity-risk-portfolio-ai','stress-testing-portfolios-ai','ai-risk-management-trading','ai-portfolio-monitoring');

-- 4. Euro coins - Macro (from currencies)
UPDATE blog_posts SET cover_image = '/images/blog/cover-euro-coins.jpg'
WHERE slug IN ('central-bank-policy-ai-analysis','inflation-forecasting-ai-models','yield-curve-analysis-ai','gdp-nowcasting-ai-models','labor-market-ai-analysis','economic-calendar-ai-trading');

-- 5. Dollars spread - Institutional (from skyscrapers)
UPDATE blog_posts SET cover_image = '/images/blog/cover-dollars-spread.jpg'
WHERE slug IN ('ai-explainability-trading-research','ai-research-desk-finance','institutional-ai-market-intelligence','manual-vs-ai-market-research','ai-trading-tools-comparison');

-- 6. Central bank - Macro (from currencies)
UPDATE blog_posts SET cover_image = '/images/blog/cover-central-bank.jpg'
WHERE slug IN ('central-bank-communication-nlp','macro-regime-shifts-ai','cross-asset-macro-correlations','geopolitical-risk-ai-assessment','market-data-to-decision-ready-commentary');