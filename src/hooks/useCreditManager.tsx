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

export function useCreditManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching credits:', error);
        return;
      }

      setCredits(data);
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
        console.error('Error decrementing credit:', error);
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
      
      // Trigger global credit refresh event for other components
      window.dispatchEvent(new Event('creditsUpdated'));
      
      return true;
    } catch (err) {
      console.error('Error decrementing credit:', err);
      return false;
    }
  }, [user?.id, toast, fetchCredits]);

  const checkCredits = useCallback((creditType: CreditType): boolean => {
    if (!credits) return false;
    
    switch (creditType) {
      case 'queries':
        return credits.credits_queries_remaining > 0;
      case 'ideas':
        return credits.credits_ideas_remaining > 0;
      case 'reports':
        return credits.credits_reports_remaining > 0;
      default:
        return false;
    }
  }, [credits]);

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

  return {
    credits,
    loading,
    fetchCredits,
    decrementCredit,
    checkCredits,
    initializeCredits
  };
}