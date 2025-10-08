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
   * Check if user has available credits (total - engaged > 0)
   * Returns: { canLaunch: boolean, message?: string }
   */
  const canLaunchJob = useCallback(async (feature: FeatureType): Promise<{ canLaunch: boolean; message?: string }> => {
    if (!user?.id) {
      return { canLaunch: false, message: 'User not authenticated' };
    }

    try {
      // 1. Get total credits for feature
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select(FEATURE_TO_CREDIT_COLUMN[feature])
        .eq('user_id', user.id)
        .single();

      if (creditsError) {
        console.error('[CreditEngagement] Error fetching credits:', creditsError);
        return { canLaunch: false, message: 'Failed to check credits' };
      }

      const totalCredits = credits?.[FEATURE_TO_CREDIT_COLUMN[feature]] || 0;

      // 2. Get engaged credits for this feature
      const { data: engaged, error: engagedError } = await supabase
        .from('credits_engaged')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature', feature);

      if (engagedError) {
        console.error('[CreditEngagement] Error fetching engaged credits:', engagedError);
        return { canLaunch: false, message: 'Failed to check engaged credits' };
      }

      const engagedCredits = engaged?.length || 0;
      const availableCredits = totalCredits - engagedCredits;

      console.log(`[CreditEngagement] Credit check for ${feature}:`, {
        total: totalCredits,
        engaged: engagedCredits,
        available: availableCredits
      });

      if (availableCredits <= 0) {
        if (engagedCredits > 0) {
          return { 
            canLaunch: false, 
            message: `You already have an active ${feature} request using your last available credit.` 
          };
        } else {
          return { 
            canLaunch: false, 
            message: `You have no credits left for ${feature}.` 
          };
        }
      }

      return { canLaunch: true };
    } catch (err) {
      console.error('[CreditEngagement] Unexpected error:', err);
      return { canLaunch: false, message: 'Unexpected error checking credits' };
    }
  }, [user?.id]);

  /**
   * Reserve (engage) one credit temporarily for a job
   */
  const engageCredit = useCallback(async (feature: FeatureType, jobId: string): Promise<boolean> => {
    if (!user?.id) {
      console.error('[CreditEngagement] Cannot engage credit: user not authenticated');
      return false;
    }

    try {
      const { error } = await supabase
        .from('credits_engaged')
        .insert({
          user_id: user.id,
          feature,
          job_id: jobId
        });

      if (error) {
        console.error('[CreditEngagement] Error engaging credit:', error);
        return false;
      }

      console.log(`[CreditEngagement] Credit engaged for job ${jobId} (${feature})`);
      return true;
    } catch (err) {
      console.error('[CreditEngagement] Unexpected error engaging credit:', err);
      return false;
    }
  }, [user?.id]);

  /**
   * Release (disengage) a reserved credit when job completes or fails
   */
  const releaseCredit = useCallback(async (jobId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('credits_engaged')
        .delete()
        .eq('job_id', jobId);

      if (error) {
        console.error('[CreditEngagement] Error releasing credit:', error);
      } else {
        console.log(`[CreditEngagement] Credit released for job ${jobId}`);
      }
    } catch (err) {
      console.error('[CreditEngagement] Unexpected error releasing credit:', err);
    }
  }, []);

  return {
    canLaunchJob,
    engageCredit,
    releaseCredit
  };
}
