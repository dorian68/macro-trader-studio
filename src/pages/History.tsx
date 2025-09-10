import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { UserHistoryPanel } from "@/components/UserHistoryPanel";
import { ConversationalBubble } from "@/components/ConversationalBubble";

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

export default function History() {
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<UserRequest | null>(null);

  const handleViewResult = (request: UserRequest) => {
    setSelectedRequest(request);
  };

  const handleCloseBubble = () => {
    setSelectedRequest(null);
  };

  return (
    <Layout activeModule="history" onModuleChange={() => {}}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="shrink-0 min-h-[44px] w-11"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
              Request History
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground break-words">
              View and manage your analysis history
            </p>
          </div>
        </div>

        {/* History Panel */}
        <div className="h-[calc(100vh-12rem)]">
          <UserHistoryPanel onViewResult={handleViewResult} />
        </div>

        {/* Result Viewer */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <ConversationalBubble
                mode={selectedRequest.request_type as "macro" | "reports" | "tradesetup"}
                instrument={selectedRequest.instrument}
                timeframe="1h"
                onClose={handleCloseBubble}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}