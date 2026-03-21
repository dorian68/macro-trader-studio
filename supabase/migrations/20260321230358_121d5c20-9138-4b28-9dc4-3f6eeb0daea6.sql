
-- Diversify blog covers: add 5 new images, reassign 15 articles

-- 1. Hundred closeup - Portfolio (from hundred-bills group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-hundred-closeup.jpg'
WHERE slug IN ('ai-risk-management-trading','ai-portfolio-monitoring','liquidity-risk-portfolio-ai');

-- 2. Bank facade - Macro (from euro-coins group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-bank-facade.jpg'
WHERE slug IN ('central-bank-policy-ai-analysis','inflation-forecasting-ai-models','yield-curve-analysis-ai');

-- 3. British pound - FX (from dirham group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-british-pound.jpg'
WHERE slug IN ('emerging-market-fx-ai','asian-fx-markets-ai','fx-technical-patterns-ai');

-- 4. Vault - Portfolio (from market-rise group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-vault.jpg'
WHERE slug IN ('correlation-regime-changes-ai','esg-portfolio-integration-ai','volatility-targeting-ai');

-- 5. Zloty green - FX (from dollar-globe group)
UPDATE blog_posts SET cover_image = '/images/blog/cover-zloty-green.jpg'
WHERE slug IN ('fx-carry-trade-ai-analysis','fx-carry-trade-optimization','fx-hedging-strategies-ai');
