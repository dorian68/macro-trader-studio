import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const { useState, useEffect } = React;

interface Profile {
  id: string;
  user_id: string;
  broker_name: string | null;
  broker_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setProfile(data as Profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchProfile();

      // Set up real-time subscription for profile changes
      const subscription = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Profile updated via realtime:', payload);
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              setProfile(payload.new as Profile);
            } else if (payload.eventType === 'DELETE') {
              setProfile(null);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    isApproved: profile?.status === 'approved',
    isPending: profile?.status === 'pending',
    isRejected: profile?.status === 'rejected',
    isDeleted: (profile as any)?.is_deleted || false
  };
}