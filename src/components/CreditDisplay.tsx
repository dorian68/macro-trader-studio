import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreditManager } from '@/hooks/useCreditManager';
import { Zap, Brain, FileText } from 'lucide-react';

export function CreditDisplay() {
  const { credits, loading, effectiveQueries, effectiveIdeas, effectiveReports } = useCreditManager();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Credits Remaining
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!credits) {
    return null;
  }

  const planDisplayName = {
    free_trial: 'Free Trial',
    broker_free: 'Broker Free',
    basic: 'Basic',
    standard: 'Standard',
    premium: 'Premium'
  }[credits.plan_type] || credits.plan_type;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Credits Remaining
          </div>
          <Badge variant="secondary">{planDisplayName}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm">Queries</span>
          </div>
          <Badge variant={effectiveQueries > 0 ? "default" : "destructive"}>
            {effectiveQueries}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm">Investment Ideas</span>
          </div>
          <Badge variant={effectiveIdeas > 0 ? "default" : "destructive"}>
            {effectiveIdeas}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm">Reports</span>
          </div>
          <Badge variant={effectiveReports > 0 ? "default" : "destructive"}>
            {effectiveReports}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}