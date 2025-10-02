import { useState, useRef, useEffect } from 'react';
import { MockTrade } from '@/data/mockPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AICoPilotProps {
  trades: MockTrade[];
  isExpanded: boolean;
  onToggle: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  "Which trades were over-leveraged?",
  "What's my biggest mistake last month?",
  "Show me my worst instrument",
  "Analyze my average holding time",
];

export default function AICoPilot({ trades, isExpanded, onToggle }: AICoPilotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim()) return;

    setIsLoading(true);
    const userMsg: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    let assistantContent = '';

    try {
      const resp = await fetch(
        `https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/portfolio-copilot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcmxlZ2R1bG5ucnBpaXhpZWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDYzNDgsImV4cCI6MjA2OTk4MjM0OH0.on2S0WpM45atAYvLU8laAZJ-abS4RcMmfiqW7mLtT_4`,
          },
          body: JSON.stringify({ trades, question }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) {
          toast({
            title: 'Rate Limit Exceeded',
            description: 'Please wait a moment before sending another message.',
            variant: 'destructive',
          });
          setMessages(prev => prev.slice(0, -1)); // Remove user message
          return;
        }
        if (resp.status === 402) {
          toast({
            title: 'Payment Required',
            description: 'Please add credits to your Lovable AI workspace.',
            variant: 'destructive',
          });
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        throw new Error('Failed to get response');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Create empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1].content = assistantContent;
                return updated;
              });
            }
          } catch {
            // Ignore partial JSON
          }
        }
      }
    } catch (error) {
      console.error('AI Co-Pilot error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: 'destructive',
      });
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (question: string) => {
    sendMessage(question);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isExpanded) {
    // Collapsed floating bubble
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 p-4 bg-primary text-primary-foreground rounded-full shadow-glow-primary hover:scale-110 transition-transform"
        aria-label="Open AI Co-Pilot"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  // Expanded panel
  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-1/3 z-40 bg-background border-l border-border shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Co-Pilot</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="hidden md:flex"
            aria-label="Collapse to side"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="md:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ask me anything about your portfolio. I can help you analyze trades, identify patterns, and improve your strategy.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Quick Actions:</p>
              {QUICK_ACTIONS.map((action, idx) => (
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

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Analyzing...</span>
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
            placeholder="Ask about your trades..."
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
