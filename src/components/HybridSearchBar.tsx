import { useState, useEffect, useRef } from "react";
import { Search, Brain, Send, Loader2, Copy, Trash2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import AssetInfoCard from "@/components/AssetInfoCard";

interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

interface AIResponse {
  id: string;
  query: string;
  timestamp: Date;
  response: string;
  conversationId: string;
  showReplyInput?: boolean;
}

interface HybridSearchBarProps {
  assets: Asset[];
  selectedAsset: string;
  onAssetSelect: (asset: string) => void;
  instrument: string;
  timeframe: string;
}

export function HybridSearchBar({
  assets,
  selectedAsset,
  onAssetSelect,
  instrument,
  timeframe
}: HybridSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAIResults, setShowAIResults] = useState(false);
  const [replyInputs, setReplyInputs] = useState<{[key: string]: string}>({});
  const [replyLoading, setReplyLoading] = useState<{[key: string]: boolean}>({});
  const [selectedAssetForPreview, setSelectedAssetForPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Détecter si c'est une question IA (phrase longue) ou recherche d'instrument
  const isAIQuery = searchTerm.trim().split(' ').length > 6;
  
  // Filtrer les instruments qui correspondent
  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fermer le dropdown quand on clique dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAssetSelect = (asset: Asset) => {
    onAssetSelect(asset.symbol);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleAIQuery = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setShowDropdown(false);
    
    try {
      const response = await fetch('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "RAG",
          question: searchTerm,
          instrument: instrument,
          timeframe: timeframe
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const conversationId = Date.now().toString();
      const newResponse: AIResponse = {
        id: conversationId,
        query: searchTerm,
        timestamp: new Date(),
        response: data.content?.content || data.content || "No response received",
        conversationId: conversationId
      };

      setAiResponses(prev => [newResponse, ...prev]);
      setSearchTerm("");
      setShowAIResults(true);
      
      toast({
        title: "AI Response",
        description: "Question answered successfully"
      });
    } catch (error) {
      console.error('AI Query error:', error);
      toast({
        title: "Error",
        description: "Failed to process AI query. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyAIResponse = (response: AIResponse) => {
    const content = `Q: ${response.query}\nA: ${response.response}`;
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "AI response copied to clipboard"
    });
  };

  const clearAIResponses = () => {
    setAiResponses([]);
    setShowAIResults(false);
    toast({
      title: "Cleared",
      description: "AI responses cleared"
    });
  };

  const handleReply = async (conversationId: string, replyText: string) => {
    if (!replyText.trim()) return;

    setReplyLoading(prev => ({ ...prev, [conversationId]: true }));
    
    try {
      // Récupérer le contexte de la conversation
      const conversationContext = aiResponses
        .filter(r => r.conversationId === conversationId)
        .reverse()
        .map(r => `Q: ${r.query}\nA: ${r.response}`)
        .join('\n\n');

      const contextualQuestion = `Context:\n${conversationContext}\n\nFollow-up question: ${replyText}`;

      const response = await fetch('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "RAG",
          question: contextualQuestion,
          instrument: instrument,
          timeframe: timeframe
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const newResponse: AIResponse = {
        id: Date.now().toString(),
        query: replyText,
        timestamp: new Date(),
        response: data.content?.content || data.content || "No response received",
        conversationId: conversationId
      };

      setAiResponses(prev => [newResponse, ...prev]);
      setReplyInputs(prev => ({ ...prev, [conversationId]: "" }));
      
      toast({
        title: "AI Response",
        description: "Follow-up question answered successfully"
      });
    } catch (error) {
      console.error('AI Reply error:', error);
      toast({
        title: "Error",
        description: "Failed to process reply. Please try again.",
        variant: "destructive"
      });
    } finally {
      setReplyLoading(prev => ({ ...prev, [conversationId]: false }));
    }
  };

  const toggleReplyInput = (responseId: string) => {
    setAiResponses(prev => prev.map(response => 
      response.id === responseId 
        ? { ...response, showReplyInput: !response.showReplyInput }
        : response
    ));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isAIQuery) {
        handleAIQuery();
      } else if (filteredAssets.length > 0) {
        handleAssetSelect(filteredAssets[0]);
      }
    }
  };

  const handleReplyKeyPress = (e: React.KeyboardEvent, conversationId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply(conversationId, replyInputs[conversationId] || "");
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile-first Hybrid Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search instruments or ask AI..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(e.target.value.length > 0);
            }}
            onKeyPress={handleKeyPress}
            onFocus={() => searchTerm && setShowDropdown(true)}
            className="w-full pl-10 pr-16 sm:pr-20 py-3 sm:py-4 bg-input/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth text-sm sm:text-base"
          />
          
          {/* AI Query Button - Mobile optimized */}
          {isAIQuery && searchTerm && (
            <Button
              onClick={handleAIQuery}
              disabled={isLoading}
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              <span className="hidden sm:inline ml-1">Ask</span>
            </Button>
          )}
        </div>

        {/* Mobile-first dropdown with hybrid suggestions */}
        {showDropdown && searchTerm && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl z-50 max-h-[70vh] sm:max-h-80 overflow-y-auto"
          >
            {/* Instrument Results */}
            {!isAIQuery && filteredAssets.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                  <Search className="h-3 w-3" />
                  Instruments
                </div>
                <div className="space-y-2">
                  {filteredAssets.slice(0, 3).map((asset) => (
                    <div key={asset.symbol} className="space-y-2">
                      <button
                        onClick={() => handleAssetSelect(asset)}
                        onMouseEnter={() => setSelectedAssetForPreview(asset.symbol)}
                        className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-smooth flex items-center gap-2 rounded-md border border-border/20"
                      >
                        <span className="text-sm">{asset.icon}</span>
                        <span className="text-sm font-medium text-foreground">{asset.symbol}</span>
                        <span className="text-xs text-muted-foreground truncate">{asset.name}</span>
                      </button>
                      {selectedAssetForPreview === asset.symbol && (
                        <div className="ml-2 mr-2">
                          <AssetInfoCard symbol={asset.symbol} className="text-xs scale-95" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Query Option */}
            {isAIQuery && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                  <Brain className="h-3 w-3" />
                  AI Assistant
                </div>
                <button
                  onClick={handleAIQuery}
                  disabled={isLoading}
                  className="w-full px-3 py-4 sm:py-3 text-left hover:bg-primary/10 transition-smooth flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 min-h-[44px]"
                >
                  <Brain className="h-5 w-5 sm:h-4 sm:w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">Ask AI:</div>
                    <div className="text-xs text-muted-foreground truncate line-clamp-2">"{searchTerm}"</div>
                  </div>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin text-primary" />
                  ) : (
                    <Send className="h-4 w-4 sm:h-3 sm:w-3 text-primary" />
                  )}
                </button>
              </div>
            )}

            {/* No results */}
            {!isAIQuery && filteredAssets.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No instruments found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile-optimized AI Responses Panel */}
      {showAIResults && aiResponses.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-medium">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">AI Responses</h4>
                <Badge variant="secondary" className="text-xs">
                  {aiResponses.length}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIResults(false)}
                  className="h-7 px-2 text-xs"
                >
                  Hide
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAIResponses}
                  className="h-7 px-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] sm:max-h-96 overflow-y-auto">
              {aiResponses.map((response) => (
                <Card key={response.id} className="bg-card/30 border-border/30">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Q
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {response.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {response.query}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyAIResponse(response)}
                        className="h-6 px-2 shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="bg-muted/20 rounded-md p-3 mb-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {response.response}
                      </p>
                    </div>
                    
                    {/* Reply Section */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleReplyInput(response.id)}
                        className="h-7 px-2 text-xs"
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {response.showReplyInput ? 'Cancel' : 'Reply'}
                      </Button>
                      
                      {/* Indicateur de conversation */}
                      {aiResponses.filter(r => r.conversationId === response.conversationId).length > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          Conversation ({aiResponses.filter(r => r.conversationId === response.conversationId).length})
                        </Badge>
                      )}
                    </div>

                    {/* Reply Input */}
                    {response.showReplyInput && (
                      <div className="mt-3 space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Continue the conversation..."
                            value={replyInputs[response.conversationId] || ""}
                            onChange={(e) => setReplyInputs(prev => ({ 
                              ...prev, 
                              [response.conversationId]: e.target.value 
                            }))}
                            onKeyPress={(e) => handleReplyKeyPress(e, response.conversationId)}
                            className="w-full px-3 py-3 sm:py-2 pr-12 bg-input/50 border border-border/50 rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth"
                            disabled={replyLoading[response.conversationId]}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleReply(response.conversationId, replyInputs[response.conversationId] || "")}
                            disabled={replyLoading[response.conversationId] || !replyInputs[response.conversationId]?.trim()}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 px-2"
                          >
                            {replyLoading[response.conversationId] ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Press Enter to send • Shift+Enter for new line
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}