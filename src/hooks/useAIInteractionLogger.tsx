import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { normalizeFeatureName } from '@/lib/feature-mapper';

type FeatureName = 'trade_setup' | 'ai_trade_setup' | 'market_commentary' | 'macro_commentary' | 'report';

interface LogInteractionParams {
  featureName: FeatureName;
  userQuery: string;
  aiResponse: any;
  jobId?: string;
}

export function useAIInteractionLogger() {
  const { user } = useAuth();
  const { toast } = useToast();

  const logInteraction = useCallback(async ({ 
    featureName, 
    userQuery, 
    aiResponse,
    jobId 
  }: LogInteractionParams): Promise<boolean> => {
    if (!user?.id) {
      console.warn('No authenticated user found for AI interaction logging');
      return false;
    }

    try {
      const normalizedFeatureName = normalizeFeatureName(featureName);
      const { error } = await supabase
        .from('ai_interactions')
        .insert({
          user_id: user.id,
          job_id: jobId || null,
          feature_name: normalizedFeatureName,
          user_query: userQuery,
          ai_response: aiResponse
        });

      if (error) {
        console.error('Failed to log AI interaction:', error);
        toast({
          title: "Warning",
          description: "Failed to save interaction to history",
          variant: "destructive"
        });
      }
      return true;
    } catch (err) {
      console.error('Error logging AI interaction:', err);
      return false;
    }
  }, [user?.id, toast]);

  return { logInteraction };
}
