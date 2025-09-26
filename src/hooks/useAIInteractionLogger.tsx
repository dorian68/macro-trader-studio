import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCreditManager, CreditType } from '@/hooks/useCreditManager';

type FeatureName = 'trade_setup' | 'market_commentary' | 'report';

interface LogInteractionParams {
  featureName: FeatureName;
  userQuery: string;
  aiResponse: any;
}

export function useAIInteractionLogger() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { decrementCredit, checkCredits } = useCreditManager();

  const getCreditTypeForFeature = (featureName: FeatureName): CreditType => {
    switch (featureName) {
      case 'trade_setup':
        return 'ideas'; // AI Setup → Investment Ideas
      case 'market_commentary':
        return 'queries'; // Macro Commentary → Queries
      case 'report':
        return 'reports'; // Reports → Reports
      default:
        return 'queries';
    }
  };

  const checkAndLogInteraction = useCallback(async ({ 
    featureName, 
    userQuery, 
    aiResponse 
  }: LogInteractionParams): Promise<boolean> => {
    if (!user?.id) {
      console.warn('No authenticated user found for AI interaction logging');
      return false;
    }

    const creditType = getCreditTypeForFeature(featureName);
    
    // Check if user has credits before processing
    if (!checkCredits(creditType)) {
      toast({
        title: "Credit limit reached",
        description: "Please upgrade your plan to continue using this feature",
        variant: "destructive"
      });
      return false;
    }

    // Decrement credit
    const success = await decrementCredit(creditType);
    if (!success) {
      return false;
    }

    // Log the interaction
    try {
      const { error } = await supabase
        .from('ai_interactions')
        .insert({
          user_id: user.id,
          feature_name: featureName,
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
  }, [user?.id, toast, decrementCredit, checkCredits]);

  const logInteraction = useCallback(async ({ 
    featureName, 
    userQuery, 
    aiResponse 
  }: LogInteractionParams) => {
    return checkAndLogInteraction({ featureName, userQuery, aiResponse });
  }, [checkAndLogInteraction]);

  return { 
    logInteraction, 
    checkCredits: (featureName: FeatureName) => checkCredits(getCreditTypeForFeature(featureName)) 
  };
}