import * as React from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const { createContext, useContext, useEffect, useState } = React;

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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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