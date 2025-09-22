import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { safePostRequest } from "@/lib/safe-request";
import { 
  MessageCircle, 
  X, 
  Minimize2, 
  Maximize2,
  Send,
  Brain,
  FileText,
  Zap,
  Pin,
  Download,
  Copy,
  Loader2,
  ChevronDown,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  sections?: Array<{
    title: string;
    content: string;
    type: "summary" | "analysis" | "levels" | "insight";
  }>;
  pinned?: boolean;
}

interface ConversationalBubbleProps {
  mode: "macro" | "reports" | "tradesetup";
  instrument: string;
  timeframe?: string;
  onClose: () => void;
}

export function ConversationalBubble({ mode, instrument, timeframe, onClose }: ConversationalBubbleProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call n8n webhook with the appropriate type
      const webhookType = mode === "macro" ? "macro" : mode === "reports" ? "reports" : "tradesetup";
      
      const response = await safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', {
        type: webhookType,
        question: input.trim(),
        instrument: instrument,
        timeframe: timeframe || "1H"
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      console.log('Raw webhook response:', text);
      
      if (!text.trim()) {
        throw new Error('Empty response from webhook');
      }
      
      const rawData = JSON.parse(text);
      console.log('Parsed webhook JSON:', rawData);

      // Create AI message with webhook response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: typeof rawData.content?.content === 'string' ? rawData.content.content
               : typeof rawData.content === 'string' ? rawData.content
               : typeof rawData.content === 'object' ? JSON.stringify(rawData.content, null, 2)
               : "Analysis completed successfully",
        timestamp: new Date(),
        sections: mode === "macro" ? [
          {
            title: "AI Analysis",
            content: typeof rawData.content?.content === 'string' ? rawData.content.content
                   : typeof rawData.content === 'string' ? rawData.content
                   : typeof rawData.content === 'object' ? JSON.stringify(rawData.content, null, 2)
                   : `Current ${instrument} analysis based on market conditions and your query.`,
            type: "analysis"
          }
        ] : mode === "reports" ? [
          {
            title: "Generated Report",
            content: typeof rawData.content?.content === 'string' ? rawData.content.content
                   : typeof rawData.content === 'string' ? rawData.content
                   : typeof rawData.content === 'object' ? JSON.stringify(rawData.content, null, 2)
                   : `Comprehensive report for ${instrument} based on your request.`,
            type: "summary"
          }
        ] : [
          {
            title: "Trade Setup",
            content: typeof rawData.content?.content === 'string' ? rawData.content.content
                   : typeof rawData.content === 'string' ? rawData.content
                   : typeof rawData.content === 'object' ? JSON.stringify(rawData.content, null, 2)
                   : `AI-generated trade setup for ${instrument} based on current market conditions.`,
            type: "analysis"
          }
        ]
      };

      setMessages(prev => [...prev, aiMessage]);
      
      toast({
        title: "Analysis Completed",
        description: `Successfully generated ${mode} analysis`,
      });

    } catch (error) {
      console.error('Webhook error:', error);
      
      // Show user-friendly error notification
      const errorText = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: "Request Failed",
        description: errorText,
        variant: "destructive"
      });
      
      // Fallback AI message in case of error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "I encountered an issue processing your request. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handlePinMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg
    ));
    toast({
      title: "Message pinned",
      description: "Added to your saved insights"
    });
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied"
    });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          {mode === "macro" ? <Brain className="h-6 w-6" /> : 
           mode === "reports" ? <FileText className="h-6 w-6" /> :
           <Zap className="h-6 w-6" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
      <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-lg">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {mode === "macro" ? <Brain className="h-5 w-5 text-primary" /> : 
               mode === "reports" ? <FileText className="h-5 w-5 text-primary" /> :
               <Zap className="h-5 w-5 text-primary" />}
              <CardTitle className="text-lg">
                {mode === "macro" ? "Macro Assistant" : 
                 mode === "reports" ? "Report Generator" : 
                 "Trade Setup AI"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {instrument}
            </Badge>
            {timeframe && (
              <Badge variant="secondary" className="text-xs">
                {timeframe}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="p-0">
          <ScrollArea className="h-96 px-4">
            <div className="space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-3">
                    {mode === "macro" ? <Brain className="h-8 w-8 mx-auto text-primary/30" /> : 
                     mode === "reports" ? <FileText className="h-8 w-8 mx-auto text-primary/30" /> :
                     <Zap className="h-8 w-8 mx-auto text-primary/30" />}
                  </div>
                  <p className="text-sm">
                    {mode === "macro" 
                      ? "Ask me about market analysis, economic insights, or trading opportunities"
                      : mode === "reports"
                      ? "I can help you generate professional trading reports and summaries"
                      : "Ask me to generate trade setups, analyze entries, or calculate risk levels"
                    }
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={cn(
                  "flex gap-3",
                  message.type === "user" ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "max-w-[85%] space-y-2",
                    message.type === "user" ? "order-2" : "order-1"
                  )}>
                    {/* Message bubble */}
                    <div className={cn(
                      "p-3 rounded-lg text-sm",
                      message.type === "user" 
                        ? "bg-primary text-primary-foreground ml-auto" 
                        : "bg-muted"
                    )}>
                      <p className="leading-relaxed">{message.content}</p>
                    </div>

                    {/* AI message sections */}
                    {message.type === "ai" && message.sections && (
                      <div className="space-y-2">
                        {message.sections.map((section, index) => {
                          const sectionId = `${message.id}-${index}`;
                          const isExpanded = expandedSections.has(sectionId);
                          
                          return (
                            <div key={index} className="border rounded-lg bg-card">
                              <button
                                onClick={() => toggleSection(sectionId)}
                                className="w-full p-3 flex items-center justify-between text-left hover:bg-accent/50 transition-colors rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    section.type === "summary" && "bg-primary",
                                    section.type === "analysis" && "bg-success",
                                    section.type === "levels" && "bg-warning",
                                    section.type === "insight" && "bg-primary-light"
                                  )} />
                                  <span className="font-medium text-sm">{section.title}</span>
                                </div>
                                <ChevronDown className={cn(
                                  "h-4 w-4 transition-transform",
                                  isExpanded && "rotate-180"
                                )} />
                              </button>
                              
                              {isExpanded && (
                                <div className="px-3 pb-3">
                                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                                    {section.content}
                                  </p>
                                  <div className="flex items-center gap-1 mt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopyMessage(section.content)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePinMessage(message.id)}
                                      className="h-7 px-2 text-xs"
                                    >
                                      <Pin className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Message actions */}
                    {message.type === "ai" && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMessage(message.content)}
                          className="h-6 px-2 text-xs"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePinMessage(message.id)}
                          className="h-6 px-2 text-xs"
                        >
                          <Pin className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                   <span className="text-sm text-muted-foreground">Analyzing...</span>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "macro" 
                  ? "Ask about market conditions, analysis..."
                  : mode === "reports"
                  ? "Request report sections, analysis..."
                  : "Generate trade setup, calculate levels..."
                }
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="sm" disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}