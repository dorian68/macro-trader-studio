import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  History, 
  Search, 
  Eye, 
  Trash2, 
  Calendar,
  Brain,
  FileText,
  Zap,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface UserRequest {
  id: string;
  request_type: 'ai_trade_setup' | 'macro_commentary' | 'reports';
  instrument: string;
  parameters: any;
  request_content: string;
  response_content: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
}

interface UserHistoryPanelProps {
  onViewResult: (request: UserRequest) => void;
  className?: string;
}

const REQUEST_ICONS = {
  ai_trade_setup: Zap,
  macro_commentary: Brain,
  reports: FileText
};

const REQUEST_LABELS = {
  ai_trade_setup: "AI Trade Setup",
  macro_commentary: "Macro Commentary",
  reports: "Reports"
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800", 
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800"
};

export function UserHistoryPanel({ onViewResult, className }: UserHistoryPanelProps) {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type assertion to handle the database response
      setRequests((data || []) as UserRequest[]);
    } catch (error) {
      console.error('Error fetching user requests:', error);
      toast({
        title: "Error",
        description: "Failed to load request history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    let filtered = requests;

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(req => req.request_type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.request_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.response_content && req.response_content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredRequests(filtered);
  }, [requests, selectedType, searchTerm]);

  const deleteRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRequests(prev => prev.filter(req => req.id !== id));
      toast({
        title: "Deleted",
        description: "Request removed from history"
      });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error", 
        description: "Failed to delete request",
        variant: "destructive"
      });
    }
  };

  const getCompletedRequests = () => filteredRequests.filter(req => req.status === 'completed');
  const getPendingRequests = () => filteredRequests.filter(req => req.status === 'pending' || req.status === 'processing');
  const getFailedRequests = () => filteredRequests.filter(req => req.status === 'failed');

  const RequestCard = ({ request }: { request: UserRequest }) => {
    const IconComponent = REQUEST_ICONS[request.request_type];
    
    return (
      <Card className="mb-3 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className="h-4 w-4" />
                <span className="font-medium">{REQUEST_LABELS[request.request_type]}</span>
                <Badge variant="outline" className="text-xs">{request.instrument}</Badge>
                <Badge className={cn("text-xs", STATUS_COLORS[request.status])}>
                  {request.status}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {request.request_content}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(request.created_at), 'PPp')}</span>
                </div>
                {request.completed_at && (
                  <span>
                    Completed: {format(new Date(request.completed_at), 'PPp')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-1 ml-4">
              {request.status === 'completed' && request.response_content && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewResult(request)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteRequest(request.id)}
                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Request History
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRequests}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", { "animate-spin": loading })} />
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={selectedType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("all")}
            >
              All
            </Button>
            <Button
              variant={selectedType === "ai_trade_setup" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("ai_trade_setup")}
            >
              <Zap className="mr-1 h-3 w-3" />
              Trade
            </Button>
            <Button
              variant={selectedType === "macro_commentary" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("macro_commentary")}
            >
              <Brain className="mr-1 h-3 w-3" />
              Macro
            </Button>
            <Button
              variant={selectedType === "reports" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType("reports")}
            >
              <FileText className="mr-1 h-3 w-3" />
              Reports
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="h-full pb-0">
        <Tabs defaultValue="completed" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="completed">
              Completed ({getCompletedRequests().length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Active ({getPendingRequests().length})
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed ({getFailedRequests().length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completed" className="mt-4 h-full">
            <ScrollArea className="h-[calc(100%-2rem)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : getCompletedRequests().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No completed requests found
                </div>
              ) : (
                getCompletedRequests().map(request => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending" className="mt-4 h-full">
            <ScrollArea className="h-[calc(100%-2rem)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : getPendingRequests().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active requests
                </div>
              ) : (
                getPendingRequests().map(request => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="failed" className="mt-4 h-full">
            <ScrollArea className="h-[calc(100%-2rem)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : getFailedRequests().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No failed requests
                </div>
              ) : (
                getFailedRequests().map(request => (
                  <RequestCard key={request.id} request={request} />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}