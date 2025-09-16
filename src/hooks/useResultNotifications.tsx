import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationState {
  hasNewResults: boolean;
  latestResultId: string | null;
  notificationCount: number;
}

const STORAGE_KEY = 'alphalens_result_notifications';
const LAST_SEEN_KEY = 'alphalens_last_seen_result';

export function useResultNotifications() {
  const { user } = useAuth();
  const [notificationState, setNotificationState] = useState<NotificationState>({
    hasNewResults: false,
    latestResultId: null,
    notificationCount: 0
  });

  // Load initial state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotificationState(parsed);
      } catch (e) {
        console.warn('Failed to parse notification state from localStorage');
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notificationState));
  }, [notificationState]);

  // Check for new results
  const checkForNewResults = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: interactions, error } = await supabase
        .from('ai_interactions')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Failed to check for new results:', error);
        return;
      }

      if (interactions && interactions.length > 0) {
        const latestResult = interactions[0];
        const lastSeenId = localStorage.getItem(LAST_SEEN_KEY);

        // If we have a new result that hasn't been seen
        if (latestResult.id !== lastSeenId && latestResult.id !== notificationState.latestResultId) {
          setNotificationState(prev => ({
            hasNewResults: true,
            latestResultId: latestResult.id,
            notificationCount: prev.notificationCount + 1
          }));

          // Trigger native vibration on mobile if available
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new results:', error);
    }
  }, [user?.id, notificationState.latestResultId]);

  // Mark results as seen
  const markResultsAsSeen = useCallback(() => {
    if (notificationState.latestResultId) {
      localStorage.setItem(LAST_SEEN_KEY, notificationState.latestResultId);
    }
    setNotificationState({
      hasNewResults: false,
      latestResultId: null,
      notificationCount: 0
    });
  }, [notificationState.latestResultId]);

  // Set up polling interval
  useEffect(() => {
    if (!user?.id) return;

    // Check immediately
    checkForNewResults();

    // Set up 15-second polling
    const interval = setInterval(checkForNewResults, 15000);

    return () => clearInterval(interval);
  }, [user?.id, checkForNewResults]);

  return {
    hasNewResults: notificationState.hasNewResults,
    notificationCount: notificationState.notificationCount,
    markResultsAsSeen,
    checkForNewResults
  };
}