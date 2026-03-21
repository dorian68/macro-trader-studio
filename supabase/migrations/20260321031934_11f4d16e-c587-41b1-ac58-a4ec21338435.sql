-- Stagger publication dates across 2 weeks
UPDATE public.blog_posts SET published_at = '2025-03-07 09:00:00+00' WHERE slug = 'ai-macro-market-analysis-guide';
UPDATE public.blog_posts SET published_at = '2025-03-09 10:30:00+00' WHERE slug = 'market-data-to-decision-ready-commentary';
UPDATE public.blog_posts SET published_at = '2025-03-11 08:15:00+00' WHERE slug = 'quant-research-workflow-data-to-signal';
UPDATE public.blog_posts SET published_at = '2025-03-13 11:00:00+00' WHERE slug = 'ai-fx-research-workflows';
UPDATE public.blog_posts SET published_at = '2025-03-15 09:45:00+00' WHERE slug = 'ai-crypto-market-intelligence';
UPDATE public.blog_posts SET published_at = '2025-03-17 10:00:00+00' WHERE slug = 'commodities-research-ai-assistance';
UPDATE public.blog_posts SET published_at = '2025-03-19 08:30:00+00' WHERE slug = 'ai-explainability-trading-research';
UPDATE public.blog_posts SET published_at = '2025-03-21 11:15:00+00' WHERE slug = 'manual-vs-ai-market-research';

-- Inject Related Reading internal links into each article
UPDATE public.blog_posts SET content = content || E'\n\n---\n\n## Related Reading\n\n- [How to Turn Market Data into Decision-Ready Commentary](/blog/market-data-to-decision-ready-commentary)\n- [Manual Market Research vs AI-Assisted Workflow](/blog/manual-vs-ai-market-research)\n- [Quant Research Workflow: From Data to Actionable Signal](/blog/quant-research-workflow-data-to-signal)\n- [Explore AlphaLens Features →](/features)\n- [See Pricing Plans →](/pricing)\n'
WHERE slug = 'ai-macro-market-analysis-guide' AND content NOT LIKE '%## Related Reading%';

UPDATE public.blog_posts SET content = content || E'\n\n---\n\n## Related Reading\n\n- [AI for Macro Market Analysis: A Practical Guide](/blog/ai-macro-market-analysis-guide)\n- [AI Explainability in Trading and Research Workflows](/blog/ai-explainability-trading-research)\n- [How AI Can Improve FX Research Workflows](/blog/ai-fx-research-workflows)\n- [Explore AlphaLens Features →](/features)\n- [See Pricing Plans →](/pricing)\n'
WHERE slug = 'market-data-to-decision-ready-commentary' AND content NOT LIKE '%## Related Reading%';

UPDATE public.blog_posts SET content = content || E'\n\n---\n\n## Related Reading\n\n- [AI for Macro Market Analysis: A Practical Guide](/blog/ai-macro-market-analysis-guide)\n- [AI Explainability in Trading and Research Workflows](/blog/ai-explainability-trading-research)\n- [Manual Market Research vs AI-Assisted Workflow](/blog/manual-vs-ai-market-research)\n- [Explore AlphaLens Features →](/features)\n- [See Pricing Plans →](/pricing)\n'
WHERE slug = 'quant-research-workflow-data-to-signal' AND content NOT LIKE '%## Related Reading%';

UPDATE public.blog_posts SET content = content || E'\n\n---\n\n## Related Reading\n\n- [AI for Macro Market Analysis: A Practical Guide](/blog/ai-macro-market-analysis-guide)\n- [How to Turn Market Data into Decision-Ready Commentary](/blog/market-data-to-decision-ready-commentary)\n- [AI for Crypto Market Intelligence](/blog/ai-crypto-market-intelligence)\n- [Explore AlphaLens Features →](/features)\n- [See Pricing Plans →](/pricing)\n'
WHERE slug = 'ai-fx-research-workflows' AND content NOT LIKE '%## Related Reading%';

UPDATE public.blog_posts SET content = content || E'\n\n---\n\n## Related Reading\n\n- [How AI Can Improve FX Research Workflows](/blog/ai-fx-research-workflows)\n- [How to Structure Commodities Research with AI](/blog/commodities-research-ai-assistance)\n- [Manual Market Research vs AI-Assisted Workflow](/blog/manual-vs-ai-market-research)\n- [Explore AlphaLens Features →](/features)\n- [See Pricing Plans →](/pricing)\n'
WHERE slug = 'ai-crypto-market-intelligence' AND content NOT LIKE '%## Related Reading%';

UPDATE public.blog_posts SET content = content || E'\n\n---\n\n## Related Reading\n\n- [AI for Crypto Market Intelligence](/blog/ai-crypto-market-intelligence)\n- [AI for Macro Market Analysis: A Practical Guide](/blog/ai-macro-market-analysis-guide)\n- [How AI Can Improve FX Research Workflows](/blog/ai-fx-research-workflows)\n- [Explore AlphaLens Features →](/features)\n- [See Pricing Plans →](/pricing)\n'
WHERE slug = 'commodities-research-ai-assistance' AND content NOT LIKE '%## Related Reading%';

UPDATE public.blog_posts SET content = content || E'\n\n---\n\n## Related Reading\n\n- [Quant Research Workflow: From Data to Actionable Signal](/blog/quant-research-workflow-data-to-signal)\n- [How to Turn Market Data into Decision-Ready Commentary](/blog/market-data-to-decision-ready-commentary)\n- [Manual Market Research vs AI-Assisted Workflow](/blog/manual-vs-ai-market-research)\n- [Explore AlphaLens Features →](/features)\n- [See Pricing Plans →](/pricing)\n'
WHERE slug = 'ai-explainability-trading-research' AND content NOT LIKE '%## Related Reading%';

UPDATE public.blog_posts SET content = content || E'\n\n---\n\n## Related Reading\n\n- [AI for Macro Market Analysis: A Practical Guide](/blog/ai-macro-market-analysis-guide)\n- [Quant Research Workflow: From Data to Actionable Signal](/blog/quant-research-workflow-data-to-signal)\n- [AI Explainability in Trading and Research Workflows](/blog/ai-explainability-trading-research)\n- [Explore AlphaLens Features →](/features)\n- [See Pricing Plans →](/pricing)\n'
WHERE slug = 'manual-vs-ai-market-research' AND content NOT LIKE '%## Related Reading%';