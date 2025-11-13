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
          // ✅ Check if user is soft-deleted before registering session
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_deleted')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (profile?.is_deleted) {
            console.log('🚫 [SessionManager] User is soft-deleted, blocking session registration');
            await signOut();
            return;
          }
          
          console.log('🔐 [SessionManager] Registering session:', { userId: user.id, sessionId });
          
          // ✅ FIX 6: Temporarily disable aggressive session invalidation for testing
          // COMMENTED OUT to test if this causes the logout loops
          // await supabase.rpc('invalidate_previous_sessions', {
          //   current_user_id: user.id,
          //   current_session_id: sessionId
          // });

          // Then update the current session; if none updated, insert
          const updatePayload = {
            device_info: getDeviceInfo(),
            is_active: true,
            last_seen: new Date().toISOString(),
          };
          const { data: updatedRows, error: updateError } = await supabase
            .from('user_sessions')
            .update(updatePayload)
            .eq('user_id', user.id)
            .eq('session_id', sessionId)
            .select('user_id'); // returns rows if any updated

          if (updateError) {
            console.error('❌ [SessionManager] Session update error:', updateError);
          } else {
            console.log('✅ [SessionManager] Session updated:', { rowsUpdated: updatedRows?.length });
          }

          if (!updatedRows || updatedRows.length === 0) {
            console.log('➕ [SessionManager] Creating new session record');
            
            // Retry logic for session insert
            const tryInsertSession = async (attempt = 1): Promise<void> => {
              const maxAttempts = 4;
              const backoffMs = 300 * Math.pow(2, attempt - 1); // 300, 600, 1200, 2400
              
              // Ensure we have a valid session token before inserting
              const { data: { session: current } } = await supabase.auth.getSession();
              if (!current) {
                if (attempt <= maxAttempts) {
                  console.log(`⚠️ [SessionManager] No session token, retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`);
                  setTimeout(() => tryInsertSession(attempt + 1), backoffMs);
                } else {
                  console.warn('⚠️ [SessionManager] Insert skipped: no session after retries');
                }
                return;
              }
              
              const { error: insertError } = await supabase
                .from('user_sessions')
                .insert({
                  user_id: user.id,
                  session_id: sessionId,
                  device_info: updatePayload.device_info,
                  is_active: true,
                  last_seen: updatePayload.last_seen,
                });
                
              if (insertError) {
                const code = insertError.code;
                const status = (insertError as any)?.status;
                
                // Retry on 401/42501/PGRST301 errors
                if ((code === 'PGRST301' || code === '42501' || status === 401) && attempt < maxAttempts) {
                  console.log(`⚠️ [SessionManager] Insert failed (${code || status}), retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`);
                  setTimeout(() => tryInsertSession(attempt + 1), backoffMs);
                } else if (code === 'PGRST301' || code === '42501') {
                  console.log('⚠️ [SessionManager] RLS prevented insert after retries');
                } else {
                  console.error('❌ [SessionManager] Session insert error:', insertError);
                }
              } else {
                console.log('✅ [SessionManager] Session created');
              }
            };
            
            tryInsertSession();
          }

          // Set up periodic session validation
          const validateSession = async () => {
            try {
              console.log('🔍 [SessionManager] Validating session:', { userId: user.id, sessionId });
              
              const { data, error } = await supabase
                .from('user_sessions')
                .select('is_active')
                .eq('user_id', user.id)
                .eq('session_id', sessionId)
                .maybeSingle();

              if (error) {
                console.error('❌ [SessionManager] Session validate error:', error);
                return;
              }

              if (!data) {
                console.log('⚠️ [SessionManager] No session data found, recreating...');
                // If missing, recreate/activate without disconnecting the user
                const updatePayload = {
                  device_info: getDeviceInfo(),
                  is_active: true,
                  last_seen: new Date().toISOString(),
                };

                const { data: updatedRows } = await supabase
                  .from('user_sessions')
                  .update(updatePayload)
                  .eq('user_id', user.id)
                  .eq('session_id', sessionId)
                  .select('user_id');

                if (!updatedRows || updatedRows.length === 0) {
                  // Only recreate if user is still authenticated
                  const { data: { session: currentSession } } = await supabase.auth.getSession();
                  if (currentSession) {
                    console.log('➕ [SessionManager] Recreating session record');
                    const { error: insertError } = await supabase
                      .from('user_sessions')
                      .insert({
                        user_id: user.id,
                        session_id: sessionId,
                        device_info: updatePayload.device_info,
                        is_active: true,
                        last_seen: updatePayload.last_seen,
                      });
                    if (insertError) {
                      // Ignore RLS violations during token refresh
                      if (insertError.code !== 'PGRST301' && insertError.code !== '42501') {
                        console.error('❌ [SessionManager] Session re-create error:', insertError);
                      }
                    }
                  }
                }
                return;
              }

              if (data.is_active === false) {
                // CRITICAL: Check for active jobs before signing out
                const activeJobsCount = parseInt(sessionStorage.getItem('activeJobsCount') || '0', 10);
                
                if (activeJobsCount > 0) {
                  console.warn('⚠️ [SessionManager] Session deactivated but active jobs exist. DO NOT sign out.', {
                    activeJobsCount,
                    timestamp: new Date().toISOString()
                  });
                  return;
                }
                
                console.log('🚫 [SessionManager] Session deactivated, signing out');
                const isVoluntaryLogout = localStorage.getItem('alphalens_voluntary_logout') === 'true';
                if (!isVoluntaryLogout) {
                  toast({
                    title: "Session Expired",
                    description: "Your account has been signed in from another device.",
                    variant: "destructive",
                  });
                }
                await signOut();
              } else {
                console.log('✅ [SessionManager] Session is valid');
              }
            } catch (e) {
              console.error('❌ [SessionManager] Session validate exception:', e);
            }
          };

          // Check session validity every 60 seconds to avoid triggering during requests
          intervalRef.current = setInterval(validateSession, 60000);
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
              // CRITICAL: Check for active jobs before signing out
              const activeJobsCount = parseInt(sessionStorage.getItem('activeJobsCount') || '0', 10);
              
              if (activeJobsCount > 0) {
                console.warn('⚠️ [SessionManager] Realtime session deactivation but active jobs exist. DO NOT sign out.', {
                  activeJobsCount,
                  timestamp: new Date().toISOString()
                });
                return;
              }
              
              const isVoluntaryLogout = localStorage.getItem('alphalens_voluntary_logout') === 'true';
              if (!isVoluntaryLogout) {
                toast({
                  title: "Session Expired",
                  description: "Your account has been signed in from another device.",
                  variant: "destructive",
                });
              }
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

  // Note: Session deactivation is now only handled explicitly in useAuth.signOut()
  // Removed automatic is_active=false on unmount to prevent ghost logouts during token refresh
}