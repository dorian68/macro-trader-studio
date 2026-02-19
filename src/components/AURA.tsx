import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, ChevronRight, Send, Loader2, CheckCircle, XCircle, Globe, ChevronDown, ChevronUp, Maximize2, Minimize2, ArrowUpRight, Search, Code, Copy, TrendingUp, TrendingDown, Newspaper, BarChart3, BookOpen, Plus, Clock, PanelLeft } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { AURATeaser } from '@/components/aura/AURATeaser';
import { AURACollectivePanel } from '@/components/aura/AURACollectivePanel';
import { getRandomTeaser, AURATeaser as TeaserType } from '@/lib/auraMessages';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalLoading } from '@/components/GlobalLoadingProvider';
import { useRealtimeJobManager } from '@/hooks/useRealtimeJobManager';
import { useCreditEngagement } from '@/hooks/useCreditEngagement';
import { enhancedPostRequest } from '@/lib/enhanced-request';
import { MarketChartWidget } from '@/components/aura/MarketChartWidget';
import { AURAHistoryPanel } from '@/components/aura/AURAHistoryPanel';
import { FEATURE_REGISTRY, resolveFeatureId, storeResultForPage } from '@/lib/auraFeatureRegistry';
import type { FeatureId } from '@/lib/auraFeatureRegistry';
import { useAuraThread } from '@/hooks/useAuraThread';
import type { Message, RichContent } from '@/hooks/useAuraThread';
import auraLogo from '@/assets/aura-logo.png';

interface AURAProps {
  context: string;
  isExpanded: boolean;
  onToggle: () => void;
  contextData?: import('@/lib/auraMessages').AURAContextData;
}

// Message and RichContent types imported from useAuraThread

// ===== GENERATE NATURAL LANGUAGE SUMMARY =====
function generateNaturalSummary(featureType: string, data: any, instrument: string): string {
  try {
    if (featureType === 'trade_generator') {
      const setup = data?.setups?.[0] || data;
      const direction = setup?.direction || setup?.signal || 'N/A';
      const confidence = setup?.strategyMeta?.confidence || setup?.confidence;
      const timeframe = setup?.timeframe || data?.timeframe || '4h';
      const entry = setup?.entryPrice || setup?.entry_price || setup?.entry;
      const sl = setup?.stopLoss || setup?.stop_loss || setup?.sl;
      const tp = setup?.takeProfits?.[0] || setup?.takeProfit || setup?.take_profit || setup?.tp;
      const rr = setup?.riskRewardRatio || setup?.risk_reward_ratio;
      const strategy = setup?.strategyMeta?.name || setup?.strategy || '';
      const notes = setup?.strategyMeta?.notes || setup?.notes || setup?.strategy_notes || [];

      let summary = `### Trade Setup: ${instrument} — ${direction}\n\n`;
      summary += `AURA has identified a **${direction.toLowerCase()}** opportunity on **${instrument}**`;
      if (confidence) summary += ` with **${Math.round(Number(confidence) * 100)}% confidence**`;
      summary += ` on the **${timeframe}** timeframe.`;
      if (strategy) summary += ` The setup is based on a **${strategy}** strategy.`;
      summary += '\n\n';

      if (entry || sl || tp) {
        summary += '**Levels:**\n';
        if (entry) summary += `- Entry: ${Number(entry).toFixed(4)}\n`;
        if (sl) {
          const slPips = entry ? Math.abs(Number(entry) - Number(sl)) : null;
          summary += `- Stop Loss: ${Number(sl).toFixed(4)}`;
          if (slPips) summary += ` (${(slPips * 10000).toFixed(0)} pips)`;
          summary += '\n';
        }
        if (tp) {
          const tpPips = entry ? Math.abs(Number(tp) - Number(entry)) : null;
          summary += `- Take Profit: ${Number(tp).toFixed(4)}`;
          if (tpPips) summary += ` (+${(tpPips * 10000).toFixed(0)} pips)`;
          summary += '\n';
        }
        if (rr) summary += `- Risk/Reward: ${Number(rr).toFixed(2)}\n`;
        summary += '\n';
      }

      if (rr) {
        const rrVal = Number(rr);
        if (rrVal >= 2) summary += 'The risk/reward ratio is favorable, offering strong upside potential relative to the stop distance.\n\n';
        else if (rrVal >= 1) summary += 'The risk/reward ratio is acceptable, though the reward is modest relative to the risk.\n\n';
        else summary += 'The risk/reward ratio is below 1:1. Consider adjusting levels for a better setup.\n\n';
      }

      if (Array.isArray(notes) && notes.length > 0) {
        summary += '**Strategy Notes:**\n';
        notes.forEach((n: any) => { summary += `- ${typeof n === 'string' ? n : n?.text || JSON.stringify(n)}\n`; });
      } else if (typeof notes === 'string' && notes) {
        summary += `**Strategy Notes:**\n- ${notes}\n`;
      }

      return summary;
    }

    if (featureType === 'macro_lab') {
      return '';
    }

    if (featureType === 'reports') {
      const title = data?.title || data?.report_title || 'Market Report';
      const execSummary = data?.executive_summary || data?.summary || '';

      let summary = `### ${title}\n\n`;
      if (typeof execSummary === 'string' && execSummary) {
        summary += execSummary.slice(0, 600) + '\n\n';
      }
      const sections = data?.sections || [];
      if (Array.isArray(sections) && sections.length > 0) {
        sections.slice(0, 3).forEach((s: any) => {
          if (s?.title) summary += `**${s.title}**\n`;
          if (s?.content) summary += `${typeof s.content === 'string' ? s.content.slice(0, 200) : ''}\n\n`;
        });
      }
      return summary;
    }

    return `Analysis completed for **${instrument}**. See the details below.`;
  } catch {
    return `Analysis completed for **${instrument}**.`;
  }
}

// ===== DEEP SCAN HELPER =====
function deepFindKey(obj: any, key: string, maxDepth = 5): any {
  if (!obj || typeof obj !== 'object' || maxDepth <= 0) return undefined;
  if (key in obj) return obj[key];
  for (const k of Object.keys(obj)) {
    const result = deepFindKey(obj[k], key, maxDepth - 1);
    if (result !== undefined) return result;
  }
  return undefined;
}

// ===== EXTRACT MARKET ATTACHMENTS =====
function extractMarketAttachments(payload: any): { type: 'market_chart'; payload: any } | null {
  try {
    if (!payload || typeof payload !== 'object') return null;

    // Deep dig for nested content
    const root = payload?.body?.message?.message?.content?.content || payload?.content || payload;

    // 1. OHLC / twelve_data_time_series
    const ohlcSource = root?.market_data || root?.twelve_data_time_series || root?.ohlc || deepFindKey(payload, 'market_data', 4) || deepFindKey(payload, 'ohlc', 4);

    // Handle {symbol, interval, values: [...]} format from macro-lab
    if (ohlcSource && typeof ohlcSource === 'object' && !Array.isArray(ohlcSource)) {
      const valuesArray = (ohlcSource as any).values || (ohlcSource as any).data;
      if (Array.isArray(valuesArray) && valuesArray.length > 2 && valuesArray[0]?.open != null) {
        const ohlc = valuesArray.map((d: any) => ({
          time: d.datetime || d.date || d.time || d.ds,
          open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close),
        })).filter((d: any) => d.time && !isNaN(d.open));
        if (ohlc.length > 2) {
          return { type: 'market_chart', payload: {
            mode: 'candlestick', data: { ohlc },
            instrument: (ohlcSource as any).symbol || root?.instrument,
            timeframe: (ohlcSource as any).interval || root?.timeframe
          }};
        }
      }
    }

    // Handle direct OHLC array
    if (Array.isArray(ohlcSource) && ohlcSource.length > 2 && ohlcSource[0]?.open != null) {
      const ohlc = ohlcSource.map((d: any) => ({
        time: d.datetime || d.date || d.time || d.ds,
        open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close),
      })).filter((d: any) => d.time && !isNaN(d.open));
      if (ohlc.length > 2) {
        const entry = root?.entry || root?.entry_price || deepFindKey(payload, 'entry_price', 3);
        const sl = root?.sl || root?.stop_loss || deepFindKey(payload, 'stop_loss', 3);
        const tp = root?.tp || root?.take_profit || deepFindKey(payload, 'take_profit', 3);
        return { type: 'market_chart', payload: { mode: 'candlestick', data: { ohlc, markers: { entry, sl, tp } }, instrument: root?.instrument, timeframe: root?.timeframe } };
      }
    }

    // 2. Predictions / forecast
    const predictions = root?.predictions || root?.forecast_data?.predictions || deepFindKey(payload, 'forecast_predictions', 4) || deepFindKey(payload, 'predictions', 4);
    if (predictions && typeof predictions === 'object') {
      const horizonKey = Object.keys(predictions).find(k => Array.isArray(predictions[k]) && predictions[k].length > 0 && predictions[k][0]?.ds);
      if (horizonKey) {
        const pts = predictions[horizonKey].map((d: any) => ({ time: d.ds?.split('T')[0] || d.ds, value: Number(d.yhat) })).filter((d: any) => d.time && !isNaN(d.value));
        if (pts.length > 1) {
          return { type: 'market_chart', payload: { mode: 'line', data: { predictions: pts }, instrument: root?.instrument, timeframe: horizonKey } };
        }
      }
    }

    // 3. Equity curve / backtest
    const eqCurve = root?.equity_curve || root?.backtest_results?.equity_curve || deepFindKey(payload, 'equity_curve', 4);
    if (Array.isArray(eqCurve) && eqCurve.length > 2) {
      const pts = eqCurve.map((d: any) => ({ time: d.date || d.time || d.ds, value: Number(d.value ?? d.equity ?? d.pnl) })).filter((d: any) => d.time && !isNaN(d.value));
      if (pts.length > 2) {
        const stats = root?.backtest_results?.stats || root?.stats || deepFindKey(payload, 'stats', 3);
        return { type: 'market_chart', payload: { mode: 'area', data: { equity_curve: pts, stats }, instrument: root?.instrument } };
      }
    }

    // 4. Generic time_series detection (deep)
    const timeSeries = deepFindKey(payload, 'time_series', 4);
    if (Array.isArray(timeSeries) && timeSeries.length > 2) {
      const hasOHLC = timeSeries[0]?.open != null;
      if (hasOHLC) {
        const ohlc = timeSeries.map((d: any) => ({
          time: d.datetime || d.date || d.time, open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close),
        })).filter((d: any) => d.time && !isNaN(d.open));
        if (ohlc.length > 2) return { type: 'market_chart', payload: { mode: 'candlestick', data: { ohlc }, instrument: root?.instrument } };
      }
      // date/close line chart
      if (timeSeries[0]?.close != null || timeSeries[0]?.value != null) {
        const pts = timeSeries.map((d: any) => ({ time: d.date || d.time || d.datetime, value: Number(d.close ?? d.value) })).filter((d: any) => d.time && !isNaN(d.value));
        if (pts.length > 2) return { type: 'market_chart', payload: { mode: 'line', data: { predictions: pts }, instrument: root?.instrument } };
      }
    }

    // 5. Backtest with trades array
    const backtest = deepFindKey(payload, 'backtest', 4);
    if (backtest?.trades && Array.isArray(backtest.trades) && backtest.trades.length > 0) {
      const trades = backtest.trades;
      if (trades[0]?.entry_price != null) {
        const stats = backtest.stats || backtest.summary;
        return { type: 'market_chart', payload: { mode: 'area', data: { equity_curve: [], stats, trades }, instrument: root?.instrument } };
      }
    }

    return null;
  } catch {
    return null;
  }
}

interface AuraJobBadge {
  jobId: string;
  type: 'trade_generator' | 'macro_lab' | 'reports';
  instrument: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  createdAt: Date;
}

const QUICK_ACTIONS: Record<string, string[]> = {
  'Backtester': [
    "Which setups had the highest win rate?",
    "Show me patterns in losing trades",
    "What's the best instrument performance?",
    "Analyze confidence vs outcomes",
  ],
  'Portfolio Analytics': [
    "Which trades were over-leveraged?",
    "What's my biggest mistake last month?",
    "Show me my worst instrument",
    "Analyze my average holding time",
  ],
  'default': [
    "Help me understand this data",
    "What patterns do you see?",
    "Give me actionable insights",
  ]
};

// Helper to extract text content from a Message
function getMessageText(msg: Message): string {
  if (typeof msg.content === 'string') return msg.content;
  return msg.content?.summary || '';
}

// ===== EXTRACTED WIDGET COMPONENTS (module scope for stable React identity) =====

interface WidgetProps {
  data: any;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

const AuraFullTradeSetup = ({ data, onNavigate, onClose }: WidgetProps) => {
  const setup = data?.setups?.[0] || data;
  const instrument = data?.instrument || setup?.instrument || 'N/A';
  const direction = setup?.direction || 'N/A';
  const entry = setup?.entryPrice || setup?.entry_price || setup?.entry;
  const sl = setup?.stopLoss || setup?.stop_loss || setup?.sl;
  const tp = setup?.takeProfits?.[0] || setup?.takeProfit || setup?.take_profit || setup?.tp;
  const rr = setup?.riskRewardRatio || setup?.risk_reward_ratio;
  const confidence = setup?.strategyMeta?.confidence || setup?.confidence;
  const timeframe = setup?.timeframe || data?.timeframe;
  const notes = setup?.strategyMeta?.notes || setup?.notes || setup?.strategy_notes || [];
  const ds = data?.decision_summary as Record<string, any> | undefined;
  const alignment = ds?.alignment;
  const verdict = ds?.verdict;
  const confLabel = ds?.confidence_label;
  const narrative = ds?.narrative;
  const keyRisks = ds?.key_risks;
  const nextStep = ds?.next_step;
  const tradeCard = ds?.trade_card;
  const displayEntry = entry || tradeCard?.entryPrice;
  const displaySl = sl || tradeCard?.stopLoss;
  const displayTp = tp || tradeCard?.takeProfits?.[0] || tradeCard?.takeProfit;
  const displayRr = rr || tradeCard?.riskRewardRatio;
  const isBullish = direction?.toLowerCase() === 'long' || direction?.toLowerCase() === 'buy';

  return (
    <div className="border border-border rounded-lg p-4 bg-card/50 space-y-3 mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm">{instrument}</span>
        <Badge variant={isBullish ? 'default' : 'destructive'} className="text-xs">{direction}</Badge>
        {timeframe && <Badge variant="outline" className="text-xs">{timeframe}</Badge>}
        {confidence && <Badge variant="outline" className="text-xs">{Math.round(Number(confidence) * 100)}%</Badge>}
      </div>
      {(alignment || verdict || confLabel) && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {verdict && <Badge variant={verdict.toLowerCase() === 'go' ? 'default' : 'destructive'} className="text-xs">{verdict}</Badge>}
          {confLabel && <span className="text-muted-foreground">Confidence: <strong>{confLabel}</strong></span>}
          {alignment && <span className="text-muted-foreground">Alignment: <strong>{alignment}</strong></span>}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {displayEntry && <div><span className="text-muted-foreground">Entry</span><br /><span className="font-mono font-semibold">{Number(displayEntry).toFixed(4)}</span></div>}
        {displaySl && <div><span className="text-muted-foreground">SL</span><br /><span className="font-mono text-destructive">{Number(displaySl).toFixed(4)}</span></div>}
        {displayTp && <div><span className="text-muted-foreground">TP</span><br /><span className="font-mono text-green-500">{Number(displayTp).toFixed(4)}</span></div>}
        {displayRr && <div><span className="text-muted-foreground">R:R</span><br /><span className="font-mono font-semibold">{Number(displayRr).toFixed(2)}</span></div>}
      </div>
      {((Array.isArray(notes) && notes.length > 0) || (typeof notes === 'string' && notes)) && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <BookOpen className="h-3.5 w-3.5" /><span>Strategy Notes</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            {Array.isArray(notes) ? (
              <ul className="space-y-1 text-xs leading-relaxed">
                {notes.map((n: any, i: number) => (
                  <li key={i} className="flex gap-1.5"><span className="text-muted-foreground mt-0.5">•</span><span>{typeof n === 'string' ? n : n?.text || JSON.stringify(n)}</span></li>
                ))}
              </ul>
            ) : (<p className="text-xs leading-relaxed">{String(notes)}</p>)}
          </CollapsibleContent>
        </Collapsible>
      )}
      {narrative && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <Globe className="h-3.5 w-3.5" /><span>Narrative</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1"><p className="text-xs leading-relaxed whitespace-pre-wrap">{String(narrative)}</p></CollapsibleContent>
        </Collapsible>
      )}
      {Array.isArray(keyRisks) && keyRisks.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <XCircle className="h-3.5 w-3.5" /><span>Key Risks ({keyRisks.length})</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            <ul className="space-y-1 text-xs leading-relaxed">
              {keyRisks.map((r: any, i: number) => (
                <li key={i} className="flex gap-1.5"><span className="text-muted-foreground mt-0.5">{i + 1}.</span><span>{typeof r === 'string' ? r : JSON.stringify(r)}</span></li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      {nextStep && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <ChevronRight className="h-3.5 w-3.5" /><span>Next Step</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1"><p className="text-xs leading-relaxed whitespace-pre-wrap">{String(nextStep)}</p></CollapsibleContent>
        </Collapsible>
      )}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => {
        storeResultForPage('trade_generator', data?.jobId || '', data);
        onNavigate(FEATURE_REGISTRY.trade_generator.pageRoute);
        onClose();
      }}><ArrowUpRight className="h-3 w-3" /> Open Full View</Button>
    </div>
  );
};

const AuraFullMacro = ({ data, onNavigate, onClose }: WidgetProps) => {
  const execSummary = data?.executive_summary || data?.summary || '';
  const bias = data?.directional_bias || '';
  const confidence = data?.confidence;
  const keyLevels = data?.key_levels as { support?: number[]; resistance?: number[] } | undefined;
  const fundamentalAnalysis = data?.fundamental_analysis;
  const fundamentals = data?.fundamentals as Array<{ indicator?: string; actual?: number | null; consensus?: number | null; previous?: number | null }> | undefined;
  const citationsNews = data?.citations_news as Array<{ publisher?: string; title?: string }> | undefined;
  const aiInsights = data?.ai_insights as { gpt?: string; curated?: string } | undefined;
  const baseReport = data?.base_report as string | undefined;
  const confVal = confidence ? (Number(confidence) > 1 ? Number(confidence) : Math.round(Number(confidence) * 100)) : null;
  const isBullish = bias?.toLowerCase()?.includes('bullish') || bias?.toLowerCase()?.includes('long');

  return (
    <div className="border border-border rounded-lg p-4 bg-card/50 space-y-3 mt-2">
      {bias && (
        <div className="flex items-center gap-2 flex-wrap">
          {isBullish ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          <span className={cn("font-semibold text-sm", isBullish ? "text-green-500" : "text-destructive")}>{bias}</span>
          {confVal != null && <Badge variant="outline" className="text-xs">{confVal}% confidence</Badge>}
        </div>
      )}
      {typeof execSummary === 'string' && execSummary && (
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{execSummary}</p>
      )}
      {keyLevels && (keyLevels.support?.length || keyLevels.resistance?.length) ? (
        <div className="grid grid-cols-2 gap-2">
          {keyLevels.support && keyLevels.support.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Support</span>
              <div className="flex flex-wrap gap-1">{keyLevels.support.map((v, i) => (<Badge key={i} variant="outline" className="text-xs font-mono text-green-500 border-green-500/30">{v}</Badge>))}</div>
            </div>
          )}
          {keyLevels.resistance && keyLevels.resistance.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Resistance</span>
              <div className="flex flex-wrap gap-1">{keyLevels.resistance.map((v, i) => (<Badge key={i} variant="outline" className="text-xs font-mono text-destructive border-destructive/30">{v}</Badge>))}</div>
            </div>
          )}
        </div>
      ) : null}
      {fundamentalAnalysis && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <BookOpen className="h-3.5 w-3.5" /><span>Fundamental Analysis {Array.isArray(fundamentalAnalysis) ? `(${fundamentalAnalysis.length} points)` : ''}</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            {Array.isArray(fundamentalAnalysis) ? (
              <ul className="space-y-1 text-xs leading-relaxed">{fundamentalAnalysis.map((point: any, i: number) => (<li key={i} className="flex gap-1.5"><span className="text-muted-foreground mt-0.5">•</span><span className="whitespace-pre-wrap">{typeof point === 'string' ? point : JSON.stringify(point)}</span></li>))}</ul>
            ) : (<p className="text-xs leading-relaxed whitespace-pre-wrap">{String(fundamentalAnalysis)}</p>)}
          </CollapsibleContent>
        </Collapsible>
      )}
      {Array.isArray(fundamentals) && fundamentals.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <BarChart3 className="h-3.5 w-3.5" /><span>Economic Indicators ({fundamentals.length})</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border"><th className="text-left py-1 pr-2 font-medium text-muted-foreground">Indicator</th><th className="text-right py-1 px-1 font-medium text-muted-foreground">Actual</th><th className="text-right py-1 px-1 font-medium text-muted-foreground">Cons.</th><th className="text-right py-1 pl-1 font-medium text-muted-foreground">Prev.</th></tr></thead>
                <tbody>{fundamentals.map((f, i) => (<tr key={i} className="border-b border-border/50"><td className="py-1 pr-2 truncate max-w-[140px]">{f.indicator || '—'}</td><td className="text-right py-1 px-1 font-mono">{f.actual != null ? f.actual : '—'}</td><td className="text-right py-1 px-1 font-mono text-muted-foreground">{f.consensus != null ? f.consensus : '—'}</td><td className="text-right py-1 pl-1 font-mono text-muted-foreground">{f.previous != null ? f.previous : '—'}</td></tr>))}</tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      {Array.isArray(citationsNews) && citationsNews.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <Newspaper className="h-3.5 w-3.5" /><span>News Sources ({citationsNews.length})</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 space-y-1.5">
            {citationsNews.map((c, i) => (<div key={i} className="flex items-start gap-2 text-xs"><Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{c.publisher || 'Source'}</Badge><span className="text-muted-foreground leading-snug">{c.title || '—'}</span></div>))}
          </CollapsibleContent>
        </Collapsible>
      )}
      {aiInsights && (aiInsights.gpt || aiInsights.curated) && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <Globe className="h-3.5 w-3.5" /><span>AI Insights</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 space-y-3">
            {aiInsights.gpt && (<div><p className="text-xs font-medium text-muted-foreground mb-1">GPT Analysis</p><p className="text-xs leading-relaxed whitespace-pre-wrap">{aiInsights.gpt}</p></div>)}
            {aiInsights.curated && (<div><p className="text-xs font-medium text-muted-foreground mb-1">Curated Research</p><p className="text-xs leading-relaxed whitespace-pre-wrap">{aiInsights.curated}</p></div>)}
          </CollapsibleContent>
        </Collapsible>
      )}
      {baseReport && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            <BookOpen className="h-3.5 w-3.5" /><span>ABCG Research Report</span><ChevronDown className="h-3 w-3 ml-auto" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1"><p className="text-xs leading-relaxed whitespace-pre-wrap">{baseReport}</p></CollapsibleContent>
        </Collapsible>
      )}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => {
        storeResultForPage('macro_lab', data?.jobId || '', data);
        onNavigate(FEATURE_REGISTRY.macro_lab.pageRoute);
        onClose();
      }}><ArrowUpRight className="h-3 w-3" /> Open Full View</Button>
    </div>
  );
};

const AuraMiniReport = ({ data, onNavigate, onClose }: WidgetProps) => {
  const title = data?.title || data?.report_title || 'Market Report';
  const summary = data?.executive_summary || data?.summary || '';
  const truncated = typeof summary === 'string' ? summary.slice(0, 150) : '';
  return (
    <div className="border border-border rounded-lg p-3 bg-card/50 space-y-2 mt-2">
      <p className="text-sm font-semibold">{title}</p>
      {truncated && <p className="text-xs text-muted-foreground">{truncated}{truncated.length >= 150 ? '...' : ''}</p>}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => {
        storeResultForPage('reports', data?.jobId || '', data);
        onNavigate(FEATURE_REGISTRY.reports.pageRoute);
        onClose();
      }}><ArrowUpRight className="h-3 w-3" /> Open Full View</Button>
    </div>
  );
};

export default function AURA({ context, isExpanded, onToggle, contextData }: AURAProps) {
  const {
    activeThread,
    messages,
    setMessages,
    threads,
    isLoadingThread,
    createNewChat,
    loadThread,
    deleteThreadById,
    refreshThreadList,
    persistUserMessage,
    persistAssistantMessage,
    updateLastAssistantInDb,
  } = useAuraThread();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [currentTeaser, setCurrentTeaser] = useState<TeaserType | null>(null);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobBadges, setJobBadges] = useState<AuraJobBadge[]>([]);
  const [showCollectivePanel, setShowCollectivePanel] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const jobCompletedRef = useRef<Set<string>>(new Set());
  const batchContextRef = useRef<{instrument?: string; priceSummary?: string; indicatorSummary?: string} | null>(null);
  const sessionMemory = useRef<{ lastInstrument?: string; lastTimeframe?: string; lastFeature?: string }>({});
  const pendingCommands = useRef<string[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation('toasts');
  const { user } = useAuth();
  const navigate = useNavigate();
  const globalLoading = useGlobalLoading();
  const { createJob } = useRealtimeJobManager();
  const { tryEngageCredit } = useCreditEngagement();

  // Stable callback for widget navigation (avoids re-renders)
  const handleNavigate = useCallback((path: string) => navigate(path), [navigate]);

  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      requestAnimationFrame(() => {
        const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' as ScrollBehavior });
        }
      });
    }
  }, [isExpanded]);

  // Auto-scroll smooth only for new messages, only if near bottom
  useEffect(() => {
    if (!scrollRef.current) return;
    const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 200;
    if (isNearBottom) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
    setTimeout(() => {
      const stillNear = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
      setShowScrollButton(!stillNear);
    }, 300);
  }, [messages.length, isLoading]);

  // Scroll button visibility listener
  useEffect(() => {
    if (!isExpanded) return;
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    const handleScroll = () => {
      const isNearBottom = 
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };
    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [isExpanded]);

  // Escape key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  // Reset teaser state when chat opens
  useEffect(() => {
    if (isExpanded) {
      setShowTeaser(false);
      setTeaserDismissed(true);
    } else {
      setTeaserDismissed(false);
    }
  }, [isExpanded]);

  // Teaser timer logic
  useEffect(() => {
    if (!isExpanded && !teaserDismissed) {
      const randomInterval = 25000 + Math.random() * 20000;
      const timer = setTimeout(() => {
        setCurrentTeaser(getRandomTeaser(context));
        setShowTeaser(true);
        setTimeout(() => { setShowTeaser(false); }, 8000);
        setTeaserDismissed(false);
      }, randomInterval);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, teaserDismissed, context]);

  // (localStorage save/restore removed — now using Supabase via useAuraThread)

  // Subscribe to job updates for badges
  useEffect(() => {
    if (!user?.id || !isExpanded) return;
    const channel = supabase
      .channel(`aura-job-badges-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const job = payload.new as any;
          setJobBadges((prev) =>
            prev.map((badge) =>
              badge.jobId === job.id
                ? { ...badge, status: job.status }
                : badge
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isExpanded]);

  // ===== MARKDOWN RENDERER =====
  const renderMarkdown = useCallback((text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className={cn(
            isFullscreen 
              ? "list-none space-y-2 my-2 pl-0" 
              : "list-disc list-inside space-y-1 my-1"
          )}>
            {listItems.map((item, i) => (
              <li key={i} className={cn(
                isFullscreen 
                  ? "text-[15px] leading-relaxed text-[#d1d5db] before:content-['•'] before:mr-3 before:text-[#4b5563]" 
                  : "text-sm"
              )}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const renderInline = (line: string): React.ReactNode => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, idx) => {
      if (line.startsWith('### ')) {
        flushList();
        elements.push(<h4 key={idx} className={cn(
          isFullscreen ? "text-[15px] font-semibold mt-3 mb-1 text-[#F3F4F6]" : "text-sm font-bold mt-2 mb-1"
        )}>{renderInline(line.slice(4))}</h4>);
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(<h3 key={idx} className={cn(
          isFullscreen ? "text-base font-semibold mt-4 mb-1.5 text-[#F3F4F6]" : "text-base font-bold mt-3 mb-1"
        )}>{renderInline(line.slice(3))}</h3>);
      } else if (line.startsWith('# ')) {
        flushList();
        elements.push(<h2 key={idx} className={cn(
          isFullscreen ? "text-lg font-semibold mt-4 mb-1.5 text-[#F3F4F6]" : "text-lg font-bold mt-3 mb-1"
        )}>{renderInline(line.slice(2))}</h2>);
      }
      else if (line.match(/^[-•]\s/)) {
        listItems.push(line.replace(/^[-•]\s/, ''));
      }
      else if (line.match(/^\d+\.\s/)) {
        listItems.push(line.replace(/^\d+\.\s/, ''));
      }
      else if (line.trim() === '') {
        flushList();
        elements.push(<div key={idx} className={isFullscreen ? "h-3" : "h-2"} />);
      }
      else {
        flushList();
        elements.push(<p key={idx} className={cn(
          isFullscreen ? "text-[15px] leading-relaxed text-[#d1d5db]" : "text-sm leading-relaxed"
        )}>{renderInline(line)}</p>);
      }
    });
    flushList();
    return <div className={cn(isFullscreen ? "space-y-1.5" : "space-y-0.5")}>{elements}</div>;
  }, [isFullscreen]);

  // ===== MINI-WIDGET COMPONENTS are defined at module scope (above) =====

  // ===== RENDER MESSAGE CONTENT =====
  const renderMessageContent = (msg: Message) => {
    const chartAttachments = msg.attachments?.filter(a => a.type === 'market_chart') || [];

    if (typeof msg.content === 'string') {
      if (msg.role === 'assistant') {
        return (
          <div className="text-[15px] leading-relaxed">
            {renderMarkdown(msg.content)}
            {chartAttachments.length > 0 && chartAttachments.map((att, i) => (
              <div key={i} className="mb-4 mt-3 rounded-lg overflow-hidden">
                <MarketChartWidget
                  data={att.payload.data}
                  instrument={att.payload.instrument}
                  timeframe={att.payload.timeframe}
                  fullscreen={isFullscreen}
                />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
                    navigate('/dashboard');
                    onToggle();
                  }}>
                    <ArrowUpRight className="h-3 w-3" /> Open in Trading Dashboard
                  </Button>
                  {['5min', '15min', '1h'].map((tf) => (
                    <Button
                      key={tf}
                      variant={att.payload.timeframe === tf ? 'default' : 'ghost'}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => sendMessage(`plot ${att.payload.instrument} last 24h ${tf}`)}
                    >
                      {tf}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }
      return <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
    }

    const rich = msg.content as RichContent;

    return (
      <div className="text-[15px] leading-relaxed">
        {/* 1. Natural language summary (markdown) */}
        {rich.summary && <div className="mb-3">{renderMarkdown(rich.summary)}</div>}

        {/* Metadata line */}
        {rich.meta && (
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <span>{rich.meta.featureId === 'trade_generator' ? 'Trade Generator' : rich.meta.featureId === 'macro_lab' ? 'Macro Labs' : 'Reports'}</span>
            <span>•</span>
            <span>{rich.meta.instrument}</span>
            {rich.meta.elapsedMs != null && (
              <>
                <span>•</span>
                <span>{(rich.meta.elapsedMs / 1000).toFixed(1)}s</span>
              </>
            )}
          </p>
        )}

        {/* 2. MarketChartWidget (TradingView-like) BEFORE mini-widget */}
        {chartAttachments.length > 0 && (
          <div className="mb-4 rounded-lg overflow-hidden">
            {chartAttachments.map((att, i) => (
              <MarketChartWidget
                key={i}
                data={att.payload.data}
                instrument={att.payload.instrument}
                timeframe={att.payload.timeframe}
                fullscreen={isFullscreen}
              />
            ))}
          </div>
        )}

        {/* 3. Mini-widget (Trade Card / Macro Card / Report) */}
        {rich.type === 'trade_setup' && <div className="mt-3"><AuraFullTradeSetup data={rich.data} onNavigate={handleNavigate} onClose={onToggle} /></div>}
        {rich.type === 'macro_commentary' && <div className="mt-3"><AuraFullMacro data={rich.data} onNavigate={handleNavigate} onClose={onToggle} /></div>}
        {rich.type === 'report' && <div className="mt-3"><AuraMiniReport data={rich.data} onNavigate={handleNavigate} onClose={onToggle} /></div>}
        {rich.type === 'tool_error' && (
          <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5 mt-2">
            <p className="text-sm text-destructive font-medium">Tool Error</p>
          </div>
        )}

        {/* 4. Collapsible raw JSON */}
        {rich.rawJson && (
          <Collapsible className="mt-3">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
              <Code className="h-3 w-3" />
              <span>{rich.rawJson.length > 50000 ? 'Raw JSON (large — click to expand)' : 'View raw JSON'}</span>
              <ChevronDown className="h-3 w-3" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(rich.rawJson!);
                    toast({ title: 'Copied', description: 'JSON copied to clipboard' });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <pre className="text-xs font-mono bg-black/30 rounded-md p-3 overflow-auto max-h-[300px] whitespace-pre-wrap break-all text-muted-foreground">
                  {rich.rawJson}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  // ===== POLITICAL CONTENT SANITIZER =====
  function sanitizePoliticalContent(text: string): { sanitized: string; wasSanitized: boolean } {
    const rules: [RegExp, string | ((match: string) => string)][] = [
      [/trump('s)?\s+(economic\s+)?polic(y|ies)/gi, 'US fiscal/trade policy scenarios'],
      [/trump('s)?\s+tariff(s)?/gi, 'potential US tariff policy changes'],
      [/if\s+trump\s+wins/gi, 'alternative US policy regime scenarios'],
      [/trump('s)?\s+impact/gi, 'US policy regime change impact'],
      [/trump('s)?\s+(economical?\s+)?politic(s|al)?/gi, 'US fiscal/trade policy scenarios'],
      [/biden('s)?\s+(economic\s+)?polic(y|ies)/gi, 'current US administration policy stance'],
      [/\b(trump|biden|macron|starmer)\b(?!'s\s+(?:entry|stop|take))/gi, (match: string) => {
        const map: Record<string, string> = {
          trump: 'US policy shift', biden: 'US administration policy',
          macron: 'French policy stance', starmer: 'UK policy stance'
        };
        return map[match.toLowerCase()] || 'policy scenario';
      }],
    ];
    let result = text;
    let changed = false;
    for (const [pattern, replacement] of rules) {
      const before = result;
      result = result.replace(pattern, replacement as any);
      if (result !== before) changed = true;
    }
    return { sanitized: result, wasSanitized: changed };
  }

  // Client-side plot command interceptor — bypasses LLM for reliable chart rendering
  const tryInterceptPlotCommand = (question: string): boolean => {
    const plotMatch = question.match(
      /^plot\s+([A-Za-z\/]+(?:\/[A-Za-z]+)?)\s+(?:last|past)\s+(\d+)\s*h(?:ours?)?\s+(\d+min|1h|4h|1day)?/i
    );
    if (!plotMatch) return false;

    const instrument = plotMatch[1].toUpperCase();
    const lookbackHours = parseInt(plotMatch[2], 10);
    const interval = plotMatch[3] || (lookbackHours <= 6 ? '5min' : lookbackHours <= 12 ? '15min' : lookbackHours <= 48 ? '30min' : '1h');

    const syntheticToolCall = {
      function: {
        name: 'plot_price_chart',
        arguments: JSON.stringify({ instrument, interval, lookback_hours: lookbackHours }),
      },
    };
    handleToolLaunch(syntheticToolCall, { collectOnly: false });
    return true;
  };

  // ===== CLIENT-SIDE TRADE GENERATOR INTENT INTERCEPTOR =====
  const tryInterceptTradeGenerator = (question: string): boolean => {
    // Match explicit trade intent patterns (EN + FR + ES)
    const tradePatterns = [
      /(?:generate|give\s+me|run|launch|create|do|make|execute|fais?|lancer?)\s+(?:a\s+|une?\s+)?(?:trade\s+(?:idea|setup|signal|recommendation)|idée?\s+de\s+trade|setup\s+de\s+trade|signal\s+de\s+trade)/i,
      /trade\s+(?:idea|setup|signal|generator)\s+(?:on|for|sur|de|about)\s+(.+)/i,
      /(?:trade|trading)\s+(?:on|for|sur|de)\s+(.+)/i,
      /(?:setup|signal)\s+(?:on|for|sur|de|about)\s+(.+)/i,
      /(?:run|launch|execute)\s+(?:the\s+)?trade\s+generator/i,
      /(?:entry|sl|tp|stop\s+loss|take\s+profit)\s+(?:for|on|sur)\s+(.+)/i,
    ];

    const matched = tradePatterns.some(p => p.test(question));
    if (!matched) return false;

    // Extract instrument
    const instrumentPattern = /\b(EUR[\s\/]?USD|GBP[\s\/]?USD|USD[\s\/]?JPY|AUD[\s\/]?USD|USD[\s\/]?CHF|USD[\s\/]?CAD|NZD[\s\/]?USD|EUR[\s\/]?GBP|EUR[\s\/]?JPY|BTC[\s\/]?USD|ETH[\s\/]?USD|XAU[\s\/]?USD|XAG[\s\/]?USD|SOL[\s\/]?USD|GOLD|BITCOIN|SPX|NDX|DXY|DAX)\b/i;
    const instrMatch = question.match(instrumentPattern);
    if (!instrMatch) return false; // No instrument → let LLM ask

    // Normalize instrument
    let instrument = instrMatch[0].toUpperCase().replace(/\s+/g, '');
    const aliasMap: Record<string, string> = { GOLD: 'XAU/USD', BITCOIN: 'BTC/USD' };
    if (aliasMap[instrument]) instrument = aliasMap[instrument];
    if (/^[A-Z]{6}$/.test(instrument)) instrument = instrument.slice(0, 3) + '/' + instrument.slice(3);

    // Extract timeframe
    const tfPattern = /\b(15\s*min|30\s*min|1\s*h|4\s*h|M1|M5|M15|M30|H1|H4|D1)\b/i;
    const tfMatch = question.match(tfPattern);
    const tfMap: Record<string, string> = {
      '15min': 'M15', '30min': 'M30', '1h': 'H1', '4h': 'H4',
      '15 min': 'M15', '30 min': 'M30', '1 h': 'H1', '4 h': 'H4',
    };
    let timeframe = 'H4';
    if (tfMatch) {
      const raw = tfMatch[0].toLowerCase().replace(/\s+/g, '');
      timeframe = tfMap[raw] || tfMatch[0].toUpperCase();
    }

    const { sanitized, wasSanitized } = sanitizePoliticalContent(question);

    const syntheticToolCall = {
      function: {
        name: 'launch_trade_generator',
        arguments: JSON.stringify({
          instrument,
          timeframe,
          customNotes: sanitized
        })
      }
    };

    if (wasSanitized) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '> *Note: framed as macro policy scenarios for objective market analysis.*'
      }]);
    }

    console.log('[AURA] Trade generator intent intercepted client-side', {
      instrument, timeframe, sanitizedPrompt: sanitized, wasSanitized
    });

    handleToolLaunch(syntheticToolCall, { collectOnly: false });
    return true;
  };

  // ===== CLIENT-SIDE MACRO-LAB INTENT INTERCEPTOR =====
  const tryInterceptMacroLab = (question: string): boolean => {
    // Match explicit macro-lab intent patterns (EN + FR)
    const macroPattern = /(?:do|run|launch|generate|give\s+me|make|execute|perform|lancer?|fais?)\s+(?:a\s+|une?\s+)?(?:macro\s+(?:commentary|analysis|labs?|commentaire|analyse)|commentaire\s+macro|analyse\s+macro)\s+(?:on|for|sur|de|about)\s+(.+)/i;
    const macroPattern2 = /(?:macro\s+(?:commentary|analysis|labs?)|commentaire\s+macro|analyse\s+macro)\s+(?:on|for|sur|de|about)\s+(.+)/i;

    const match = question.match(macroPattern) || question.match(macroPattern2);
    if (!match) return false;

    const rawTail = match[1].trim();

    // Extract instrument — support slash, concatenated, and common names
    const instrumentPattern = /\b(EUR[\s\/]?USD|GBP[\s\/]?USD|USD[\s\/]?JPY|AUD[\s\/]?USD|USD[\s\/]?CHF|USD[\s\/]?CAD|NZD[\s\/]?USD|EUR[\s\/]?GBP|EUR[\s\/]?JPY|BTC[\s\/]?USD|ETH[\s\/]?USD|XAU[\s\/]?USD|XAG[\s\/]?USD|SOL[\s\/]?USD|GOLD|BITCOIN|SPX|NDX|DXY|DAX)\b/i;
    const instrMatch = rawTail.match(instrumentPattern);
    if (!instrMatch) return false; // No instrument → let LLM ask

    // Normalize instrument (add slash if missing, map aliases)
    let instrument = instrMatch[0].toUpperCase().replace(/\s+/g, '');
    const aliasMap: Record<string, string> = { GOLD: 'XAU/USD', BITCOIN: 'BTC/USD' };
    if (aliasMap[instrument]) instrument = aliasMap[instrument];
    if (/^[A-Z]{6}$/.test(instrument)) instrument = instrument.slice(0, 3) + '/' + instrument.slice(3);

    const { sanitized, wasSanitized } = sanitizePoliticalContent(rawTail);

    // Build synthetic tool call
    const syntheticToolCall = {
      function: {
        name: 'launch_macro_lab',
        arguments: JSON.stringify({
          instrument,
          timeframe: 'H4',
          customNotes: sanitized
        })
      }
    };

    // If sanitized, add a note to messages
    if (wasSanitized) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '> *Note: framed as macro policy scenarios for objective market analysis.*'
      }]);
    }

    console.log('[AURA] Macro-lab intent intercepted client-side', {
      instrument, sanitizedPrompt: sanitized, wasSanitized
    });

    handleToolLaunch(syntheticToolCall, { collectOnly: false });
    return true;
  };

  const sendMessage = async (question: string) => {
    if (!question.trim()) return;

    setIsLoading(true);
    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Persist user message to Supabase (fire-and-forget for speed)
    persistUserMessage(question).catch(err => console.error('[AURA] persist user msg error:', err));

    // Fast-path: intercept "plot X last Yh Zmin" commands client-side
    if (tryInterceptPlotCommand(question)) return;
    // Fast-path: intercept explicit trade generator intent client-side (BEFORE macro)
    if (tryInterceptTradeGenerator(question)) return;
    // Fast-path: intercept explicit macro-lab intent client-side
    if (tryInterceptMacroLab(question)) return;

    try {
      // Include last 7 messages as conversation history (text only)
      const recentMessages = [...messages, userMsg].slice(-7).map(m => ({
        role: m.role,
        content: getMessageText(m)
      }));
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 90000)
      );

      const invokePromise = supabase.functions.invoke('aura', {
        body: { 
          question, 
          context: {
            page: context,
            data: contextData,
          },
          conversationHistory: recentMessages,
          sessionMemory: sessionMemory.current
        }
      });

      const result = await Promise.race([invokePromise, timeoutPromise]) as { data: any; error: any };

      if (result.error) {
        console.error('AURA invocation error:', result.error);
        
        if (result.error.message?.includes('429')) {
          toast({ title: t('aura.rateLimitReached'), description: t('aura.rateLimitDescription'), variant: 'destructive' });
          setMessages(prev => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
        
        if (result.error.message?.includes('402')) {
          toast({ title: t('aura.creditsRequired'), description: t('aura.creditsDescription'), variant: 'destructive' });
          setMessages(prev => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
        
        throw result.error;
      }

      const data = result.data;
      console.log("AURA received data:", data);

      // Handle tool calls
      if (data.toolCalls && data.toolCalls.length > 0) {
        console.log("AURA tool calls detected:", data.toolCalls);
        
        // BATCH MODE: Multiple tools for technical analysis
        if (data.toolCalls.length > 1) {
          console.log("🔄 Batch mode: Executing multiple tools");
          batchContextRef.current = { instrument: '' };
          
          for (const toolCall of data.toolCalls) {
            await handleToolLaunch(toolCall, { collectOnly: true });
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          if (batchContextRef.current) {
            const { instrument, priceSummary, indicatorSummary } = batchContextRef.current;
            const synthesisPrompt = `IMPORTANT: Tools have already been executed. DO NOT call any tools again. Use ONLY the data below to produce a structured technical analysis.

**Instrument**: ${instrument}

**Real-Time Prices**:
${priceSummary || 'Not available'}

**Technical Indicators**:
${indicatorSummary || 'Not available'}

Now provide a complete, structured technical analysis based on this data.`;

            batchContextRef.current = null;
            setTimeout(() => { sendMessage(synthesisPrompt); }, 500);
          }
          return;
        }
        
        // Single tool call
        const toolCall = data.toolCalls[0];
        await handleToolLaunch(toolCall, { collectOnly: false });
        return;
      }

      // Regular message response
      if (data.message) {
        const assistantMsg: Message = { role: 'assistant', content: data.message };
        setMessages(prev => [...prev, assistantMsg]);
        // Persist assistant message
        persistAssistantMessage(assistantMsg).catch(err => console.error('[AURA] persist assistant msg error:', err));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('AURA error:', error);
      let errorMessage = t('aura.errorDescription');
      if (error instanceof Error) {
        if (error.message === 'timeout') errorMessage = t('aura.timeout');
        else if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) errorMessage = t('aura.networkError');
      }
      toast({ title: t('aura.error'), description: errorMessage, variant: 'destructive' });
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolLaunch = async (toolCall: any, options: { collectOnly?: boolean } = {}) => {
    const { collectOnly = false } = options;
    const { name: functionName, arguments: args } = toolCall.function;
    
    let parsedArgs: any = {};
    try {
      parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
    } catch (e) {
      console.error("Failed to parse tool arguments:", e);
      toast({ title: 'Error', description: 'Unable to launch the request.', variant: 'destructive' });
      return;
    }

    const instrument = parsedArgs.instrument || '';
    // Normalize timeframe: LLM may return M15/M30/H1/H4 but registry expects 15min/30min/1h/4h
    const rawTf = (parsedArgs.timeframe || '4h').toUpperCase();
    const TIMEFRAME_ALIASES: Record<string, string> = {
      'M15': '15min', 'M30': '30min', 'H1': '1h', 'H4': '4h',
      '15M': '15min', '30M': '30min', '1H': '1h', '4H': '4h',
      '15MIN': '15min', '30MIN': '30min',
    };
    const timeframe = TIMEFRAME_ALIASES[rawTf] || parsedArgs.timeframe || '4h';
    const riskLevel = parsedArgs.riskLevel || 'medium';
    const strategy = parsedArgs.strategy || 'breakout';
    const positionSize = parsedArgs.positionSize || '2';
    const customNotes = parsedArgs.customNotes || '';
    
    // Save to session memory
    if (instrument) sessionMemory.current.lastInstrument = instrument;
    if (timeframe) sessionMemory.current.lastTimeframe = timeframe;
    sessionMemory.current.lastFeature = functionName;
    
    console.log('🚀 [AURA] Launching tool:', { functionName, instrument, parsedArgs, collectOnly });
    console.log('🧠 [AURA] Session memory updated:', sessionMemory.current);

    // Dev-only telemetry (will be populated after featureType is resolved)
    const logTelemetry = (resolvedFeatureType: string) => {
      if (import.meta.env.DEV) {
        const routeMap: Record<string, string> = {
          'trade_generator': '/trade-generator',
          'macro_lab': '/macro-lab',
          'reports': '/reports'
        };
        const featureKeyMap: Record<string, string> = {
          'trade_generator': 'TRADE_SETUP',
          'macro_lab': 'MACRO_COMMENTARY',
          'reports': 'REPORT'
        };
        const lastUserMsg = messages.length > 0 ? getMessageText(messages[messages.length - 1]) : '';
        console.log('🔍 [AURA Telemetry]', {
          intent_detected: functionName,
          user_phrase: lastUserMsg.slice(0, 100),
          resolved_feature_key: featureKeyMap[resolvedFeatureType] || resolvedFeatureType,
          tool_called: functionName,
          route_targeted: routeMap[resolvedFeatureType] || 'unknown',
          legacy_alias_used: ['launch_ai_trade_setup', 'launch_macro_commentary'].includes(functionName)
        });
      }
    };
    
    // Handle get_realtime_price separately
    if (functionName === 'get_realtime_price') {
      console.log("📊 Fetching real-time price data from Twelve Data");
      
      try {
        const { 
          instrument: priceInstrument, 
          dataType, 
          interval = '5min',
          start_date,
          end_date
        } = parsedArgs;

        if (!collectOnly) {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `${t('aura.fetchingData')} ${priceInstrument}...`
          }]);
        }

        const finalStartDate = start_date 
          ? start_date.split('T')[0] 
          : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const finalEndDate = end_date 
          ? end_date.split('T')[0] 
          : new Date().toISOString().split('T')[0];

        const { data: priceData, error: priceError } = await supabase.functions.invoke(
          'fetch-historical-prices',
          {
            body: {
              instrument: priceInstrument,
              startDate: finalStartDate,
              endDate: finalEndDate,
              interval: dataType === 'quote' ? '1day' : interval
            }
          }
        );

        if (priceError || !priceData?.data || priceData.data.length === 0) {
          const errorMsg = `${t('aura.dataFetchError')} ${priceInstrument}. ${priceError?.message || t('aura.noDataAvailable')}`;
          if (collectOnly && batchContextRef.current) {
            batchContextRef.current.priceSummary = errorMsg;
          } else {
            setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }]);
          }
          return;
        }

        const latestPrice = priceData.data[priceData.data.length - 1];
        const priceInfo = dataType === 'quote' 
          ? `Current price: ${latestPrice.close} (High: ${latestPrice.high}, Low: ${latestPrice.low})`
          : `Recent prices:\n${priceData.data.slice(-5).map((d: any) => 
              `- ${d.date}: Open ${d.open}, Close ${d.close}`
            ).join('\n')}`;

        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.instrument = priceInstrument;
          batchContextRef.current.priceSummary = priceInfo;
          return;
        }

        setMessages((prev) => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `**${t('aura.priceDataSuccess')} ${priceInstrument}**\n\n${priceInfo}\n\n${t('aura.analysisPrompt')}`
        }]);
        return;
      } catch (error) {
        const errorMsg = `${t('aura.dataRetrievalFailed')}`;
        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.priceSummary = errorMsg;
        } else {
          setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }]);
        }
        return;
      }
    }

    // Handle plot_price_chart — inline chart widget
    if (functionName === 'plot_price_chart') {
      console.log("📊 Plot price chart requested:", parsedArgs);
      
      try {
        const chartInstrument = parsedArgs.instrument || 'XAU/USD';
        const chartInterval = parsedArgs.interval || '15min';
        const lookbackHours = parsedArgs.lookback_hours || 24;

        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `Fetching ${chartInstrument} chart (last ${lookbackHours}h, ${chartInterval} candles)...`
        }]);

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - lookbackHours * 60 * 60 * 1000);

        const { data: chartData, error: chartError } = await supabase.functions.invoke(
          'fetch-historical-prices',
          {
            body: {
              instrument: chartInstrument,
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
              interval: chartInterval,
              extendDays: 0
            }
          }
        );

        if (chartError || !chartData?.data || chartData.data.length === 0) {
          setMessages((prev) => [...prev.slice(0, -1), {
            role: 'assistant',
            content: `Could not fetch chart data for ${chartInstrument}. ${chartError?.message || 'No data available for this period.'}`
          }]);
          return;
        }

        // Transform to OHLC format for MarketChartWidget
        const ohlcData = chartData.data.map((d: any) => ({
          time: d.datetime || d.date,
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
        })).filter((d: any) => d.time && !isNaN(d.open)).sort((a: any, b: any) => a.time.localeCompare(b.time));

        if (ohlcData.length === 0) {
          setMessages((prev) => [...prev.slice(0, -1), {
            role: 'assistant',
            content: `No valid OHLC data returned for ${chartInstrument}.`
          }]);
          return;
        }

        // Calculate summary stats
        const latestCandle = ohlcData[ohlcData.length - 1];
        const firstCandle = ohlcData[0];
        const periodHigh = Math.max(...ohlcData.map((d: any) => d.high));
        const periodLow = Math.min(...ohlcData.map((d: any) => d.low));
        const pctChange = ((latestCandle.close - firstCandle.open) / firstCandle.open * 100).toFixed(2);
        const changeSign = Number(pctChange) >= 0 ? '+' : '';

        const lookbackLabel = lookbackHours >= 168 ? `${Math.round(lookbackHours / 24)} days` :
                              lookbackHours >= 24 ? `${Math.round(lookbackHours / 24)} day${Math.round(lookbackHours / 24) > 1 ? 's' : ''}` :
                              `${lookbackHours} hours`;

        const summaryText = `**${chartInstrument}** — Last ${lookbackLabel} (${chartInterval} candles)\n\n` +
          `**Current:** ${latestCandle.close.toFixed(latestCandle.close > 100 ? 2 : 5)} | ` +
          `**High:** ${periodHigh.toFixed(periodHigh > 100 ? 2 : 5)} | ` +
          `**Low:** ${periodLow.toFixed(periodLow > 100 ? 2 : 5)} | ` +
          `**Change:** ${changeSign}${pctChange}%`;

        // Set message with chart attachment
        setMessages((prev) => [...prev.slice(0, -1), {
          role: 'assistant',
          content: summaryText,
          attachments: [{
            type: 'market_chart' as const,
            payload: {
              mode: 'candlestick',
              data: { ohlc: ohlcData },
              instrument: chartInstrument,
              timeframe: chartInterval
            }
          }]
        }]);

        return;
      } catch (error) {
        console.error('Plot price chart error:', error);
        setMessages((prev) => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `Failed to fetch chart data. Please try again.`
        }]);
        return;
      }
    }

    // Handle get_technical_indicators separately
    if (functionName === 'get_technical_indicators') {
      console.log("📈 Fetching technical indicators from Twelve Data");
      
      try {
        const { 
          instrument: techInstrument, 
          indicators = ['rsi'], 
          time_period = 14, 
          interval = '1day',
          start_date,
          end_date,
          outputsize = 30
        } = parsedArgs;

        if (!collectOnly) {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `${t('aura.fetchingData')} ${techInstrument} (${indicators.join(', ')}...`
          }]);
        }

        const { data: techData, error: techError } = await supabase.functions.invoke(
          'fetch-technical-indicators',
          {
            body: { instrument: techInstrument, indicators, time_period, interval, start_date, end_date, outputsize }
          }
        );

        if (techError || !techData?.indicators) {
          const errorMsg = `${t('aura.indicatorsError')} ${techInstrument}. ${techError?.message || t('aura.noDataAvailable')}`;
          if (collectOnly && batchContextRef.current) {
            batchContextRef.current.indicatorSummary = errorMsg;
          } else {
            setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }]);
          }
          return;
        }

        let indicatorSummary = '';
        Object.entries(techData.indicators).forEach(([indicator, data]: [string, any]) => {
          if (data.values && data.values.length > 0) {
            const latest = data.values[0];
            const value = latest[indicator];
            indicatorSummary += `**${indicator.toUpperCase()}**: ${value}\n`;
          }
        });

        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.instrument = techInstrument;
          batchContextRef.current.indicatorSummary = indicatorSummary;
          return;
        }

        setMessages((prev) => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `**Technical Indicators for ${techInstrument}**\n\n${indicatorSummary}\nWould you like a full analysis of these indicators?`
        }]);
        return;
      } catch (error) {
        const errorMsg = "Failed to retrieve technical indicators. Please try again.";
        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.indicatorSummary = errorMsg;
        } else {
          setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }]);
        }
        return;
      }
    }

    // Map tool function to feature type via registry
    const featureId = resolveFeatureId(functionName);
    if (!featureId) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `${t('toasts:aura.unknownAction')}\n\n${t('toasts:aura.availableActions')}\n\n${t('toasts:aura.reformulateRequest', { instrument: instrument || 'the market' })}` }
      ]);
      return;
    }

    const feature = FEATURE_REGISTRY[featureId];
    const featureType = feature.featureId;
    const creditType = feature.creditType;

    try {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('toasts:aura.launchingRequest', { instrument }) },
      ]);
      setActiveJobId('pending');

      // Log telemetry before launching
      logTelemetry(featureType);


      // Build payload using registry (same structure as the actual page)
      const dbFeature = feature.dbFeature;
      const jobId = await createJob(
        featureType,
        instrument,
        { type: featureType, source: 'aura' },
        dbFeature
      );

      // Build the full payload AFTER we have jobId
      const requestPayload = feature.buildPayload({
        instrument, timeframe, riskLevel, strategy, customNotes,
        question: customNotes || undefined,
        jobId,
        userEmail: user?.email,
      });

      const creditResult = await tryEngageCredit(creditType, jobId);
      if (!creditResult.success) {
        await supabase.from('jobs').delete().eq('id', jobId);
        toast({ title: "Insufficient Credits", description: "You've run out of credits.", variant: "destructive" });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: "You've run out of credits. Please recharge to continue using AlphaLens." }
        ]);
        setActiveJobId(null);
        return;
      }

      setActiveJobId(jobId);
      const jobCreatedAt = Date.now();
      setJobBadges((prev) => [
        ...prev,
        { jobId, type: featureType, instrument, status: 'pending', createdAt: new Date() }
      ]);

      // Subscribe to realtime updates
      const channel = supabase
        .channel(`aura-job-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => {
            const job = payload.new as any;
            
            setJobBadges((prev) =>
              prev.map((badge) =>
                badge.jobId === job.id ? { ...badge, status: job.status } : badge
              )
            );

            if (job.status === 'completed' && job.response_payload) {
              let parsedPayload = job.response_payload;
              if (typeof job.response_payload === 'string') {
                try {
                  parsedPayload = JSON.parse(job.response_payload);
                } catch (parseError) {
                  setMessages((prev) => [
                    ...prev.slice(0, -1),
                    { role: 'assistant', content: t('toasts:aura.dataFormatError', { instrument }) },
                  ]);
                  setActiveJobId(null);
                  supabase.removeChannel(channel);
                  return;
                }
              }
              
              // Build rich mini-widget message using registry parser
              let richContent: Message['content'];

              const parsed = feature.parseResponse(parsedPayload);
              const widgetData = parsed?.data || parsedPayload;
              const summaryText = generateNaturalSummary(featureType, widgetData, instrument);

              // Store result for "Open in page" preloading
              storeResultForPage(featureType, jobId, parsedPayload);

              const typeMap: Record<FeatureId, string> = {
                trade_generator: 'trade_setup',
                macro_lab: 'macro_commentary',
                reports: 'report',
              };

              // Truncate rawJson to 100KB max
              let rawJsonStr: string | undefined;
              try {
                const full = JSON.stringify(parsedPayload, null, 2);
                rawJsonStr = full.length > 100_000 ? full.slice(0, 100_000) + '\n... (truncated)' : full;
              } catch { /* ignore serialization errors */ }

              richContent = {
                type: typeMap[featureType],
                data: widgetData,
                summary: summaryText,
                rawJson: rawJsonStr,
                meta: {
                  featureId: featureType,
                  instrument,
                  elapsedMs: Date.now() - jobCreatedAt,
                },
              };

              // Extract chart attachments
              const chartAttachment = extractMarketAttachments(parsedPayload);
              const attachments = chartAttachment ? [chartAttachment] : undefined;

              jobCompletedRef.current.add(jobId);
              setTimeout(() => jobCompletedRef.current.delete(jobId), 5000);

              const completedMsg: Message = { role: 'assistant', content: richContent, attachments };
              setMessages((prev) => [
                ...prev.slice(0, -1),
                completedMsg,
              ]);
              // Persist completed tool result
              persistAssistantMessage(completedMsg).catch(err => console.error('[AURA] persist tool result error:', err));
              
              // Result renders in-chat; no toast needed
              
              setActiveJobId(null);
              supabase.removeChannel(channel);
              
              // Check for pending commands
              if (pendingCommands.current.length > 0) {
                const nextCmd = pendingCommands.current.shift()!;
                setTimeout(() => sendMessage(nextCmd), 1000);
              }
              
            } else if (job.status === 'error') {
              const errorMsg = job.error_message || "Unknown error occurred.";
              let userMessage = `${t('toasts:aura.processingFailed', { instrument })}\n\n`;
              
              if (errorMsg.toLowerCase().includes('timeout')) userMessage += t('toasts:aura.timeoutError');
              else if (errorMsg.toLowerCase().includes('rate limit')) userMessage += t('toasts:aura.rateLimitError');
              else if (errorMsg.toLowerCase().includes('no data')) userMessage += t('toasts:aura.noDataError');
              else if (errorMsg.toLowerCase().includes('credit')) userMessage += t('toasts:aura.creditError');
              else userMessage += `Details: ${errorMsg}`;

              // Build raw error JSON
              let errorRawJson: string | undefined;
              try {
                errorRawJson = JSON.stringify({
                  status: 'error',
                  error_message: errorMsg,
                  job_id: job.id,
                  response_payload: job.response_payload,
                }, null, 2);
              } catch { /* ignore */ }

              const errorRichContent: RichContent = {
                type: 'tool_error',
                data: null,
                summary: userMessage,
                rawJson: errorRawJson,
                meta: {
                  featureId: featureType,
                  instrument,
                  elapsedMs: Date.now() - jobCreatedAt,
                },
              };
              
              jobCompletedRef.current.add(jobId);
              setTimeout(() => jobCompletedRef.current.delete(jobId), 5000);

              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: errorRichContent },
              ]);
              
              toast({ title: t('toasts:aura.analysisFailedTitle'), description: errorMsg, variant: "destructive", duration: 7000 });
              setActiveJobId(null);
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

      // Route to correct backend: macro-lab-proxy for trade_generator & macro_lab, n8n for reports
      // Use registry endpoint (no more hardcoded URLs)
      const endpointUrl = feature.endpoint;

      console.log('📊 [AURA] Sending request:', { jobId, instrument, endpoint: endpointUrl, featureType });

      // FIX: Don't race-timeout. Instead, fire the request and attach a background
      // handler that updates the job on HTTP success (same as the page does).
      // The Realtime listener above will pick up the job update.
      const requestPromise = enhancedPostRequest(
        endpointUrl,
        requestPayload,
        {
          enableJobTracking: true,
          jobType: featureType,
          instrument: instrument,
          feature: dbFeature,
          jobId: jobId
        }
      );

      // Background handler: when HTTP completes, update job in Supabase
      // (mirrors ForecastTradeGenerator.tsx line 1877-1883)
      requestPromise.then(async ({ response }) => {
        try {
          if (response.ok) {
            const data = await response.json();
            console.log('✅ [AURA HTTP] Response received for job:', jobId, 'status:', response.status);
            // Update job — Realtime listener will fire and render the result
            if (!jobCompletedRef.current.has(jobId)) {
              await supabase.from('jobs').update({
                status: 'completed',
                response_payload: data
              }).eq('id', jobId);
              console.log('✅ [AURA] Job marked as completed via HTTP response:', jobId);
            }
          } else {
            const errorText = await response.text();
            console.error('❌ [AURA HTTP] Non-OK response:', response.status, errorText.slice(0, 200));
            if (!jobCompletedRef.current.has(jobId)) {
              await supabase.from('jobs').update({ status: 'error' }).eq('id', jobId);
            }
          }
        } catch (parseErr) {
          console.error('❌ [AURA HTTP] Failed to process response:', parseErr);
          if (!jobCompletedRef.current.has(jobId)) {
            await supabase.from('jobs').update({ status: 'error' }).eq('id', jobId);
          }
        }
      }).catch((httpError) => {
        console.error('❌ [AURA HTTP] Request failed:', httpError);
        // Network error — don't touch the channel, Realtime may still deliver
      });

      // Show "request launched" immediately (don't await the HTTP)
      if (!jobCompletedRef.current.has(jobId)) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Request launched for ${instrument}. Waiting for result...` },
        ]);
      }
      // No toast — status shown in-chat

    } catch (error) {
      console.error('❌ [AURA] Failed to launch job:', error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `Error launching the request.` },
      ]);
      toast({ title: 'Error', description: 'Unable to launch the request.', variant: 'destructive' });
      setActiveJobId(null);
    }
  };

  const handleQuickAction = (question: string) => { sendMessage(question); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleCTAClick = (query: string) => {
    setInput(query);
    setShowTeaser(false);
    onToggle();
    setTimeout(() => sendMessage(query), 300);
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onToggle}
          className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] hover:scale-110 transition-all duration-300"
          aria-label="Open AURA"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        {currentTeaser && (
          <AURATeaser
            teaser={currentTeaser}
            onCTAClick={handleCTAClick}
            onDismiss={() => { setShowTeaser(false); setTeaserDismissed(true); }}
            isVisible={showTeaser}
          />
        )}
      </div>
    );
  }

  const quickActions = QUICK_ACTIONS[context] || QUICK_ACTIONS.default;

  // Shared conversation column (messages + input)
  const conversationColumn = (
    <div className="flex-1 flex flex-col min-w-0 h-full relative">
      {/* Header */}
      <CardHeader className="shrink-0 bg-[#0F172A] border-b border-[#374151]/30 px-3 py-2">
        <div className={cn(
          "flex items-center justify-between gap-2 w-full",
          isFullscreen && "max-w-[760px] mx-auto"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            {/* Menu icon for overlay sidebar (reduced mode only) */}
            {!isFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowHistory(!showHistory); refreshThreadList(); }}
                className="hover:bg-primary/10 h-8 w-8 min-h-0 min-w-0 p-0 shrink-0"
                aria-label="History"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <div className={cn(
              "bg-white rounded-lg flex items-center justify-center shadow-lg p-0.5 shrink-0",
              isFullscreen ? "w-9 h-9" : "w-8 h-8"
            )}>
              <img src="/lovable-uploads/56d2c4af-fb26-47d8-8419-779a1da01775.png" alt="alphaLens.ai" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <CardTitle className={cn(
                "bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent leading-tight",
                isFullscreen ? "text-lg" : "text-base"
              )}>
                AURA
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                {activeThread?.title && activeThread.title !== 'New Chat' ? activeThread.title : 'Research Assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {!isFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewChat}
                className="hover:bg-primary/10 h-8 w-8 min-h-0 min-w-0 p-0"
                aria-label="New chat"
                title="New Chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hover:bg-primary/10 h-8 w-8 min-h-0 min-w-0 p-0"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsFullscreen(false); onToggle(); }}
              className="hidden md:flex hover:bg-primary/10 h-8 w-8 min-h-0 min-w-0 p-0"
              aria-label="Collapse to side"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsFullscreen(false); onToggle(); }}
              className="md:hidden hover:bg-primary/10 h-8 w-8 min-h-0 min-w-0 p-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Overlay history for reduced mode */}
      {!isFullscreen && showHistory && (
        <AURAHistoryPanel
          threads={threads}
          activeThreadId={activeThread?.id}
          onSelectThread={(id) => { loadThread(id); setShowHistory(false); }}
          onNewChat={() => { createNewChat(); setShowHistory(false); }}
          onDeleteThread={deleteThreadById}
          mode="overlay"
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="max-w-[760px] mx-auto">
          {messages.length === 0 && (
            <div className="space-y-4 flex flex-col items-center justify-center min-h-[40vh]">
              <p className="text-sm text-[#6b7280] text-center">
                Your contextual market intelligence companion for {context}.
              </p>
              
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCollectivePanel(!showCollectivePanel)}
                  className="gap-2 text-[#6b7280] hover:text-[#e5e7eb] border-0"
                >
                  <Globe className="h-4 w-4" />
                  {showCollectivePanel ? 'Hide' : 'Show'} Collective Intelligence
                </Button>
              </div>

              {showCollectivePanel && (
                <AURACollectivePanel 
                  onInsightClick={(insight) => {
                    setInput(insight);
                    setShowCollectivePanel(false);
                  }}
                />
              )}
              
              <div className="space-y-2 w-full max-w-2xl">
                <p className="text-xs font-semibold text-[#4b5563]">Quick Actions:</p>
                {quickActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 px-3 text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-white/[0.04] border-0"
                    onClick={() => handleQuickAction(action)}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex animate-in fade-in-50 duration-300 mt-3 mb-0',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                 className={cn(
                    'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
                    msg.role === 'user'
                      ? 'max-w-[680px] rounded-2xl px-4 py-3 bg-[#1F2937] text-[#F3F4F6]'
                      : 'max-w-[680px] rounded-2xl px-4 py-3 bg-[#111827] text-[#d1d5db]'
                  )}
                >
                  {renderMessageContent(msg)}
                </div>
              </div>
            ))}

            {jobBadges.map((badge) => (
              <div key={badge.jobId} className="flex justify-center my-2">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    {
                      "bg-yellow-100 text-yellow-800 animate-pulse": badge.status === 'pending',
                      "bg-blue-100 text-blue-800 animate-pulse": badge.status === 'running',
                      "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200": badge.status === 'completed',
                      "bg-red-100 text-red-800": badge.status === 'error'
                    }
                  )}
                  onClick={() => {
                    if (badge.status === 'completed') {
                      const routes: Record<string, string> = {
                        trade_generator: '/trade-generator',
                        macro_lab: '/macro-lab',
                        reports: '/reports'
                      };
                      navigate(routes[badge.type]);
                      onToggle();
                    }
                  }}
                >
                  {badge.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {badge.status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {badge.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                  {badge.status === 'error' && <XCircle className="h-4 w-4" />}
                  
                  <span>
                    {badge.status === 'pending' && `Queuing ${badge.instrument}...`}
                    {badge.status === 'running' && `Processing ${badge.instrument}...`}
                    {badge.status === 'completed' && `✅ ${badge.instrument} ready — click to view`}
                    {badge.status === 'error' && `❌ ${badge.instrument} failed`}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#6b7280]" />
                  <span className="text-sm text-[#6b7280]">
                    {activeJobId ? 'Launching...' : 'Analyzing...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {showScrollButton && messages.length > 0 && (
            <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollToBottom}
                className="pointer-events-auto shadow-lg hover:shadow-xl transition-all duration-200 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 px-4"
                aria-label="Scroll to bottom"
              >
                <ChevronDown className="h-4 w-4" />
                <span className="text-xs">Latest</span>
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 px-4 pb-6 pt-4 bg-[#0F172A] border-t border-[#374151]/30">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-[760px] mx-auto">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-[#111827] shadow-[0_2px_12px_rgba(0,0,0,0.4)] px-4 h-14">
            <Search className="h-4 w-4 text-[#4b5563] shrink-0" />
            <Badge variant="secondary" className="text-[10px] bg-white/5 text-[#6b7280] border-0 shrink-0 px-2 py-0.5">
              AURA v2
            </Badge>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AURA anything..."
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-12 text-base placeholder:text-white/30"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            size="icon"
            className="rounded-full h-12 w-12 bg-gradient-to-r from-primary to-primary/80"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[10003] bg-black/50 backdrop-blur-sm" 
          onClick={() => setIsFullscreen(false)} 
        />
      )}

      <div className={cn(
        "fixed shadow-2xl flex transition-all duration-300 bg-[#0F172A]",
        isFullscreen
          ? "inset-0 z-[10004] flex-row animate-in fade-in slide-in-from-bottom-4 duration-300"
          : "right-0 top-0 h-full w-full md:w-1/3 z-40 border-l border-[#374151]/40 flex-col"
      )}>
        {/* Collapsible sidebar in fullscreen */}
        {isFullscreen && (
          <AURAHistoryPanel
            threads={threads}
            activeThreadId={activeThread?.id}
            onSelectThread={(id) => { loadThread(id); }}
            onNewChat={createNewChat}
            onDeleteThread={deleteThreadById}
            mode="sidebar"
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          />
        )}

        {conversationColumn}
      </div>
    </>
  );
}
