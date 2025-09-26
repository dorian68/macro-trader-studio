import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCreditManager } from '@/hooks/useCreditManager';
import { Zap, Brain, FileText, History, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useJobStatusManager } from '@/hooks/useJobStatusManager';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface JobUsageStats {
  queries: number;
  ideas: number;
  reports: number;
}

export default function Credits() {
  const { credits, loading, fetchCredits } = useCreditManager();
  const { user } = useAuth();
  const navigate = useNavigate();
  const jobManager = useJobStatusManager();
  const [usageStats, setUsageStats] = useState<JobUsageStats>({ queries: 0, ideas: 0, reports: 0 });

  const fetchUsageStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Récupérer les données des deux tables
      const [jobsResult, interactionsResult] = await Promise.all([
        supabase
          .from('jobs')
          .select('feature')
          .eq('user_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('ai_interactions')
          .select('feature_name')
          .eq('user_id', user.id)
      ]);

        const stats = { queries: 0, ideas: 0, reports: 0 };

        // Compter depuis la table jobs
        if (jobsResult.data) {
          jobsResult.data.forEach((job) => {
            switch (job.feature) {
              case 'Macro Commentary':
              case 'macro_commentary':
              case 'queries':
                stats.queries++;
                break;
              case 'AI Trade Setup':
              case 'ai_setup':
              case 'ideas':
                stats.ideas++;
                break;
              case 'Report':
              case 'report':
              case 'reports':
                stats.reports++;
                break;
            }
          });
        }

        // Compter depuis la table ai_interactions
        if (interactionsResult.data) {
          interactionsResult.data.forEach((interaction) => {
            switch (interaction.feature_name) {
              case 'market_commentary':
              case 'macro_commentary':
                stats.queries++;
                break;
              case 'trade_setup':
              case 'ai_setup':
                stats.ideas++;
                break;
              case 'report':
                stats.reports++;
                break;
            }
          });
        }

      setUsageStats(stats);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  }, [user?.id]);

  // Listen for credit updates
  useEffect(() => {
    const handleCreditsUpdate = () => {
      fetchCredits();
      fetchUsageStats(); // Also refresh usage stats when credits update
    };

    window.addEventListener('creditsUpdated', handleCreditsUpdate);
    return () => window.removeEventListener('creditsUpdated', handleCreditsUpdate);
  }, [fetchCredits, fetchUsageStats]);

  useEffect(() => {
    fetchUsageStats();
  }, [fetchUsageStats]);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading credits...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!credits) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="text-center py-8">
            <div className="text-muted-foreground">Unable to load credits information.</div>
          </div>
        </div>
      </Layout>
    );
  }

  const planDisplayName = {
    free_trial: 'Free Trial',
    broker_free: 'Broker Free',
    basic: 'Basic',
    standard: 'Standard',
    premium: 'Premium'
  }[credits.plan_type] || credits.plan_type;

  const totalCredits = credits.credits_queries_remaining + 
                      credits.credits_ideas_remaining + 
                      credits.credits_reports_remaining;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="gradient-primary p-3 rounded-xl shadow-glow-primary shrink-0">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Credits Overview
            </h1>
            <p className="text-muted-foreground">
              Track your usage and remaining credits
            </p>
          </div>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Plan</span>
              <Badge variant="secondary" className="text-sm">
                {planDisplayName}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalCredits} credits remaining
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Last reset: {new Date(credits.last_reset_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Credits Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Macro Commentary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {credits.credits_queries_remaining}
                </div>
                <div className="text-sm text-muted-foreground">
                  Used this period: {usageStats.queries}
                </div>
                <Badge variant={credits.credits_queries_remaining > 0 ? "default" : "destructive"} className="w-fit">
                  {credits.credits_queries_remaining > 0 ? "Available" : "Depleted"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                AI Trade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {credits.credits_ideas_remaining}
                </div>
                <div className="text-sm text-muted-foreground">
                  Used this period: {usageStats.ideas}
                </div>
                <Badge variant={credits.credits_ideas_remaining > 0 ? "default" : "destructive"} className="w-fit">
                  {credits.credits_ideas_remaining > 0 ? "Available" : "Depleted"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {credits.credits_reports_remaining}
                </div>
                <div className="text-sm text-muted-foreground">
                  Used this period: {usageStats.reports}
                </div>
                <Badge variant={credits.credits_reports_remaining > 0 ? "default" : "destructive"} className="w-fit">
                  {credits.credits_reports_remaining > 0 ? "Available" : "Depleted"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Usage Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {usageStats.queries}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Macro Commentary Used
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {usageStats.ideas}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total AI Trade Generated
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {usageStats.reports}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Reports Created
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/history')}
                  className="w-full"
                >
                  <History className="h-4 w-4 mr-2" />
                  View Detailed History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}