/**
 * AURA Feature Registry — Single Source of Truth for feature routing.
 * 
 * Each entry mirrors EXACTLY the payload structure used by the corresponding page.
 * AURA uses this registry to build requests, parse responses, and navigate to pages.
 */

import type { CreditType } from '@/hooks/useCreditManager';

// ============================================================================
// CONSTANTS (must match the pages)
// ============================================================================

const MACRO_LAB_PROXY_URL = 'https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/macro-lab-proxy';
const N8N_REPORTS_URL = 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1';

const HORIZON_BY_TIMEFRAME: Record<string, number> = {
  '15min': 12,
  '30min': 24,
  '1h': 24,
  '4h': 30,
};

// ============================================================================
// TYPES
// ============================================================================

export type FeatureId = 'trade_generator' | 'macro_lab' | 'reports';

export interface FeatureParams {
  instrument: string;
  timeframe?: string;
  riskLevel?: string;
  strategy?: string;
  customNotes?: string;
  question?: string;
  jobId: string;
  userEmail?: string | null;
}

export interface FeatureEntry {
  featureId: FeatureId;
  pageRoute: string;
  endpoint: string;
  creditType: CreditType;
  /** DB constraint value for jobs.feature */
  dbFeature: 'AI Trade Setup' | 'Macro Commentary' | 'Report';
  buildPayload: (params: FeatureParams) => Record<string, unknown>;
  /** Extract display-ready data from raw response for AURA mini-widgets */
  parseResponse: (raw: unknown) => { summary: string; data: any } | null;
}

// ============================================================================
// SHARED HELPERS (extracted from ForecastTradeGenerator.tsx)
// ============================================================================

/**
 * Builds the `question` field for the RAG backend.
 * Identical to the one in ForecastTradeGenerator.tsx.
 */
export function buildTradeQuestion(p: {
  instrument: string;
  timeframe: string;
  riskLevel: string;
  strategy: string;
  customNotes: string;
  horizons: number[];
}): string {
  const lines = [
    `Provide an institutional macro outlook and risks for ${p.instrument}, then a macro-grounded trade idea (entry/SL/TP).`,
    `Prioritize central banks / Bloomberg / Reuters; ignore low-authority sources unless they synthesize institutional research.`,
    `Focus on policy divergence, inflation, growth, labor, real yields, financial conditions.`,
    `Use technicals only to refine entries after macro.`
  ];
  if (p?.timeframe) lines.push(`User timeframe: ${p.timeframe}.`);
  if (p?.riskLevel) lines.push(`User risk: ${p.riskLevel}.`);
  if (p?.strategy) lines.push(`Strategy: ${p.strategy}.`);
  if (p?.horizons?.length) lines.push(`Forecast horizons: ${p.horizons.join(', ')} hours.`);
  if (p?.customNotes) lines.push(`Note: ${p.customNotes}.`);
  return lines.join(' ');
}

// ============================================================================
// RESPONSE PARSERS
// ============================================================================

/** Parse content.content which may be an object or a JSON string */
function parseContentContent(content: unknown): Record<string, unknown> | null {
  if (!content) return null;
  if (typeof content === 'object' && content !== null) return content as Record<string, unknown>;
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
    } catch { /* ignore */ }
  }
  return null;
}

/**
 * Extract trade setup data from raw API response (mirrors normalizeN8n + extractDecisionSummary from ForecastTradeGenerator)
 */
function parseTradeResponse(raw: unknown): { summary: string; data: any } | null {
  try {
    const obj = raw as Record<string, unknown>;
    let finalAnswer: unknown = null;

    // Path 1: body.message.message.content.content.final_answer
    try {
      const body = obj?.body as Record<string, unknown>;
      const m1 = body?.message as Record<string, unknown>;
      const m2 = m1?.message as Record<string, unknown>;
      const c1 = m2?.content as Record<string, unknown>;
      const c2 = parseContentContent(c1?.content);
      if (c2?.final_answer) finalAnswer = c2.final_answer;
    } catch { /* ignore */ }

    // Path 2: output.trade_generation_output.final_answer
    if (!finalAnswer) {
      try {
        const output = obj?.output as Record<string, unknown>;
        const tgo = output?.trade_generation_output as Record<string, unknown>;
        if (tgo?.final_answer) finalAnswer = tgo.final_answer;
      } catch { /* ignore */ }
    }

    // Path 3: direct final_answer or content
    if (!finalAnswer) {
      finalAnswer = obj?.final_answer || obj?.content || obj;
    }

    // Parse JSON string
    if (typeof finalAnswer === 'string') {
      try { finalAnswer = JSON.parse(finalAnswer); } catch { /* ignore */ }
    }

    if (!finalAnswer || typeof finalAnswer !== 'object') return null;

    const fa = finalAnswer as Record<string, unknown>;
    const instrument = (fa.instrument as string) || 'N/A';
    const setups = Array.isArray(fa.setups) ? fa.setups : [];
    const setup = setups[0] || {};
    const direction = setup?.direction || 'N/A';

    // ── Extract decision_summary (same 3-path logic) ──
    let decisionSummary: unknown = null;
    // Path 1: body.message.message.content.content.decision_summary
    try {
      const body = obj?.body as Record<string, unknown>;
      const m1 = body?.message as Record<string, unknown>;
      const m2 = m1?.message as Record<string, unknown>;
      const c1 = m2?.content as Record<string, unknown>;
      const c2 = parseContentContent(c1?.content);
      if (c2?.decision_summary) decisionSummary = c2.decision_summary;
    } catch { /* ignore */ }
    // Path 2: output.trade_generation_output.decision_summary
    if (!decisionSummary) {
      try {
        const output = obj?.output as Record<string, unknown>;
        const tgo = output?.trade_generation_output as Record<string, unknown>;
        if (tgo?.decision_summary) decisionSummary = tgo.decision_summary;
      } catch { /* ignore */ }
    }
    // Path 3: direct or inside final_answer
    if (!decisionSummary) {
      decisionSummary = fa?.decision_summary || obj?.decision_summary;
    }
    // Parse JSON string
    if (typeof decisionSummary === 'string') {
      try { decisionSummary = JSON.parse(decisionSummary); } catch { /* ignore */ }
    }

    return {
      summary: `Trade setup for ${instrument}: ${direction}`,
      data: { ...fa, ...(decisionSummary && typeof decisionSummary === 'object' ? { decision_summary: decisionSummary } : {}) },
    };
  } catch {
    return null;
  }
}

/**
 * Extract macro commentary data from raw API response (mirrors parseMacroContentToStructured from ForecastMacroLab)
 */
function parseMacroResponse(raw: unknown): { summary: string; data: any } | null {
  try {
    const obj = raw as Record<string, unknown>;
    let content: unknown = null;

    // Path 1: body.message.message.content.content
    try {
      const body = obj?.body as Record<string, unknown>;
      const m1 = body?.message as Record<string, unknown>;
      const m2 = m1?.message as Record<string, unknown>;
      const c1 = m2?.content as Record<string, unknown>;
      content = c1?.content;
    } catch { /* ignore */ }

    // Path 2: message.content.content
    if (!content) {
      try {
        const msg = obj?.message as Record<string, unknown>;
        const c1 = msg?.content as Record<string, unknown>;
        content = c1?.content;
      } catch { /* ignore */ }
    }

    // Path 3: direct
    if (!content) content = obj;

    // Parse JSON string
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch { /* keep as string */ }
    }

    // Extract inner content field if present, but preserve sibling structured fields
    if (content && typeof content === 'object' && (content as any).content) {
      const siblings = content as Record<string, unknown>;
      const inner = siblings.content;
      if (typeof inner === 'string') {
        const structured = parseMacroText(inner);
        const result = structured || { executive_summary: inner };
        // Merge sibling structured data that parseMacroText can't extract from text
        if (siblings.market_data) (result as any).market_data = siblings.market_data;
        if (siblings.fundamentals) (result as any).fundamentals = siblings.fundamentals;
        if (siblings.citations_news) (result as any).citations_news = siblings.citations_news;
        if (siblings.base_report) (result as any).base_report = siblings.base_report;
        if (siblings.request) (result as any).request = siblings.request;
        return { summary: ((result as any).executive_summary as string)?.slice(0, 120) || 'Macro analysis completed', data: result };
      }
      // inner is object — merge siblings into it
      const merged = { ...(inner as Record<string, unknown>) };
      if (siblings.market_data && !merged.market_data) merged.market_data = siblings.market_data;
      if (siblings.fundamentals && !merged.fundamentals) merged.fundamentals = siblings.fundamentals;
      if (siblings.citations_news && !merged.citations_news) merged.citations_news = siblings.citations_news;
      if (siblings.base_report && !merged.base_report) merged.base_report = siblings.base_report;
      content = merged;
    }

    if (content && typeof content === 'object') {
      const c = content as Record<string, unknown>;
      if (c.executive_summary || c.fundamental_analysis || c.directional_bias) {
        return { summary: (c.executive_summary as string)?.slice(0, 120) || 'Macro analysis completed', data: c };
      }
    }

    if (typeof content === 'string') {
      const structured = parseMacroText(content);
      if (structured) {
        return { summary: (structured.executive_summary as string)?.slice(0, 120) || 'Macro analysis completed', data: structured };
      }
      return { summary: content.slice(0, 120), data: { executive_summary: content } };
    }

    return { summary: 'Macro analysis completed', data: content };
  } catch {
    return null;
  }
}

/** Simple text parser for macro commentary (mirrors parseMacroContentToStructured) */
function parseMacroText(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== 'string') return null;
  const result: Record<string, unknown> = {};

  // Flexible regex: handle both "Section:" and "Section\n" formats
  const execMatch = text.match(/Executive Summary:?\s*\n?([^]*?)(?=\n\n|\nFundamental Analysis:?|$)/i);
  if (execMatch) result.executive_summary = execMatch[1].trim();

  const fundMatch = text.match(/Fundamental Analysis:?\s*\n?([^]*?)(?=\n\nDirectional Bias:?|\nDirectional Bias:?|$)/i);
  if (fundMatch) {
    const rawFund = fundMatch[1].trim();
    // Split by bullet points (- **text** or - text)
    const points = rawFund.split(/\n[-•]\s*/).filter(p => p.trim()).map(p => p.trim().replace(/^[-•]\s*/, '')).filter(p => p.length > 0);
    result.fundamental_analysis = points.length > 1 ? points : rawFund;
  }

  // Bias + Confidence (multiple formats)
  const biasMatch = text.match(/Directional Bias:?\s*\n?\s*(\w+)/i);
  if (biasMatch) result.directional_bias = biasMatch[1];

  const confMatch = text.match(/Confidence:?\s*\n?\s*"?(\d+)%?"?/i);
  if (confMatch) result.confidence = parseInt(confMatch[1], 10);

  // Key Levels extraction
  const levelsMatch = text.match(/Key Levels[^]*?Support\s*\n([\d\s\n.]+?)Resistance\s*\n([\d\s\n.]+?)(?=\n\n|AI Insights|$)/i);
  if (levelsMatch) {
    const support = levelsMatch[1].trim().split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0);
    const resistance = levelsMatch[2].trim().split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0);
    if (support.length > 0 || resistance.length > 0) {
      result.key_levels = { support, resistance };
    }
  }

  // AI Insights extraction
  const gptMatch = text.match(/Toggle GPT\s*\n([^]*?)(?=\nToggle Curated|\n\n$|$)/i);
  if (gptMatch) {
    if (!result.ai_insights) result.ai_insights = {} as any;
    (result.ai_insights as any).gpt = gptMatch[1].trim();
  }
  const curatedMatch = text.match(/Toggle Curated\s*\n([^]*?)$/i);
  if (curatedMatch) {
    if (!result.ai_insights) result.ai_insights = {} as any;
    (result.ai_insights as any).curated = curatedMatch[1].trim();
  }

  return Object.keys(result).length > 0 ? result : null;
}

/** Simple report response parser */
function parseReportResponse(raw: unknown): { summary: string; data: any } | null {
  try {
    const obj = raw as Record<string, unknown>;
    const title = (obj?.title as string) || (obj?.report_title as string) || 'Market Report';
    const summary = (obj?.executive_summary as string) || (obj?.summary as string) || '';
    return { summary: summary.slice(0, 120) || title, data: obj };
  } catch {
    return null;
  }
}

// ============================================================================
// FEATURE REGISTRY
// ============================================================================

export const FEATURE_REGISTRY: Record<FeatureId, FeatureEntry> = {
  trade_generator: {
    featureId: 'trade_generator',
    pageRoute: '/trade-generator',
    endpoint: MACRO_LAB_PROXY_URL,
    creditType: 'ideas',
    dbFeature: 'AI Trade Setup',
    buildPayload: ({ instrument, timeframe = '4h', riskLevel = 'medium', strategy = 'breakout', customNotes = '', jobId, userEmail }) => {
      const horizons = [HORIZON_BY_TIMEFRAME[timeframe] || 24];
      return {
        job_id: jobId,
        type: 'RAG',
        mode: 'trade_generation',
        instrument,
        question: buildTradeQuestion({ instrument, timeframe, riskLevel, strategy, customNotes, horizons }),
        user_email: userEmail || null,
        isTradeQuery: true,
        timeframe,
        riskLevel,
        strategy,
        customNotes,
        horizons,
        use_montecarlo: true,
        paths: 3000,
        skew: -0.8,
      };
    },
    parseResponse: parseTradeResponse,
  },

  macro_lab: {
    featureId: 'macro_lab',
    pageRoute: '/macro-lab',
    endpoint: MACRO_LAB_PROXY_URL,
    creditType: 'queries',
    dbFeature: 'Macro Commentary',
    buildPayload: ({ instrument, timeframe = '1H', question, jobId, userEmail }) => ({
      job_id: jobId,
      type: 'RAG',
      mode: 'run',
      instrument,
      question: question || `Provide comprehensive macro commentary for ${instrument}`,
      user_email: userEmail || null,
      filters: { region: 'All', product: 'All', category: 'All' },
      assetType: 'currency',
      analysisDepth: 'detailed',
      period: 'weekly',
      isTradeQuery: false,
      timeframe,
    }),
    parseResponse: parseMacroResponse,
  },

  reports: {
    featureId: 'reports',
    pageRoute: '/reports',
    endpoint: N8N_REPORTS_URL,
    creditType: 'reports',
    dbFeature: 'Report',
    buildPayload: ({ instrument, question, jobId }) => ({
      job_id: jobId,
      mode: 'run',
      type: 'reports',
      question: question || `Generate comprehensive report for ${instrument}`,
      instrument,
      timeframe: '1D',
      exportFormat: 'pdf',
    }),
    parseResponse: parseReportResponse,
  },
};

// ============================================================================
// TOOL NAME → FEATURE ID MAPPING
// ============================================================================

/** Maps AURA tool function names (including legacy aliases) to registry feature IDs */
export function resolveFeatureId(toolName: string): FeatureId | null {
  const map: Record<string, FeatureId> = {
    'launch_trade_generator': 'trade_generator',
    'launch_ai_trade_setup': 'trade_generator',  // legacy
    'launch_macro_lab': 'macro_lab',
    'launch_macro_commentary': 'macro_lab',       // legacy
    'launch_report': 'reports',
  };
  return map[toolName] || null;
}

// ============================================================================
// SESSION STORAGE HANDOFF
// ============================================================================

/** Store result in sessionStorage for page preloading when user clicks "Open in page" */
export function storeResultForPage(featureId: FeatureId, jobId: string, data: any): void {
  sessionStorage.setItem('pendingResult', JSON.stringify({
    type: featureId,
    jobId,
    resultData: data,
    instrument: data?.instrument,
    timestamp: new Date().toISOString(),
  }));
}
