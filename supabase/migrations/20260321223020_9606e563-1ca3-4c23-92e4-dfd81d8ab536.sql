-- Batch 2: Portfolio & Risk (2 articles) + Institutional & Governance (5 articles)

-- Portfolio & Risk
UPDATE blog_posts SET
  category = 'Portfolio & Risk',
  meta_title = 'AI Risk Management for Trading | AlphaLens AI',
  meta_description = 'Learn how AI improves trading risk management through real-time monitoring, adaptive exposure control, and portfolio-level risk analytics.',
  excerpt = 'AI risk management helps traders move from reactive to proactive — detecting risk buildup before it becomes a drawdown.',
  tags = ARRAY['risk management', 'AI trading', 'portfolio risk', 'exposure control', 'drawdown prevention']
WHERE slug = 'ai-risk-management-trading';

UPDATE blog_posts SET
  category = 'Portfolio & Risk',
  meta_title = 'AI Portfolio Monitoring Systems | AlphaLens AI',
  meta_description = 'Discover how AI-powered portfolio monitoring detects drift, anomalies, and risk concentration in real time across multi-asset portfolios.',
  excerpt = 'AI portfolio monitoring goes beyond daily P&L — it watches for structural changes that could impact long-term portfolio health.',
  tags = ARRAY['portfolio monitoring', 'AI investing', 'risk analytics', 'portfolio drift', 'real-time alerts']
WHERE slug = 'ai-portfolio-monitoring';

-- Institutional & Governance
UPDATE blog_posts SET
  category = 'Institutional & Governance',
  meta_title = 'AI Explainability in Trading Research | AlphaLens AI',
  meta_description = 'Understand how explainability tools make AI trading research transparent, auditable, and compliant with institutional governance standards.',
  excerpt = 'Explainability is what turns an AI black box into a defensible research tool that institutions can actually trust and deploy.',
  tags = ARRAY['AI explainability', 'trading research', 'model interpretability', 'governance', 'institutional AI']
WHERE slug = 'ai-explainability-trading-research';

UPDATE blog_posts SET
  category = 'Institutional & Governance',
  meta_title = 'Manual vs AI Market Research Compared | AlphaLens AI',
  meta_description = 'Compare manual and AI-powered market research across speed, depth, consistency, and cost to find the right approach for your workflow.',
  excerpt = 'Manual vs AI research is not about replacement — it is about combining human judgment with AI speed and consistency.',
  tags = ARRAY['AI research', 'manual research', 'market analysis', 'research workflow', 'comparison']
WHERE slug = 'manual-vs-ai-market-research';

UPDATE blog_posts SET
  category = 'Institutional & Governance',
  meta_title = 'AI Research Desk for Finance | AlphaLens AI',
  meta_description = 'See how AI research desks help financial teams automate data triage, generate summaries, and accelerate investment decision-making.',
  excerpt = 'The AI research desk augments analysts with faster data processing, automated summarization, and structured idea generation.',
  tags = ARRAY['AI research desk', 'finance', 'investment research', 'automation', 'buy-side']
WHERE slug = 'ai-research-desk-finance';

UPDATE blog_posts SET
  category = 'Institutional & Governance',
  meta_title = 'Institutional AI Market Intelligence | AlphaLens AI',
  meta_description = 'Explore how institutional investors use AI market intelligence for macro analysis, signal generation, and cross-asset decision support.',
  excerpt = 'Institutional AI market intelligence combines macro data, alternative signals, and cross-asset analytics into actionable research.',
  tags = ARRAY['institutional AI', 'market intelligence', 'macro analysis', 'cross-asset', 'investment research']
WHERE slug = 'institutional-ai-market-intelligence';

UPDATE blog_posts SET
  category = 'Institutional & Governance',
  meta_title = 'AI Trading Tools Comparison 2026 | AlphaLens AI',
  meta_description = 'Compare the top AI trading tools of 2026 across features, pricing, data coverage, and suitability for retail and institutional traders.',
  excerpt = 'A practical comparison of AI trading tools to help you choose the platform that fits your trading style, asset class, and budget.',
  tags = ARRAY['AI trading tools', 'comparison', 'trading platforms', '2026', 'fintech']
WHERE slug = 'ai-trading-tools-comparison';

-- Append Related Reading to articles missing it
-- ai-risk-management-trading already has Related Reading
-- ai-portfolio-monitoring already has Related Reading
-- ai-explainability-trading-research already has Related Reading
-- manual-vs-ai-market-research already has Related Reading
-- ai-research-desk-finance already has Related Reading
-- institutional-ai-market-intelligence already has Related Reading
-- ai-trading-tools-comparison already has Related Reading
