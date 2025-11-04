import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type FeatureType = 'queries' | 'ideas' | 'reports';

// Map feature names to credit columns
const FEATURE_TO_CREDIT_COLUMN: Record<FeatureType, string> = {
  'queries': 'credits_queries_remaining',
  'ideas': 'credits_ideas_remaining',
  'reports': 'credits_reports_remaining'
};

export function useCreditEngagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  /**
   * ✅ ATOMIC: Check and engage credit in a single transaction
   * Replaces the race-prone canLaunchJob + engageCredit pattern
   */
  const tryEngageCredit = useCallback(async (
    feature: FeatureType, 
    jobId: string
  ): Promise<{ success: boolean; available: number; message: string }> => {
    if (!user?.id) {
      console.error('[CreditEngagement] Cannot engage credit: user not authenticated');
      return { success: false, available: 0, message: 'User not authenticated' };
    }

    try {
      console.log(`[Credit] 🔐 Attempting atomic engagement:`, {
        user: user.id,
        feature,
        jobId,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase.rpc('try_engage_credit', {
        p_user_id: user.id,
        p_feature: feature,
        p_job_id: jobId
      });

      if (error) {
        console.error('[CreditEngagement] ❌ RPC error:', error);
        return { 
          success: false, 
          available: 0, 
          message: 'Failed to verify credits' 
        };
      }

      const result = data?.[0];
      
      if (!result) {
        console.error('[CreditEngagement] ❌ No result returned from RPC');
        return { 
          success: false, 
          available: 0, 
          message: 'Credit verification failed' 
        };
      }

      if (result.success) {
        console.log(`[Credit] ✅ Engagement succeeded:`, {
          success: true,
          available: result.available_credits,
          message: result.message
        });
      } else {
        console.log(`[Credit] ❌ Engagement failed:`, {
          success: false,
          available: result.available_credits,
          message: result.message
        });
      }

      return {
        success: result.success,
        available: result.available_credits || 0,
        message: result.message || 'Unknown error'
      };
    } catch (err) {
      console.error('[CreditEngagement] ❌ Unexpected error:', err);
      return { 
        success: false, 
        available: 0, 
        message: 'Unexpected error engaging credit' 
      };
    }
  }, [user?.id]);

  /**
   * @deprecated Use tryEngageCredit instead (atomic check + engage)
   */
  const releaseCredit = useCallback(async (jobId: string): Promise<void> => {
    console.warn('[CreditEngagement] ⚠️ releaseCredit is deprecated - trigger handles this automatically');
  }, []);

  return {
    tryEngageCredit,
    releaseCredit // Kept for backward compatibility but is now a no-op
  };
}
