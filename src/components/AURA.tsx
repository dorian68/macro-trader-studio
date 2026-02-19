import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, ChevronRight, Send, Loader2, CheckCircle, XCircle, Globe, ChevronDown, Maximize2, Minimize2, ArrowUpRight, Search, Code, Copy } from 'lucide-react';
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
import { FEATURE_REGISTRY, resolveFeatureId, storeResultForPage } from '@/lib/auraFeatureRegistry';
import type { FeatureId } from '@/lib/auraFeatureRegistry';
import auraLogo from '@/assets/aura-logo.png';

interface AURAProps {
  context: string;
  isExpanded: boolean;
  onToggle: () => void;
  contextData?: import('@/lib/auraMessages').AURAContextData;
}

interface RichContent {
  type: string;
  data: any;
  summary: string;
  rawJson?: string;
  meta?: {
    featureId: string;
    instrument: string;
    elapsedMs?: number;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string | RichContent;
  attachments?: Array<{ type: 'market_chart'; payload: any }>;
}

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
      const execSummary = data?.executive_summary || data?.summary || data?.content?.executive_summary || '';
      const bias = data?.directional_bias || data?.content?.directional_bias || '';
      const biasConfidence = data?.confidence || data?.content?.confidence;
      const drivers = data?.key_drivers || data?.content?.key_drivers || [];
      const fundamentals = data?.fundamental_analysis || data?.content?.fundamental_analysis || '';

      let summary = `### Macro Analysis: ${instrument}\n\n`;
      if (typeof execSummary === 'string' && execSummary) {
        summary += execSummary.slice(0, 500) + '\n\n';
      }
      if (bias) {
        summary += `**Directional Bias:** ${bias}`;
        if (biasConfidence) summary += ` (${Math.round(Number(biasConfidence) * 100)}% confidence)`;
        summary += '\n\n';
      }
      if (Array.isArray(drivers) && drivers.length > 0) {
        summary += '**Key Drivers:**\n';
        drivers.slice(0, 6).forEach((d: any) => {
          summary += `- ${typeof d === 'string' ? d : d?.name || d?.driver || JSON.stringify(d)}\n`;
        });
        summary += '\n';
      }
      if (typeof fundamentals === 'string' && fundamentals) {
        summary += fundamentals.slice(0, 300) + '\n';
      }
      return summary;
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
    if (Array.isArray(ohlcSource) && ohlcSource.length > 2 && ohlcSource[0]?.open != null) {
      const ohlc = ohlcSource.map((d: any) => ({
        time: d.datetime || d.date || d.time || d.ds,
        open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close),
      })).filter((d: any) => d.time && !isNaN(d.open));
      if (ohlc.length > 2) {
        // Check for trade markers (entry/sl/tp)
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

export default function AURA({ context, isExpanded, onToggle, contextData }: AURAProps) {
  const [messages, setMessages] = useState<Message[]>([]);
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
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
        setTimeout(() => {
          const isNearBottom = 
            scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
          setShowScrollButton(!isNearBottom);
        }, 300);
      }
    }
  }, [messages, jobBadges, isLoading]);

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

  // Save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const serializable = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      localStorage.setItem('aura-conversation', JSON.stringify(serializable.slice(-7)));
    }
  }, [messages]);

  // Restore conversation from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('aura-conversation');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m })));
      } catch (e) {
        console.error('Failed to restore AURA conversation:', e);
      }
    }
  }, []);

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
                  ? "text-[15px] leading-relaxed text-[#c8c8c8] before:content-['•'] before:mr-3 before:text-[#555]" 
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
          isFullscreen ? "text-[15px] font-semibold mt-3 mb-1 text-white" : "text-sm font-bold mt-2 mb-1"
        )}>{renderInline(line.slice(4))}</h4>);
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(<h3 key={idx} className={cn(
          isFullscreen ? "text-base font-semibold mt-4 mb-1.5 text-white" : "text-base font-bold mt-3 mb-1"
        )}>{renderInline(line.slice(3))}</h3>);
      } else if (line.startsWith('# ')) {
        flushList();
        elements.push(<h2 key={idx} className={cn(
          isFullscreen ? "text-lg font-semibold mt-4 mb-1.5 text-white" : "text-lg font-bold mt-3 mb-1"
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
          isFullscreen ? "text-[15px] leading-relaxed text-[#c8c8c8]" : "text-sm leading-relaxed"
        )}>{renderInline(line)}</p>);
      }
    });
    flushList();
    return <div className={cn(isFullscreen ? "space-y-1.5" : "space-y-0.5")}>{elements}</div>;
  }, [isFullscreen]);

  // ===== MINI-WIDGET COMPONENTS =====
  const AuraMiniTradeSetup = ({ data }: { data: any }) => {
    const setup = data?.setups?.[0] || data;
    const instrument = data?.instrument || setup?.instrument || 'N/A';
    const direction = setup?.direction || 'N/A';
    const entry = setup?.entryPrice || setup?.entry_price || setup?.entry;
    const sl = setup?.stopLoss || setup?.stop_loss || setup?.sl;
    const tp = setup?.takeProfits?.[0] || setup?.takeProfit || setup?.take_profit || setup?.tp;
    const rr = setup?.riskRewardRatio || setup?.risk_reward_ratio;
    const confidence = setup?.strategyMeta?.confidence || setup?.confidence;

    return (
      <div className="border border-border rounded-lg p-3 bg-card/50 space-y-2 mt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{instrument}</span>
          <Badge variant={direction?.toLowerCase() === 'short' ? 'destructive' : 'default'} className="text-xs">
            {direction}
          </Badge>
          {confidence && (
            <Badge variant="outline" className="text-xs">{Math.round(confidence * 100)}%</Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {entry && <div><span className="text-muted-foreground">Entry</span><br /><span className="font-mono font-semibold">{Number(entry).toFixed(4)}</span></div>}
          {sl && <div><span className="text-muted-foreground">SL</span><br /><span className="font-mono text-destructive">{Number(sl).toFixed(4)}</span></div>}
          {tp && <div><span className="text-muted-foreground">TP</span><br /><span className="font-mono text-green-500">{Number(tp).toFixed(4)}</span></div>}
        </div>
        {rr && <p className="text-xs text-muted-foreground">R:R {Number(rr).toFixed(2)}</p>}
        <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => {
          storeResultForPage('trade_generator', data?.jobId || '', data);
          navigate(FEATURE_REGISTRY.trade_generator.pageRoute);
          onToggle();
        }}>
          <ArrowUpRight className="h-3 w-3" /> Open Full View
        </Button>
      </div>
    );
  };

  const AuraMiniMacro = ({ data }: { data: any }) => {
    const summary = data?.executive_summary || data?.summary || data?.content?.executive_summary || '';
    const truncated = typeof summary === 'string' ? summary.slice(0, 200) : '';
    const drivers = data?.key_drivers || data?.content?.key_drivers || [];

    return (
      <div className="border border-border rounded-lg p-3 bg-card/50 space-y-2 mt-2">
        <p className="text-xs leading-relaxed">{truncated}{truncated.length >= 200 ? '...' : ''}</p>
        {Array.isArray(drivers) && drivers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {drivers.slice(0, 4).map((d: any, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">{typeof d === 'string' ? d : d?.name || d?.driver || 'Driver'}</Badge>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => {
          storeResultForPage('macro_lab', data?.jobId || '', data);
          navigate(FEATURE_REGISTRY.macro_lab.pageRoute);
          onToggle();
        }}>
          <ArrowUpRight className="h-3 w-3" /> Open Full View
        </Button>
      </div>
    );
  };

  const AuraMiniReport = ({ data }: { data: any }) => {
    const title = data?.title || data?.report_title || 'Market Report';
    const summary = data?.executive_summary || data?.summary || '';
    const truncated = typeof summary === 'string' ? summary.slice(0, 150) : '';

    return (
      <div className="border border-border rounded-lg p-3 bg-card/50 space-y-2 mt-2">
        <p className="text-sm font-semibold">{title}</p>
        {truncated && <p className="text-xs text-muted-foreground">{truncated}{truncated.length >= 150 ? '...' : ''}</p>}
        <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => {
          storeResultForPage('reports', data?.jobId || '', data);
          navigate(FEATURE_REGISTRY.reports.pageRoute);
          onToggle();
        }}>
          <ArrowUpRight className="h-3 w-3" /> Open Full View
        </Button>
      </div>
    );
  };

  // ===== RENDER MESSAGE CONTENT =====
  const renderMessageContent = (msg: Message) => {
    const chartAttachments = msg.attachments?.filter(a => a.type === 'market_chart') || [];

    if (typeof msg.content === 'string') {
      if (msg.role === 'assistant') {
        return <div className="text-[15px] leading-relaxed">{renderMarkdown(msg.content)}</div>;
      }
      return <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
    }

    const rich = msg.content as RichContent;

    return (
      <div className="text-[15px] leading-relaxed">
        {/* 1. Natural language summary (markdown) */}
        {rich.summary && <div className="mb-2">{renderMarkdown(rich.summary)}</div>}

        {/* Metadata line */}
        {rich.meta && (
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
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
        {chartAttachments.map((att, i) => (
          <MarketChartWidget
            key={i}
            data={att.payload.data}
            instrument={att.payload.instrument}
            timeframe={att.payload.timeframe}
            fullscreen={isFullscreen}
          />
        ))}

        {/* 3. Mini-widget (Trade Card / Macro Card / Report) */}
        {rich.type === 'trade_setup' && <AuraMiniTradeSetup data={rich.data} />}
        {rich.type === 'macro_commentary' && <AuraMiniMacro data={rich.data} />}
        {rich.type === 'report' && <AuraMiniReport data={rich.data} />}
        {rich.type === 'tool_error' && (
          <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5 mt-2">
            <p className="text-sm text-destructive font-medium">Tool Error</p>
          </div>
        )}

        {/* 4. Collapsible raw JSON */}
        {rich.rawJson && (
          <Collapsible className="mt-2">
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

  const sendMessage = async (question: string) => {
    if (!question.trim()) return;

    setIsLoading(true);
    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      // Include last 7 messages as conversation history (text only)
      const recentMessages = [...messages, userMsg].slice(-7).map(m => ({
        role: m.role,
        content: getMessageText(m)
      }));
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30000)
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
            const synthesisPrompt = `IMPORTANT: Les outils ont déjà été exécutés. N'APPELLE PAS d'outils à nouveau. Utilise UNIQUEMENT les données ci-dessous pour produire une analyse technique structurée.

**Instrument**: ${instrument}

**Prix en Temps Réel**:
${priceSummary || 'Non disponible'}

**Indicateurs Techniques**:
${indicatorSummary || 'Non disponible'}

Fournis maintenant une analyse technique complète et structurée basée sur ces données.`;

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
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
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
        { role: 'assistant', content: `❌ ${errorMessage}` },
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
      toast({ title: 'Erreur', description: 'Impossible de lancer la requête.', variant: 'destructive' });
      return;
    }

    const instrument = parsedArgs.instrument || '';
    const timeframe = parsedArgs.timeframe || '4h';
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
            content: `📊 ${t('aura.fetchingData')} ${priceInstrument}...`
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
          const errorMsg = `⚠️ ${t('aura.dataFetchError')} ${priceInstrument}. ${priceError?.message || t('aura.noDataAvailable')}`;
          if (collectOnly && batchContextRef.current) {
            batchContextRef.current.priceSummary = errorMsg;
          } else {
            setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }]);
          }
          return;
        }

        const latestPrice = priceData.data[priceData.data.length - 1];
        const priceInfo = dataType === 'quote' 
          ? `Prix actuel: ${latestPrice.close} (Haut: ${latestPrice.high}, Bas: ${latestPrice.low})`
          : `Prix récents:\n${priceData.data.slice(-5).map((d: any) => 
              `- ${d.date}: Ouverture ${d.open}, Clôture ${d.close}`
            ).join('\n')}`;

        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.instrument = priceInstrument;
          batchContextRef.current.priceSummary = priceInfo;
          return;
        }

        setMessages((prev) => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `📊 **${t('aura.priceDataSuccess')} ${priceInstrument}**\n\n${priceInfo}\n\n${t('aura.analysisPrompt')}`
        }]);
        return;
      } catch (error) {
        const errorMsg = `❌ ${t('aura.dataRetrievalFailed')}`;
        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.priceSummary = errorMsg;
        } else {
          setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }]);
        }
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
            content: `📈 ${t('aura.fetchingData')} ${techInstrument} (${indicators.join(', ')})...`
          }]);
        }

        const { data: techData, error: techError } = await supabase.functions.invoke(
          'fetch-technical-indicators',
          {
            body: { instrument: techInstrument, indicators, time_period, interval, start_date, end_date, outputsize }
          }
        );

        if (techError || !techData?.indicators) {
          const errorMsg = `⚠️ ${t('aura.indicatorsError')} ${techInstrument}. ${techError?.message || t('aura.noDataAvailable')}`;
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
            indicatorSummary += `✅ **${indicator.toUpperCase()}**: ${value}\n`;
          }
        });

        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.instrument = techInstrument;
          batchContextRef.current.indicatorSummary = indicatorSummary;
          return;
        }

        setMessages((prev) => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `📊 **Indicateurs Techniques pour ${techInstrument}**\n\n${indicatorSummary}\n\n✨ Souhaitez-vous une analyse complète de ces indicateurs ?`
        }]);
        return;
      } catch (error) {
        const errorMsg = "❌ Échec de la récupération des indicateurs techniques. Veuillez réessayer.";
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
        { type: featureType },
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
          { role: 'assistant', content: "❌ You've run out of credits. Please recharge to continue using AlphaLens." }
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

              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: richContent, attachments },
              ]);
              
              toast({ 
                title: t('toasts:aura.analysisCompletedTitle'), 
                description: t('toasts:aura.analysisCompletedDescription', {
                  type: featureType === 'trade_generator' ? 'Trade Generator' :
                        featureType === 'macro_lab' ? 'Macro Labs' : 'report',
                  instrument
                }),
                duration: 5000
              });
              
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

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('HTTP_TIMEOUT')), 25000)
        );
        
          const requestPromise = enhancedPostRequest(
          endpointUrl,
          requestPayload,
          {
            enableJobTracking: true,
            jobType: featureType, // 'trade_generator' | 'macro_lab' | 'reports'
            instrument: instrument,
            feature: dbFeature,
            jobId: jobId
          }
        );
        
        await Promise.race([requestPromise, timeoutPromise]);
      } catch (httpError: any) {
        if (httpError.message === 'HTTP_TIMEOUT') {
          console.log('⏱️ [AURA HTTP] Timeout HTTP (expected), continuing with Realtime listener...');
        } else {
          supabase.removeChannel(channel);
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: t('toasts:aura.cannotContactServer') },
          ]);
          toast({ title: t('toasts:aura.networkErrorTitle'), description: t('toasts:aura.cannotSendRequest'), variant: "destructive" });
          setActiveJobId(null);
          return;
        }
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `✅ Requête lancée pour ${instrument}. Vous pouvez suivre la progression dans les notifications en bas à droite.` },
      ]);
      toast({ title: 'Requête Lancée', description: `Votre analyse pour ${instrument} est en cours...` });

    } catch (error) {
      console.error('❌ [AURA] Failed to launch job:', error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `❌ Erreur lors du lancement de la requête.` },
      ]);
      toast({ title: 'Erreur', description: 'Impossible de lancer la requête.', variant: 'destructive' });
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

  return (
    <>
      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[10003] bg-black/40 backdrop-blur-sm" 
          onClick={() => setIsFullscreen(false)} 
        />
      )}

      <div className={cn(
       "fixed shadow-2xl flex flex-col transition-all duration-300 bg-[#0e1116]",
        isFullscreen
          ? "inset-0 z-[10004] animate-in fade-in slide-in-from-bottom-4 duration-300"
          : "right-0 top-0 h-full w-full md:w-1/3 z-40 border-l border-white/[0.06]"
      )}>
        {/* Header */}
        <CardHeader className="shrink-0 bg-[#0e1116] border-b border-white/[0.03]">
          <div className={cn("flex items-start justify-between", isFullscreen && "max-w-5xl mx-auto w-full")}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "bg-white rounded-xl flex items-center justify-center shadow-lg p-1",
                isFullscreen ? "w-12 h-12" : "w-10 h-10"
              )}>
                <img src="/lovable-uploads/56d2c4af-fb26-47d8-8419-779a1da01775.png" alt="alphaLens.ai" className="w-full h-full object-contain" />
              </div>
              <div>
                <CardTitle className={cn(
                  "bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent",
                  isFullscreen ? "text-xl" : "text-lg"
                )}>
                  AURA
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  AlphaLens Unified Research Assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Fullscreen toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="hover:bg-primary/10"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsFullscreen(false); onToggle(); }}
                className="hidden md:flex hover:bg-primary/10"
                aria-label="Collapse to side"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsFullscreen(false); onToggle(); }}
                className="md:hidden hover:bg-primary/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <ScrollArea className={cn("flex-1", isFullscreen ? "px-8 py-6" : "p-4")} ref={scrollRef}>
          <div className={cn(isFullscreen && "max-w-5xl mx-auto")}>
            {messages.length === 0 && (
              <div className={cn("space-y-4 flex flex-col items-center justify-center", isFullscreen && "min-h-[50vh]")}>
                <p className="text-sm text-[#888] text-center">
                  Your contextual market intelligence companion for {context}.
                </p>
                
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCollectivePanel(!showCollectivePanel)}
                    className="gap-2 text-[#888] hover:text-white border-0"
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
                
                <div className={cn("space-y-2", isFullscreen && "w-full max-w-2xl")}>
                  <p className="text-xs font-semibold text-[#666]">Quick Actions:</p>
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-3 text-[#888] hover:text-white hover:bg-white/5 border-0"
                      onClick={() => handleQuickAction(action)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className={cn("space-y-4", isFullscreen && "space-y-6")}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex animate-in fade-in-50 duration-300',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      msg.role === 'user'
                        ? 'max-w-[75%] rounded-2xl px-5 py-3 bg-[#1a2e23] text-white'
                        : 'max-w-[75%] rounded-xl px-5 py-3 bg-[#161b22] text-[#c8c8c8]'
                    )}
                  >
                    {renderMessageContent(msg)}
                  </div>
                </div>
              ))}

              {/* Job badges in chat */}
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
                    <Loader2 className="h-4 w-4 animate-spin text-[#888]" />
                    <span className="text-sm text-[#888]">
                      {activeJobId ? 'Lancement en cours...' : 'Analyzing...'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && messages.length > 0 && (
              <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollToBottom}
                  className="pointer-events-auto shadow-lg hover:shadow-xl transition-all duration-200 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label="Scroll to bottom"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="shrink-0 px-4 pb-6 pt-4 bg-[#0e1116] border-t border-white/[0.03]">
          <form onSubmit={handleSubmit} className={cn(
            "flex gap-2 items-center",
            isFullscreen && "max-w-5xl mx-auto"
          )}>
            <div className="flex-1 flex items-center gap-2 rounded-full bg-[#161b22] shadow-[0_2px_12px_rgba(0,0,0,0.4)] px-4 h-14">
              <Search className="h-4 w-4 text-[#555] shrink-0" />
              <Badge variant="secondary" className="text-[10px] bg-white/5 text-[#888] border-0 shrink-0 px-2 py-0.5">
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
    </>
  );
}
