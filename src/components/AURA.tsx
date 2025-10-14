import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, ChevronRight, Send, Loader2, CheckCircle, XCircle, Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
  context: string; // e.g., "Portfolio Analytics", "Backtester", "Scenario Simulator"
  isExpanded: boolean;
  onToggle: () => void;
  contextData?: import('@/lib/auraMessages').AURAContextData;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const batchContextRef = useRef<{instrument?: string; priceSummary?: string; indicatorSummary?: string} | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const globalLoading = useGlobalLoading();
  const { createJob } = useRealtimeJobManager();
  const { canLaunchJob, engageCredit } = useCreditEngagement();

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // CRITICAL FIX: Always auto-scroll when a new message arrives or loading state changes
        // This ensures the user always sees AURA's response as it comes in
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
        
        // Update scroll button visibility after scroll
        setTimeout(() => {
          const isNearBottom = 
            scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
          setShowScrollButton(!isNearBottom);
        }, 300); // Wait for smooth scroll to complete
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

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
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
        
        setTimeout(() => {
          setShowTeaser(false);
        }, 8000);
        
        setTeaserDismissed(false);
      }, randomInterval);
      
      return () => clearTimeout(timer);
    }
  }, [isExpanded, teaserDismissed, context]);

  // Save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('aura-conversation', JSON.stringify(messages.slice(-7)));
    }
  }, [messages]);

  // Restore conversation from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('aura-conversation');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isExpanded]);

  const sendMessage = async (question: string) => {
    if (!question.trim()) return;

    setIsLoading(true);
    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      // 📝 Include last 7 messages as conversation history
      const recentMessages = [...messages, userMsg].slice(-7);
      
      // Timeout promise (30 seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30000)
      );

      // Supabase invoke promise with conversation history
      const invokePromise = supabase.functions.invoke('aura', {
        body: { 
          question, 
          context: {
            page: context,
            data: contextData,
          },
          conversationHistory: recentMessages // 📝 Send last 7 messages
        }
      });

      // Race between timeout and actual request
      const result = await Promise.race([invokePromise, timeoutPromise]) as { data: any; error: any };

      if (result.error) {
        console.error('AURA invocation error:', result.error);
        
        if (result.error.message?.includes('429')) {
          toast({
            title: 'Limite Atteinte',
            description: 'Veuillez patienter avant d\'envoyer un autre message.',
            variant: 'destructive',
          });
          setMessages(prev => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
        
        if (result.error.message?.includes('402')) {
          toast({
            title: 'Crédits Requis',
            description: 'Veuillez ajouter des crédits à votre workspace Lovable AI.',
            variant: 'destructive',
          });
          setMessages(prev => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
        
        throw result.error;
      }

      const data = result.data;
      console.log("AURA received data:", data);

      // Handle tool calls - launch the actual feature
      if (data.toolCalls && data.toolCalls.length > 0) {
        console.log("AURA tool calls detected:", data.toolCalls);
        
        // ✅ BATCH MODE: Multiple tools for technical analysis (price + indicators)
        if (data.toolCalls.length > 1) {
          console.log("🔄 Batch mode: Executing multiple tools for complete technical analysis");
          
          // Initialize batch context
          batchContextRef.current = { instrument: '' };
          
          // Execute all tools in batch mode (no auto-resend)
          for (const toolCall of data.toolCalls) {
            console.log("Executing tool in batch:", toolCall.function.name);
            await handleToolLaunch(toolCall, { collectOnly: true });
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // After all tools executed, synthesize and send ONE final message
          if (batchContextRef.current) {
            const { instrument, priceSummary, indicatorSummary } = batchContextRef.current;
            
            const synthesisPrompt = `IMPORTANT: Les outils ont déjà été exécutés. N'APPELLE PAS d'outils à nouveau. Utilise UNIQUEMENT les données ci-dessous pour produire une analyse technique structurée.

**Instrument**: ${instrument}

**Prix en Temps Réel**:
${priceSummary || 'Non disponible'}

**Indicateurs Techniques**:
${indicatorSummary || 'Non disponible'}

Fournis maintenant une analyse technique complète et structurée basée sur ces données.`;

            console.log("📊 Sending synthesis prompt to AURA");
            batchContextRef.current = null; // Reset batch context
            
            setTimeout(() => {
              sendMessage(synthesisPrompt);
            }, 500);
          }
          
          return;
        }
        
        // Single tool call (normal mode)
        const toolCall = data.toolCalls[0];
        console.log("AURA single tool call detected:", toolCall);
        
        // Launch the feature (not in batch mode)
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
      
      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
      
      if (error instanceof Error) {
        if (error.message === 'timeout') {
          errorMessage = "Le serveur met trop de temps à répondre. Veuillez réessayer avec une question plus simple.";
        } else if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
          errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
        }
      }
      
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
      
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
      toast({
        title: 'Erreur',
        description: 'Impossible de lancer la requête.',
        variant: 'destructive',
      });
      return;
    }

    const instrument = parsedArgs.instrument || '';
    const timeframe = parsedArgs.timeframe || '4h';
    const riskLevel = parsedArgs.riskLevel || 'medium';
    const strategy = parsedArgs.strategy || 'breakout';
    const positionSize = parsedArgs.positionSize || '2';
    const customNotes = parsedArgs.customNotes || '';
    
    console.log('🚀 [AURA] Launching tool:', { functionName, instrument, parsedArgs, collectOnly });
    
    // Handle get_realtime_price separately (doesn't require credits or job creation)
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
        console.log("Price data request:", { 
          instrument: priceInstrument, 
          dataType, 
          interval,
          start_date,
          end_date
        });

        if (!collectOnly) {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `📊 Récupération des données en temps réel pour ${priceInstrument}...`
          }]);
        }

        // Use provided dates or fallback to 24h window
        const finalStartDate = start_date 
          ? start_date.split('T')[0] 
          : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
        const finalEndDate = end_date 
          ? end_date.split('T')[0] 
          : new Date().toISOString().split('T')[0];

        // Call fetch-historical-prices edge function
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
          console.error("Price data fetch error:", priceError);
          const errorMsg = `⚠️ Impossible de récupérer les données pour ${priceInstrument}. ${priceError?.message || 'Aucune donnée disponible.'}`;
          
          if (collectOnly && batchContextRef.current) {
            batchContextRef.current.priceSummary = errorMsg;
          } else {
            setMessages((prev) => [...prev.slice(0, -1), {
              role: 'assistant',
              content: errorMsg
            }]);
          }
          return;
        }

        const latestPrice = priceData.data[priceData.data.length - 1];
        const priceInfo = dataType === 'quote' 
          ? `Prix actuel: ${latestPrice.close} (Haut: ${latestPrice.high}, Bas: ${latestPrice.low})`
          : `Prix récents:\n${priceData.data.slice(-5).map((d: any) => 
              `- ${d.date}: Ouverture ${d.open}, Clôture ${d.close}`
            ).join('\n')}`;

        console.log("✅ Price data retrieved successfully");

        // Batch mode: store in context, don't resend
        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.instrument = priceInstrument;
          batchContextRef.current.priceSummary = priceInfo;
          console.log("📦 Stored price data in batch context");
          return;
        }

        // Normal mode: display and suggest next action (no auto-resend)
        setMessages((prev) => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `📊 **Données en Temps Réel pour ${priceInstrument}**\n\n${priceInfo}\n\n✨ Souhaitez-vous que j'effectue une analyse technique complète ?`
        }]);

        return;
      } catch (error) {
        console.error("Error fetching real-time price:", error);
        const errorMsg = "❌ Échec de la récupération des données en temps réel. Veuillez réessayer.";
        
        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.priceSummary = errorMsg;
        } else {
          setMessages((prev) => [...prev.slice(0, -1), {
            role: 'assistant',
            content: errorMsg
          }]);
        }
        return;
      }
    }

    // Handle get_technical_indicators separately (doesn't require credits or job creation)
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
        console.log("Technical indicators request:", { 
          instrument: techInstrument, 
          indicators, 
          time_period, 
          interval,
          start_date,
          end_date,
          outputsize
        });

        if (!collectOnly) {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `📈 Récupération des indicateurs techniques pour ${techInstrument} (${indicators.join(', ')})...`
          }]);
        }

        // Call fetch-technical-indicators edge function
        const { data: techData, error: techError } = await supabase.functions.invoke(
          'fetch-technical-indicators',
          {
            body: {
              instrument: techInstrument,
              indicators,
              time_period,
              interval,
              start_date,
              end_date,
              outputsize
            }
          }
        );

        if (techError || !techData?.indicators) {
          console.error("Technical indicators fetch error:", techError);
          const errorMsg = `⚠️ Impossible de récupérer les indicateurs pour ${techInstrument}. ${techError?.message || 'Données non disponibles.'}`;
          
          if (collectOnly && batchContextRef.current) {
            batchContextRef.current.indicatorSummary = errorMsg;
          } else {
            setMessages((prev) => [...prev.slice(0, -1), {
              role: 'assistant',
              content: errorMsg
            }]);
          }
          return;
        }

        // Format indicator results for display
        let indicatorSummary = '';
        
        Object.entries(techData.indicators).forEach(([indicator, data]: [string, any]) => {
          if (data.values && data.values.length > 0) {
            const latest = data.values[0];
            const value = latest[indicator];
            indicatorSummary += `✅ **${indicator.toUpperCase()}**: ${value}\n`;
          }
        });

        console.log("✅ Technical indicators retrieved successfully");

        // Batch mode: store in context, don't resend
        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.instrument = techInstrument;
          batchContextRef.current.indicatorSummary = indicatorSummary;
          console.log("📦 Stored indicator data in batch context");
          return;
        }

        // Normal mode: display and suggest next action (no auto-resend)
        setMessages((prev) => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `📊 **Indicateurs Techniques pour ${techInstrument}**\n\n${indicatorSummary}\n\n✨ Souhaitez-vous une analyse complète de ces indicateurs ?`
        }]);

        return;
      } catch (error) {
        console.error("Error fetching technical indicators:", error);
        const errorMsg = "❌ Échec de la récupération des indicateurs techniques. Veuillez réessayer.";
        
        if (collectOnly && batchContextRef.current) {
          batchContextRef.current.indicatorSummary = errorMsg;
        } else {
          setMessages((prev) => [...prev.slice(0, -1), {
            role: 'assistant',
            content: errorMsg
          }]);
        }
        return;
      }
    }

    // Map tool function to feature type (for other tools)
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
        console.warn("Unknown tool function:", functionName);
        
        // Instead of showing technical error, let AURA explain gracefully
        setMessages((prev) => [
          ...prev,
          { 
            role: 'assistant', 
            content: `🤔 Je comprends votre demande, mais je ne peux pas exécuter cette action pour le moment.\n\n**Ce que je peux faire pour vous :**\n- 📊 Analyse de marché en temps réel\n- 💡 Génération de trade setups\n- 📈 Commentaires macro\n- 📋 Rapports de marché\n- 📉 Indicateurs techniques (RSI, MACD, SMA, ATR)\n\nPouvez-vous reformuler votre demande ou me dire ce que vous aimeriez savoir sur **${instrument || 'le marché'}** ?` 
          }
        ]);
        
        return;
    }

    // 🔹 Pre-check credits
    const creditCheck = await canLaunchJob(creditType);
    if (!creditCheck.canLaunch) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ ${creditCheck.message || "Crédits insuffisants."}` },
      ]);
      toast({
        title: "Crédits Insuffisants",
        description: creditCheck.message || "Impossible de lancer cette requête.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Show loading message in AURA
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `🚀 Lancement de la requête pour ${instrument}...` },
      ]);
      setActiveJobId('pending');

      // Build request payload based on feature type
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

      // Create job using the job manager
      const jobId = await createJob(
        featureType === 'ai_trade_setup' ? 'macro_commentary' : featureType,
        instrument,
        requestPayload,
        featureType === 'ai_trade_setup' ? 'AI Trade Setup' : 
        featureType === 'macro_commentary' ? 'Macro Commentary' : 'Report'
      );

      // 🔹 Engage credit
      const engaged = await engageCredit(creditType, jobId);
      if (!engaged) {
        toast({
          title: "Erreur",
          description: "Impossible de réserver le crédit.",
          variant: "destructive"
        });
        setMessages((prev) => prev.slice(0, -1));
        setActiveJobId(null);
        return;
      }

      setActiveJobId(jobId);

      // Add job badge to chat
      setJobBadges((prev) => [
        ...prev,
        {
          jobId,
          type: featureType,
          instrument,
          status: 'pending',
          createdAt: new Date()
        }
      ]);

      // 🔹 Subscribe to realtime updates (like AISetup.tsx)
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
            console.log(`📡 [AURA Realtime] Job update:`, job);
            
            // Update badge status
            setJobBadges((prev) =>
              prev.map((badge) =>
                badge.jobId === job.id
                  ? { ...badge, status: job.status }
                  : badge
              )
            );

            if (job.status === 'completed' && job.response_payload) {
              let parsedPayload = job.response_payload;
              if (typeof job.response_payload === 'string') {
                try {
                  parsedPayload = JSON.parse(job.response_payload);
                } catch (parseError) {
                  console.error('❌ [AURA] Failed to parse response_payload JSON:', parseError);
                  setMessages((prev) => [
                    ...prev.slice(0, -1),
                    { role: 'assistant', content: `❌ Erreur de format des données pour ${instrument}.` },
                  ]);
                  toast({
                    title: "Erreur de Format",
                    description: "Les données retournées sont invalides.",
                    variant: "destructive"
                  });
                  setActiveJobId(null);
                  supabase.removeChannel(channel);
                  return;
                }
              }
              
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { 
                  role: 'assistant', 
                  content: `✅ Analyse terminée pour ${instrument} ! 🎉\n\nVous pouvez consulter le résultat complet via :\n- Le badge ci-dessus (cliquer pour naviguer)\n- Les notifications en bas à droite\n- La page dédiée (${
                    featureType === 'ai_trade_setup' ? 'AI Setup' :
                    featureType === 'macro_commentary' ? 'Macro Analysis' :
                    'Reports'
                  })`
                },
              ]);
              
              toast({ 
                title: "✅ Analyse Complétée", 
                description: `Votre ${
                  featureType === 'ai_trade_setup' ? 'trade setup' :
                  featureType === 'macro_commentary' ? 'analyse macro' :
                  'rapport'
                } pour ${instrument} est prêt.`,
                duration: 5000
              });
              
              setActiveJobId(null);
              supabase.removeChannel(channel);
              
            } else if (job.status === 'error') {
              const errorMsg = job.error_message || "Une erreur inconnue est survenue.";
              console.error('❌ [AURA Realtime] Job failed:', errorMsg);
              
              let userMessage = `❌ Échec du traitement pour ${instrument}.\n\n`;
              
              if (errorMsg.toLowerCase().includes('timeout')) {
                userMessage += "⏱️ **Délai dépassé** : La requête a pris trop de temps. Essayez avec un timeframe plus court.";
              } else if (errorMsg.toLowerCase().includes('rate limit')) {
                userMessage += "🚦 **Limite atteinte** : Trop de requêtes en peu de temps. Attendez quelques instants.";
              } else if (errorMsg.toLowerCase().includes('no data')) {
                userMessage += "📭 **Pas de données** : Aucune donnée disponible pour cet instrument sur cette période.";
              } else if (errorMsg.toLowerCase().includes('credit')) {
                userMessage += "💳 **Crédits insuffisants** : Veuillez recharger vos crédits.";
              } else {
                userMessage += `Détails : ${errorMsg}`;
              }
              
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: userMessage },
              ]);
              
              toast({
                title: "❌ Échec de l'Analyse",
                description: errorMsg,
                variant: "destructive",
                duration: 7000
              });
              
              setActiveJobId(null);
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

      // 🔹 CRITICAL: Send HTTP request to n8n (like AISetup.tsx)
      console.log('📊 [AURA] Sending n8n request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        jobId,
        instrument,
        timestamp: new Date().toISOString()
      });

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
        console.log('📩 [AURA HTTP] Request sent to n8n (waiting for Realtime response)');
        
      } catch (httpError: any) {
        console.log('⏱️ [AURA HTTP] Request issue:', httpError);
        
        if (httpError.message === 'HTTP_TIMEOUT') {
          console.log('⏱️ [AURA HTTP] Timeout HTTP (expected), continuing with Realtime listener...');
        } else {
          console.error('❌ [AURA HTTP] Critical error:', httpError);
          
          supabase.removeChannel(channel);
          
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: `❌ Impossible de contacter le serveur. Vérifiez votre connexion.` },
          ]);
          
          toast({
            title: "Erreur Réseau",
            description: "Impossible d'envoyer la requête. Vérifiez votre connexion internet.",
            variant: "destructive"
          });
          
          setActiveJobId(null);
          return;
        }
      }

      console.log('✅ [AURA] Job created and n8n request sent:', { jobId, featureType });

      // Update AURA message with job tracking
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `✅ Requête lancée pour ${instrument}. Vous pouvez suivre la progression dans les notifications en bas à droite.` },
      ]);

      toast({
        title: 'Requête Lancée',
        description: `Votre analyse pour ${instrument} est en cours...`,
      });

    } catch (error) {
      console.error('❌ [AURA] Failed to launch job:', error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `❌ Erreur lors du lancement de la requête.` },
      ]);
      toast({
        title: 'Erreur',
        description: 'Impossible de lancer la requête.',
        variant: 'destructive',
      });
      setActiveJobId(null);
    }
  };

  const handleQuickAction = (question: string) => {
    sendMessage(question);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleCTAClick = (query: string) => {
    setInput(query);
    setShowTeaser(false);
    onToggle();
    setTimeout(() => sendMessage(query), 300);
  };

  if (!isExpanded) {
    // Collapsed floating bubble with glow
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onToggle}
          className="p-4 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-full animate-pulse-glow hover:scale-110 transition-all duration-300"
          aria-label="Open AURA"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        
        {currentTeaser && (
          <AURATeaser
            teaser={currentTeaser}
            onCTAClick={handleCTAClick}
            onDismiss={() => {
              setShowTeaser(false);
              setTeaserDismissed(true);
            }}
            isVisible={showTeaser}
          />
        )}
      </div>
    );
  }

  const quickActions = QUICK_ACTIONS[context] || QUICK_ACTIONS.default;

  // Expanded panel
  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-1/3 z-40 bg-background border-l border-border shadow-2xl flex flex-col">
        {/* Professional corporate header with AlphaLens brand colors */}
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="hidden md:flex hover:bg-primary/10"
                aria-label="Collapse to side"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
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
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your contextual market intelligence companion for {context}.
            </p>
            
            {/* Collective Intelligence Panel Toggle */}
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
                  'max-w-[80%] rounded-lg px-4 py-2',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
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
  );
}
