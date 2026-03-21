-- Batch 3b: Commodities & Macro — Crypto (6) + Commodities (8)

-- CRYPTO
UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'AI Crypto Market Intelligence | AlphaLens AI',
  meta_description = 'Discover how AI provides crypto market intelligence through on-chain analysis, sentiment tracking, and cross-asset correlation signals.',
  excerpt = 'AI crypto intelligence combines on-chain data, social sentiment, and macro context for more informed digital asset decisions.',
  tags = ARRAY['crypto', 'AI intelligence', 'on-chain analysis', 'sentiment', 'digital assets']
WHERE slug = 'ai-crypto-market-intelligence';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Bitcoin On-Chain Analysis with AI | AlphaLens AI',
  meta_description = 'Learn how AI analyzes Bitcoin on-chain data including UTXO age, miner flows, exchange reserves, and whale activity for trading signals.',
  excerpt = 'On-chain analysis with AI reveals Bitcoin accumulation and distribution patterns invisible in traditional price and volume data.',
  tags = ARRAY['Bitcoin', 'on-chain analysis', 'AI trading', 'whale tracking', 'crypto signals']
WHERE slug = 'bitcoin-on-chain-analysis-ai';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'DeFi Yield Analysis with AI | AlphaLens AI',
  meta_description = 'See how AI analyzes DeFi yield opportunities across protocols, evaluating risk-adjusted returns, smart contract risk, and sustainability.',
  excerpt = 'AI DeFi yield analysis helps investors separate sustainable yield from unsustainable incentive programs across protocols.',
  tags = ARRAY['DeFi', 'yield farming', 'AI analysis', 'smart contracts', 'crypto yield']
WHERE slug = 'defi-yield-analysis-ai';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Crypto Market Microstructure with AI | AlphaLens AI',
  meta_description = 'Explore how AI analyzes crypto market microstructure including order books, liquidity, slippage, and exchange fragmentation.',
  excerpt = 'Crypto microstructure analysis with AI helps traders understand liquidity dynamics and execution quality across exchanges.',
  tags = ARRAY['crypto microstructure', 'order book', 'liquidity', 'AI analysis', 'market structure']
WHERE slug = 'crypto-market-microstructure';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Ethereum Ecosystem Analysis with AI | AlphaLens AI',
  meta_description = 'Learn how AI analyzes the Ethereum ecosystem including gas fees, L2 activity, DeFi TVL, and developer metrics for investment signals.',
  excerpt = 'AI Ethereum analysis tracks network health, L2 adoption, and DeFi activity to identify ecosystem-level investment opportunities.',
  tags = ARRAY['Ethereum', 'AI analysis', 'DeFi', 'L2', 'crypto ecosystem']
WHERE slug = 'ethereum-ecosystem-ai-analysis';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Crypto Sentiment & On-Chain Signals | AlphaLens AI',
  meta_description = 'Discover how AI combines crypto sentiment analysis with on-chain signals for more robust digital asset trading strategies.',
  excerpt = 'Combining sentiment and on-chain data with AI creates a more complete picture of crypto market conditions than either source alone.',
  tags = ARRAY['crypto sentiment', 'on-chain signals', 'AI trading', 'social sentiment', 'blockchain analytics']
WHERE slug = 'crypto-sentiment-on-chain-signals';

-- COMMODITIES
UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Gold Price Forecasting with AI | AlphaLens AI',
  meta_description = 'Learn how AI forecasts gold prices using real rates, dollar strength, central bank buying, and geopolitical risk indicators.',
  excerpt = 'AI gold forecasting combines macro fundamentals with positioning data and sentiment to produce more reliable price projections.',
  tags = ARRAY['gold', 'price forecasting', 'AI models', 'precious metals', 'macro trading']
WHERE slug = 'gold-price-forecasting-ai';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Crude Oil Supply-Demand Analysis with AI | AlphaLens AI',
  meta_description = 'See how AI analyzes crude oil supply and demand balances using OPEC data, inventory reports, and production forecasts for trading.',
  excerpt = 'AI crude oil analysis tracks supply-demand balances in near real time using satellite data, shipping flows, and inventory signals.',
  tags = ARRAY['crude oil', 'supply-demand', 'AI analysis', 'OPEC', 'energy trading']
WHERE slug = 'crude-oil-supply-demand-ai';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Natural Gas Trading with AI | AlphaLens AI',
  meta_description = 'Explore how AI models natural gas markets using weather forecasts, storage data, LNG flows, and seasonal demand patterns.',
  excerpt = 'Natural gas trading with AI leverages weather models, storage analytics, and LNG flow data for better seasonal positioning.',
  tags = ARRAY['natural gas', 'AI trading', 'weather models', 'LNG', 'energy markets']
WHERE slug = 'natural-gas-trading-ai';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Agricultural Commodities with AI | AlphaLens AI',
  meta_description = 'Learn how AI analyzes agricultural commodities using crop reports, weather data, trade flows, and supply chain indicators.',
  excerpt = 'AI agricultural analysis combines satellite imagery, weather models, and trade data for better crop and soft commodity forecasts.',
  tags = ARRAY['agricultural commodities', 'AI analysis', 'crop reports', 'weather data', 'soft commodities']
WHERE slug = 'agricultural-commodities-ai';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Industrial Metals Analysis with AI | AlphaLens AI',
  meta_description = 'Discover how AI analyzes industrial metals markets including copper, aluminum, and zinc using demand indicators and supply data.',
  excerpt = 'AI industrial metals analysis tracks manufacturing PMIs, China demand, and supply disruptions for more informed base metals trading.',
  tags = ARRAY['industrial metals', 'copper', 'AI analysis', 'base metals', 'manufacturing']
WHERE slug = 'industrial-metals-ai-analysis';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Energy Transition Commodities with AI | AlphaLens AI',
  meta_description = 'See how AI analyzes energy transition commodities like lithium, cobalt, and rare earths using EV demand, supply constraints, and policy.',
  excerpt = 'Energy transition commodities require different analysis — AI helps track EV adoption, battery tech, and supply chain bottlenecks.',
  tags = ARRAY['energy transition', 'lithium', 'rare earths', 'AI analysis', 'green commodities']
WHERE slug = 'energy-transition-commodities-ai';

UPDATE blog_posts SET
  category = 'Commodities & Macro',
  meta_title = 'Commodity Supercycle Analysis with AI | AlphaLens AI',
  meta_description = 'Explore how AI evaluates commodity supercycle dynamics using long-term supply constraints, demand shifts, and investment cycle data.',
  excerpt = 'AI supercycle analysis helps investors distinguish between cyclical rallies and structural supply-demand shifts in commodities.',
  tags = ARRAY['commodity supercycle', 'AI analysis', 'long-term investing', 'supply constraints', 'macro cycles']
WHERE slug = 'commodity-supercycle-ai-analysis';

-- Append Related Reading to crypto articles missing it
UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [AI Crypto Market Intelligence](/blog/ai-crypto-market-intelligence)\n- [Ethereum Ecosystem Analysis with AI](/blog/ethereum-ecosystem-ai-analysis)\n- [Gold Price Forecasting with AI](/blog/gold-price-forecasting-ai)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'bitcoin-on-chain-analysis-ai' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Ethereum Ecosystem Analysis with AI](/blog/ethereum-ecosystem-ai-analysis)\n- [Crypto Sentiment & On-Chain Signals](/blog/crypto-sentiment-on-chain-signals)\n- [Yield Curve Analysis with AI](/blog/yield-curve-analysis-ai)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'defi-yield-analysis-ai' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [FX Order Flow Analysis with AI](/blog/fx-order-flow-analysis-ai)\n- [Bitcoin On-Chain Analysis with AI](/blog/bitcoin-on-chain-analysis-ai)\n- [Liquidity Risk Assessment in AI Portfolios](/blog/liquidity-risk-portfolio-ai)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'crypto-market-microstructure' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [DeFi Yield Analysis with AI](/blog/defi-yield-analysis-ai)\n- [Crypto Sentiment & On-Chain Signals](/blog/crypto-sentiment-on-chain-signals)\n- [Energy Transition Commodities with AI](/blog/energy-transition-commodities-ai)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'ethereum-ecosystem-ai-analysis' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Bitcoin On-Chain Analysis with AI](/blog/bitcoin-on-chain-analysis-ai)\n- [AI Crypto Market Intelligence](/blog/ai-crypto-market-intelligence)\n- [Alternative Data Sources for AI Trading](/blog/alternative-data-trading-ai)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'crypto-sentiment-on-chain-signals' AND content NOT LIKE '%## Related Reading%';

-- Append Related Reading to commodity articles missing it
UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Precious Metals in AI Portfolio Strategies](/blog/precious-metals-portfolio-ai)\n- [Commodity Futures Curve Analysis with AI](/blog/commodity-futures-curve-ai)\n- [Inflation Forecasting with AI Models](/blog/inflation-forecasting-ai-models)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'gold-price-forecasting-ai' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Natural Gas Trading with AI](/blog/natural-gas-trading-ai)\n- [Commodity Supercycle Analysis with AI](/blog/commodity-supercycle-ai-analysis)\n- [Geopolitical Risk Assessment with AI](/blog/geopolitical-risk-ai-assessment)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'crude-oil-supply-demand-ai' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Crude Oil Supply-Demand Analysis with AI](/blog/crude-oil-supply-demand-ai)\n- [Energy Transition Commodities with AI](/blog/energy-transition-commodities-ai)\n- [Economic Calendar Trading with AI](/blog/economic-calendar-ai-trading)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'natural-gas-trading-ai' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Commodity Supercycle Analysis with AI](/blog/commodity-supercycle-ai-analysis)\n- [Energy Transition Commodities with AI](/blog/energy-transition-commodities-ai)\n- [Macro Regime Shifts Detection with AI](/blog/macro-regime-shifts-ai)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'agricultural-commodities-ai' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Commodity Futures Curve Analysis with AI](/blog/commodity-futures-curve-ai)\n- [Crude Oil Supply-Demand Analysis with AI](/blog/crude-oil-supply-demand-ai)\n- [GDP Nowcasting with AI Models](/blog/gdp-nowcasting-ai-models)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'industrial-metals-ai-analysis' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Industrial Metals Analysis with AI](/blog/industrial-metals-ai-analysis)\n- [Commodity Supercycle Analysis with AI](/blog/commodity-supercycle-ai-analysis)\n- [ESG Integration in AI Portfolio Management](/blog/esg-portfolio-integration-ai)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'energy-transition-commodities-ai' AND content NOT LIKE '%## Related Reading%';

UPDATE blog_posts SET content = content || E'\n\n## Related Reading\n\n- [Crude Oil Supply-Demand Analysis with AI](/blog/crude-oil-supply-demand-ai)\n- [Agricultural Commodities with AI](/blog/agricultural-commodities-ai)\n- [Cross-Asset Macro Correlations with AI](/blog/cross-asset-macro-correlations)\n\n---\n\n**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.'
WHERE slug = 'commodity-supercycle-ai-analysis' AND content NOT LIKE '%## Related Reading%';
