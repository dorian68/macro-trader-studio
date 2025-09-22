import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useSessionManager() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const currentSessionRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate or retrieve stable device ID
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('alphalens_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('alphalens_device_id', deviceId);
    }
    return deviceId;
  };

  // Generate stable session ID
  const getSessionId = (userId: string) => {
    const deviceId = getDeviceId();
    return `${userId}:${deviceId}`;
  };

  // Generate device info for session tracking
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    return `${platform} - ${userAgent.substring(0, 100)}`;
  };

  // Track current session
  useEffect(() => {
    // Clear previous interval if it exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (session && user) {
      const sessionId = getSessionId(user.id);
      currentSessionRef.current = sessionId;

      // Register this session and invalidate others
      const registerSession = async () => {
        try {
          // First, invalidate previous sessions
          await supabase.rpc('invalidate_previous_sessions', {
            current_user_id: user.id,
            current_session_id: sessionId
          });

          // Then upsert the current session
          await supabase.from('user_sessions').upsert({
            user_id: user.id,
            session_id: sessionId,
            device_info: getDeviceInfo(),
            is_active: true,
            last_seen: new Date().toISOString()
          }, {
            onConflict: 'user_id,session_id'
          });

          // Set up periodic session validation
          const validateSession = async () => {
            const { data } = await supabase
              .from('user_sessions')
              .select('is_active')
              .eq('user_id', user.id)
              .eq('session_id', sessionId)
              .single();

            if (!data?.is_active) {
              toast({
                title: "Session Expired",
                description: "Your account has been signed in from another device.",
                variant: "destructive",
              });
              await signOut();
            }
          };

          // Check session validity every 30 seconds
          intervalRef.current = setInterval(validateSession, 30000);
        } catch (error) {
          console.error('Error managing session:', error);
        }
      };

      registerSession();
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, toast, signOut]); // Removed session from dependencies to prevent re-registration on token refresh

  // Listen for session invalidation via realtime
  useEffect(() => {
    if (user && currentSessionRef.current) {
      const channel = supabase
        .channel('session-management')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_sessions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updatedSession = payload.new as any;
            
            // If this session was deactivated and it's our current session
            if (
              !updatedSession.is_active && 
              updatedSession.session_id === currentSessionRef.current
            ) {
              toast({
                title: "Session Expired",
                description: "Your account has been signed in from another device.",
                variant: "destructive",
              });
              signOut();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast, signOut]);

  // Clean up session on sign out
  useEffect(() => {
    const cleanup = () => {
      if (currentSessionRef.current && user) {
        supabase
          .from('user_sessions')
          .update({ is_active: false, last_seen: new Date().toISOString() })
          .eq('session_id', currentSessionRef.current)
          .eq('user_id', user.id);
      }
      // Clear interval on cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Cleanup on component unmount or user change
    return cleanup;
  }, [user?.id]);
}