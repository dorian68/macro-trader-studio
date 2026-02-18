import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, ChevronRight, Send, Loader2, CheckCircle, XCircle, Globe, ChevronDown, Maximize2, Minimize2, ArrowUpRight } from 'lucide-react';
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
import auraLogo from '@/assets/aura-logo.png';

interface AURAProps {
  context: string;
  isExpanded: boolean;
  onToggle: () => void;
  contextData?: import('@/lib/auraMessages').AURAContextData;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | { type: string; data: any; summary: string };
}

interface AuraJobBadge {
  jobId: string;
  type: 'ai_trade_setup' | 'macro_commentary' | 'reports';
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
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-1">
            {listItems.map((item, i) => <li key={i} className="text-sm">{renderInline(item)}</li>)}
          </ul>
        );
        listItems = [];
      }
    };

    const renderInline = (line: string): React.ReactNode => {
      // Bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        flushList();
        elements.push(<h4 key={idx} className="text-sm font-bold mt-2 mb-1">{renderInline(line.slice(4))}</h4>);
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(<h3 key={idx} className="text-base font-bold mt-3 mb-1">{renderInline(line.slice(3))}</h3>);
      } else if (line.startsWith('# ')) {
        flushList();
        elements.push(<h2 key={idx} className="text-lg font-bold mt-3 mb-1">{renderInline(line.slice(2))}</h2>);
      }
      // List items
      else if (line.match(/^[-•]\s/)) {
        listItems.push(line.replace(/^[-•]\s/, ''));
      }
      // Numbered list
      else if (line.match(/^\d+\.\s/)) {
        listItems.push(line.replace(/^\d+\.\s/, ''));
      }
      // Empty line
      else if (line.trim() === '') {
        flushList();
        elements.push(<div key={idx} className="h-2" />);
      }
      // Regular paragraph
      else {
        flushList();
        elements.push(<p key={idx} className="text-sm leading-relaxed">{renderInline(line)}</p>);
      }
    });
    flushList();
    return <div className="space-y-0.5">{elements}</div>;
  }, []);

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
        <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => { navigate('/ai-setup'); onToggle(); }}>
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
        <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => { navigate('/macro-analysis'); onToggle(); }}>
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
        <Button variant="outline" size="sm" className="w-full text-xs gap-1" onClick={() => { navigate('/reports'); onToggle(); }}>
          <ArrowUpRight className="h-3 w-3" /> Open Full View
        </Button>
      </div>
    );
  };

  // ===== RENDER MESSAGE CONTENT =====
  const renderMessageContent = (msg: Message) => {
    if (typeof msg.content === 'string') {
      if (msg.role === 'assistant') {
        return <div className="text-sm">{renderMarkdown(msg.content)}</div>;
      }
      return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }

    // Rich content (mini-widgets)
    const rich = msg.content;
    return (
      <div className="text-sm">
        {rich.summary && <p className="mb-1">{rich.summary}</p>}
        {rich.type === 'trade_setup' && <AuraMiniTradeSetup data={rich.data} />}
        {rich.type === 'macro_commentary' && <AuraMiniMacro data={rich.data} />}
        {rich.type === 'report' && <AuraMiniReport data={rich.data} />}
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

    // Map tool function to feature type
    let featureType: 'ai_trade_setup' | 'macro_commentary' | 'reports' = 'ai_trade_setup';
    let creditType: 'ideas' | 'queries' | 'reports' = 'ideas';
    
    switch (functionName) {
      case 'launch_ai_trade_setup':
        featureType = 'ai_trade_setup';
        creditType = 'ideas';
        break;
      case 'launch_macro_commentary':
        featureType = 'macro_commentary';
        creditType = 'queries';
        break;
      case 'launch_report':
        featureType = 'reports';
        creditType = 'reports';
        break;
      default:
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `${t('toasts:aura.unknownAction')}\n\n${t('toasts:aura.availableActions')}\n\n${t('toasts:aura.reformulateRequest', { instrument: instrument || 'the market' })}` }
        ]);
        return;
    }

    try {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('toasts:aura.launchingRequest', { instrument }) },
      ]);
      setActiveJobId('pending');

      let requestPayload: any = {
        instrument,
        timeframe,
        question: customNotes || `Analyze ${instrument}`
      };

      if (functionName === 'launch_ai_trade_setup') {
        requestPayload = {
          type: "RAG",
          mode: "run",
          instrument,
          question: `Provide an institutional macro outlook and risks for ${instrument}, then a macro-grounded trade idea (entry/SL/TP).`,
          isTradeQuery: true,
          timeframe,
          riskLevel,
          positionSize,
          strategy,
          customNotes
        };
      } else if (functionName === 'launch_macro_commentary') {
        requestPayload = {
          type: "RAG",
          mode: "run",
          instrument,
          question: `Provide comprehensive macro commentary for ${instrument}. ${customNotes}`,
          timeframe
        };
      } else if (functionName === 'launch_report') {
        requestPayload = {
          mode: "run",
          type: "reports",
          question: `Generate report for ${instrument}. ${customNotes}`,
          instrument,
          timeframe: "1D",
          exportFormat: "pdf"
        };
      }

      const jobId = await createJob(
        featureType === 'ai_trade_setup' ? 'macro_commentary' : featureType,
        instrument,
        requestPayload,
        featureType === 'ai_trade_setup' ? 'AI Trade Setup' : 
        featureType === 'macro_commentary' ? 'Macro Commentary' : 'Report'
      );

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
              
              // Build rich mini-widget message
              let richContent: Message['content'];
              const summaryText = `✅ ${t('toasts:aura.analysisCompleted', { instrument })} 🎉`;

              if (featureType === 'ai_trade_setup') {
                // Try to extract final_answer for rich data
                let tradeData = parsedPayload;
                try {
                  const fa = parsedPayload?.body?.message?.message?.content?.content?.final_answer 
                    || parsedPayload?.content?.final_answer
                    || parsedPayload?.final_answer;
                  if (fa && typeof fa === 'string') {
                    tradeData = JSON.parse(fa);
                  } else if (fa && typeof fa === 'object') {
                    tradeData = fa;
                  }
                } catch (e) { /* use parsedPayload as-is */ }
                
                richContent = { type: 'trade_setup', data: tradeData, summary: summaryText };
              } else if (featureType === 'macro_commentary') {
                richContent = { type: 'macro_commentary', data: parsedPayload, summary: summaryText };
              } else {
                richContent = { type: 'report', data: parsedPayload, summary: summaryText };
              }

              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: richContent },
              ]);
              
              toast({ 
                title: t('toasts:aura.analysisCompletedTitle'), 
                description: t('toasts:aura.analysisCompletedDescription', {
                  type: featureType === 'ai_trade_setup' ? 'trade setup' :
                        featureType === 'macro_commentary' ? 'macro analysis' : 'report',
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
              
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: userMessage },
              ]);
              
              toast({ title: t('toasts:aura.analysisFailedTitle'), description: errorMsg, variant: "destructive", duration: 7000 });
              setActiveJobId(null);
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

      // Send HTTP request to n8n
      console.log('📊 [AURA] Sending n8n request:', { jobId, instrument });

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('HTTP_TIMEOUT')), 25000)
        );
        
        const requestPromise = enhancedPostRequest(
          'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
          requestPayload,
          {
            enableJobTracking: true,
            jobType: featureType === 'ai_trade_setup' ? 'macro_commentary' : featureType,
            instrument: instrument,
            feature: featureType === 'ai_trade_setup' ? 'AI Trade Setup' : 
                     featureType === 'macro_commentary' ? 'Macro Commentary' : 'Report',
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
        "fixed bg-background border-l border-border shadow-2xl flex flex-col",
        isFullscreen
          ? "inset-0 z-[10004]"
          : "right-0 top-0 h-full w-full md:w-1/3 z-40"
      )}>
        {/* Header */}
        <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg p-1">
                <img src="/lovable-uploads/56d2c4af-fb26-47d8-8419-779a1da01775.png" alt="alphaLens.ai" className="w-full h-full object-contain" />
              </div>
              <div>
                <CardTitle className="text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
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
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className={cn(isFullscreen && "max-w-4xl mx-auto")}>
            {messages.length === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your contextual market intelligence companion for {context}.
                </p>
                
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCollectivePanel(!showCollectivePanel)}
                    className="gap-2"
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
                
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Quick Actions:</p>
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-3"
                      onClick={() => handleQuickAction(action)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-4 py-2',
                      isFullscreen ? 'max-w-[90%]' : 'max-w-[80%]',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
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
                        const routes = {
                          ai_trade_setup: '/ai-setup',
                          macro_commentary: '/macro-analysis',
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
                  <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
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
        <div className={cn("p-4 border-t border-border bg-card", isFullscreen && "max-w-4xl mx-auto w-full")}>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AURA anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
