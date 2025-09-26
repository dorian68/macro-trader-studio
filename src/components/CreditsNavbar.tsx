import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCreditManager } from '@/hooks/useCreditManager';
import { Zap, Brain, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CreditsNavbar() {
  const { credits, loading } = useCreditManager();
  const navigate = useNavigate();

  if (loading || !credits) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 px-3">
        <Zap className="h-4 w-4 mr-2" />
        Credits
      </Button>
    );
  }

  const totalCredits = credits.credits_queries_remaining + 
                      credits.credits_ideas_remaining + 
                      credits.credits_reports_remaining;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-3 text-sm relative"
          onClick={() => navigate('/credits')}
        >
          <Zap className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Credits:</span>
          <Badge variant="secondary" className="ml-1 min-w-[2rem]">
            {totalCredits}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border p-3 z-50">
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">Credits Remaining</div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm">Queries</span>
              </div>
              <Badge variant={credits.credits_queries_remaining > 0 ? "default" : "destructive"}>
                {credits.credits_queries_remaining}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm">Investment Ideas</span>
              </div>
              <Badge variant={credits.credits_ideas_remaining > 0 ? "default" : "destructive"}>
                {credits.credits_ideas_remaining}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm">Reports</span>
              </div>
              <Badge variant={credits.credits_reports_remaining > 0 ? "default" : "destructive"}>
                {credits.credits_reports_remaining}
              </Badge>
            </div>
          </div>
          
          <Button 
            size="sm" 
            className="w-full"
            onClick={() => navigate('/credits')}
          >
            View Details
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}