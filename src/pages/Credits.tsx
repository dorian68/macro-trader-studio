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
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

interface JobUsageStats {
  queries: number;
  ideas: number;
  reports: number;
}

export default function Credits() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { credits, loading, fetchCredits } = useCreditManager();
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const jobManager = useJobStatusManager();
  const [usageStats, setUsageStats] = useState<JobUsageStats>({ queries: 0, ideas: 0, reports: 0 });
  const [renewalDate, setRenewalDate] = useState<string>('');
  const [planParams, setPlanParams] = useState<any>(null);

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

  // Fetch usage stats when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchUsageStats();
    }
  }, [user?.id, fetchUsageStats]);

  // Fetch plan parameters and calculate renewal date
  useEffect(() => {
    const fetchPlanData = async () => {
      if (!credits?.plan_type) return;

      try {
        const { data, error } = await supabase
          .from('plan_parameters')
          .select('*')
          .eq('plan_type', credits.plan_type)
          .single();

        if (!error && data) {
          setPlanParams(data);
          
          // Calculate renewal date
          const lastReset = new Date(credits.last_reset_date);
          const renewalDays = data.renewal_cycle_days || 30;
          const nextRenewal = new Date(lastReset);
          nextRenewal.setDate(nextRenewal.getDate() + renewalDays);
          
          setRenewalDate(nextRenewal.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }));
        }
      } catch (err) {
        console.error('Error fetching plan parameters:', err);
      }
    };

    fetchPlanData();
  }, [credits]);

  // Listen for credit updates and refresh both credits and usage stats
  useEffect(() => {
    const handleCreditsUpdate = () => {
      if (fetchCredits) fetchCredits();
      if (fetchUsageStats) fetchUsageStats();
    };

    window.addEventListener('creditsUpdated', handleCreditsUpdate);
    return () => window.removeEventListener('creditsUpdated', handleCreditsUpdate);
  }, []); // Empty dependency array to avoid re-creating the listener

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common:actions.backToDashboard')}
            </Button>
          </div>
          <div className="text-center py-8">
            <div className="text-muted-foreground">{t('common:actions.loading')}</div>
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
              {t('common:actions.backToDashboard')}
            </Button>
          </div>
          <div className="text-center py-8">
            <div className="text-muted-foreground">{t('dashboard:noDataAvailable')}</div>
          </div>
        </div>
      </Layout>
    );
  }

  // Get display name for plan
  const getPlanDisplayName = () => {
    if (credits.plan_type === 'broker_free' && profile?.broker_name) {
      return `${profile.broker_name} Free Plan`;
    }
    
    const planNames = {
      free_trial: 'Free Trial',
      broker_free: 'Broker Free',
      basic: 'Basic',
      standard: 'Standard',
      premium: 'Premium'
    };
    
    return planNames[credits.plan_type as keyof typeof planNames] || credits.plan_type;
  };

  const planDisplayName = getPlanDisplayName();

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
            {t('common:actions.backToDashboard')}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="gradient-primary p-3 rounded-xl shadow-glow-primary shrink-0">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {t('dashboard:credits.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('dashboard:credits.subtitle')}
            </p>
          </div>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard:credits.activePlan')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('dashboard:credits.activePlan')}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-base">
                    {planDisplayName}
                  </Badge>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('dashboard:credits.creditsRemaining')}</div>
                <div className="text-2xl font-bold text-foreground">
                  {totalCredits}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t('dashboard:credits.nextRenewal')}</div>
                <div className="text-base font-medium text-foreground">
                  {renewalDate || t('common:actions.loading')}
                </div>
              </div>

              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/pricing')}
                  className="w-full"
                >
                  {t('common:actions.upgradePlan')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                {t('dashboard:credits.macroCommentary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {credits.credits_queries_remaining}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('dashboard:credits.usedThisPeriod')}: {usageStats.queries}
                </div>
                <Badge variant={credits.credits_queries_remaining > 0 ? "default" : "destructive"} className="w-fit">
                  {credits.credits_queries_remaining > 0 ? t('dashboard:credits.available') : t('dashboard:credits.depleted')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {t('dashboard:credits.aiTrade')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {credits.credits_ideas_remaining}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('dashboard:credits.usedThisPeriod')}: {usageStats.ideas}
                </div>
                <Badge variant={credits.credits_ideas_remaining > 0 ? "default" : "destructive"} className="w-fit">
                  {credits.credits_ideas_remaining > 0 ? t('dashboard:credits.available') : t('dashboard:credits.depleted')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t('dashboard:reports')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {credits.credits_reports_remaining}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('dashboard:credits.usedThisPeriod')}: {usageStats.reports}
                </div>
                <Badge variant={credits.credits_reports_remaining > 0 ? "default" : "destructive"} className="w-fit">
                  {credits.credits_reports_remaining > 0 ? t('dashboard:credits.available') : t('dashboard:credits.depleted')}
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
              {t('dashboard:credits.usageSummary')}
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
                    {t('dashboard:credits.totalMacroUsed')}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {usageStats.ideas}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('dashboard:credits.totalAITradeUsed')}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {usageStats.reports}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('dashboard:credits.totalReportsUsed')}
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
                  {t('dashboard:credits.viewDetailedHistory')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}