import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const { createContext, useContext, useEffect, useState } = React;

// Debug logger — no-op in production to avoid leaking auth/session details
// (session expiry, token changes, user ids) into the browser console.
const debugLog = import.meta.env.DEV ? console.log : (..._args: unknown[]) => {};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    let previousSession: Session | null = null;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const timestamp = new Date().toISOString();
        const expiresIn = session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : 0;
        
        debugLog('[Auth] Auth state change:', {
          event,
          hasSession: !!session,
          hasPreviousSession: !!previousSession,
          sessionChanged: session?.access_token !== previousSession?.access_token,
          expiresAt: session?.expires_at,
          expiresIn: `${expiresIn}s`,
          timestamp
        });
        
        // CRITICAL: Ignore INITIAL_SESSION with null session (not a logout)
        if (event === 'INITIAL_SESSION' && !session) {
          debugLog('[Auth] Ignoring INITIAL_SESSION with null session (not a logout)');
          setLoading(false);
          return;
        }
        
        // Handle explicit sign out ONLY if session is null AND event is SIGNED_OUT
        if (event === 'SIGNED_OUT' && !session) {
          debugLog('[Auth] Explicit sign out detected');
          setUser(null);
          setSession(null);
          previousSession = null;
          setLoading(false);
          return;
        }
        
        // Debounce rapid auth events to avoid race conditions
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(async () => {
          setLoading(false);
          
          // For all other events, update session if present
          if (session) {
            debugLog('[Auth] Updating session:', {
              event,
              isTokenRefresh: event === 'TOKEN_REFRESHED',
              timestamp
            });
            setSession(session);
            setUser(session.user);
            previousSession = session;
          } else {
            // On transient null session, verify before clearing user
            debugLog('[Auth] Null session received, verifying...');
            const { data: { session: current } } = await supabase.auth.getSession();
            if (current) {
              debugLog('[Auth] Verified session exists, restoring');
              setSession(current);
              setUser(current.user);
              previousSession = current;
            } else {
              debugLog('[Auth] No session found after verification');
            }
            // Avoid flipping to null during token refresh
          }
        }, 200); // 200ms debounce
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      debugLog('[Auth] Initial session check:', {
        hasSession: !!currentSession,
        timestamp: new Date().toISOString()
      });
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      previousSession = currentSession;
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, []);

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

  const signOut = async () => {
    // Clear stay logged in preference
    localStorage.removeItem('alphalens_stay_logged_in');
    
    // Mark session as voluntary logout to prevent error toast
    localStorage.setItem('alphalens_voluntary_logout', 'true');
    
    // Clean up current session in database before signing out
    if (user) {
      const sessionId = getSessionId(user.id);
      try {
        await supabase
          .from('user_sessions')
          .update({ is_active: false, last_seen: new Date().toISOString() })
          .eq('session_id', sessionId)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error cleaning up session:', error);
      }
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    
    // Clear voluntary logout flag after signout
    setTimeout(() => {
      localStorage.removeItem('alphalens_voluntary_logout');
    }, 1000);
  };

  const value = {
    user,
    session,
    loading,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};