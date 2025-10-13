import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, ChevronRight, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AURATeaser } from '@/components/aura/AURATeaser';
import { getRandomTeaser, AURATeaser as TeaserType } from '@/lib/auraMessages';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalLoading } from '@/components/GlobalLoadingProvider';
import { useRealtimeJobManager } from '@/hooks/useRealtimeJobManager';
import { useCreditEngagement } from '@/hooks/useCreditEngagement';
import { enhancedPostRequest } from '@/lib/enhanced-request';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const globalLoading = useGlobalLoading();
  const { createJob } = useRealtimeJobManager();
  const { canLaunchJob, engageCredit } = useCreditEngagement();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, jobBadges]);

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
        const toolCall = data.toolCalls[0];
        console.log("AURA tool call detected:", toolCall);
        
        // Launch the feature
        await handleToolLaunch(toolCall);
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

  const handleToolLaunch = async (toolCall: any) => {
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
    
    console.log('🚀 [AURA] Launching tool:', { functionName, instrument, parsedArgs });
    
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
        console.warn("Unknown tool function:", functionName);
        toast({
          title: 'Erreur',
          description: 'Fonction inconnue.',
          variant: 'destructive',
        });
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

            if (job.status === 'completed') {
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: `✅ Requête terminée pour ${instrument}. Vous pouvez consulter le résultat via les notifications en bas à droite ou cliquer sur le badge ci-dessus.` },
              ]);
              setActiveJobId(null);
              supabase.removeChannel(channel);
            } else if (job.status === 'error') {
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: `❌ Erreur lors du traitement pour ${instrument}.` },
              ]);
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
        const { response } = await enhancedPostRequest(
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
        console.log('📩 [AURA HTTP] Request sent to n8n (waiting for Realtime response)');
      } catch (httpError) {
        console.log('⏱️ [AURA HTTP] Request timeout (expected, waiting for Realtime)', httpError);
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
      <>
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-full animate-pulse-glow hover:scale-110 transition-all duration-300"
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
      </>
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
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <MessageCircle className="h-5 w-5 text-primary" />
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
