import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type CreditType = 'queries' | 'ideas' | 'reports';

interface UserCredits {
  id: string;
  user_id: string;
  plan_type: 'basic' | 'standard' | 'premium' | 'free_trial' | 'broker_free';
  credits_queries_remaining: number;
  credits_ideas_remaining: number;
  credits_reports_remaining: number;
  last_reset_date: string;
}

interface EngagedCounts {
  queries: number;
  ideas: number;
  reports: number;
}

export function useCreditManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [engaged, setEngaged] = useState<EngagedCounts>({ queries: 0, ideas: 0, reports: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch credits and engaged counts in parallel
      const [creditsResult, engagedResult] = await Promise.all([
        supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('credits_engaged')
          .select('feature')
          .eq('user_id', user.id)
      ]);

      if (creditsResult.error) {
        console.error('Error fetching credits:', creditsResult.error);
        return;
      }

      setCredits(creditsResult.data);

      // Count engaged by feature
      const engagedRows = engagedResult.data || [];
      setEngaged({
        queries: engagedRows.filter(r => r.feature === 'queries').length,
        ideas: engagedRows.filter(r => r.feature === 'ideas').length,
        reports: engagedRows.filter(r => r.feature === 'reports').length,
      });
    } catch (err) {
      console.error('Error fetching credits:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const initializeCredits = useCallback(async (planType: 'basic' | 'standard' | 'premium' | 'free_trial' | 'broker_free' = 'free_trial') => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.rpc('initialize_user_credits', {
        target_user_id: user.id,
        target_plan_type: planType
      });

      if (error) {
        console.error('Error initializing credits:', error);
        return;
      }

      await fetchCredits();
    } catch (err) {
      console.error('Error initializing credits:', err);
    }
  }, [user?.id, fetchCredits]);

  const decrementCredit = useCallback(async (creditType: CreditType): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to use this feature",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('decrement_credit', {
        target_user_id: user.id,
        credit_type: creditType
      });

      if (error) {
        console.error('⚠️ [CreditSystem] Error decrementing credit:', error);
        toast({
          title: "Error",
          description: "Failed to process credit usage",
          variant: "destructive"
        });
        return false;
      }

      if (!data) {
        toast({
          title: "Credit limit reached",
          description: "Please upgrade your plan to continue using this feature",
          variant: "destructive"
        });
        return false;
      }

      // Force immediate refresh of credits
      await fetchCredits();
      
      console.log(`✅ [CreditSystem] Deducted 1 credit for ${creditType}`);
      
      // Trigger global credit refresh event for other components
      window.dispatchEvent(new Event('creditsUpdated'));
      
      return true;
    } catch (err) {
      console.error('⚠️ [CreditSystem] Error decrementing credit:', err);
      return false;
    }
  }, [user?.id, toast, fetchCredits]);

  const checkCredits = useCallback(async (creditType: CreditType): Promise<boolean> => {
    if (!credits || !user?.id) return false;
    
    try {
      // 1. Obtenir les crédits totaux
      const creditColumn = {
        'queries': 'credits_queries_remaining',
        'ideas': 'credits_ideas_remaining',
        'reports': 'credits_reports_remaining'
      }[creditType];
      
      const totalCredits = credits[creditColumn as keyof typeof credits] as number || 0;
      
      // 2. Obtenir les crédits engagés
      const featureMap = {
        'queries': 'queries',
        'ideas': 'ideas',
        'reports': 'reports'
      };
      
      const { data: engaged, error } = await supabase
        .from('credits_engaged')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature', featureMap[creditType]);
      
      if (error) {
        console.error('[CreditManager] Error fetching engaged credits:', error);
        return false;
      }
      
      const engagedCount = engaged?.length || 0;
      const availableCredits = totalCredits - engagedCount;
      
      console.log(`✅ [CreditSystem] Credit check for ${creditType}:`, {
        total: totalCredits,
        engaged: engagedCount,
        available: availableCredits
      });
      
      return availableCredits > 0;
    } catch (err) {
      console.error('[CreditManager] Error checking credits:', err);
      return false;
    }
  }, [credits, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchCredits();
    }
  }, [user?.id, fetchCredits]);

  // Initialize credits for new users
  useEffect(() => {
    if (user?.id && !loading && !credits) {
      initializeCredits();
    }
  }, [user?.id, loading, credits, initializeCredits]);

  const activateFreeTrial = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('activate-free-trial');
      
      if (error) {
        console.error('Error activating free trial:', error);
        toast({
          title: "Activation Failed",
          description: error.message || "Could not activate Free Trial. Please try again.",
          variant: "destructive"
        });
        return { data: null, error };
      }
      
      // Refresh credits after activation
      await fetchCredits();
      window.dispatchEvent(new Event('creditsUpdated'));
      
      return { data, error: null };
    } catch (err) {
      console.error('Free trial activation error:', err);
      return { data: null, error: err };
    }
  }, [toast, fetchCredits]);

  // Effective balances: remaining minus engaged
  const effectiveQueries = Math.max(0, (credits?.credits_queries_remaining ?? 0) - engaged.queries);
  const effectiveIdeas = Math.max(0, (credits?.credits_ideas_remaining ?? 0) - engaged.ideas);
  const effectiveReports = Math.max(0, (credits?.credits_reports_remaining ?? 0) - engaged.reports);

  return {
    credits,
    engaged,
    effectiveQueries,
    effectiveIdeas,
    effectiveReports,
    loading,
    fetchCredits,
    decrementCredit,
    checkCredits,
    initializeCredits,
    activateFreeTrial
  };
}