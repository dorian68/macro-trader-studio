import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isFreeTrialExpired } from '@/lib/trial';

const { useEffect } = React;

interface Profile {
  id: string;
  user_id: string;
  broker_name: string | null;
  broker_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  user_plan: 'basic' | 'standard' | 'premium' | 'free_trial' | 'broker_free' | null;
  trial_started_at: string | null;
  trial_used: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
  return data as Profile | null;
}

async function fetchFreeTrialDurationDays(): Promise<number> {
  const { data, error } = await supabase
    .from('plan_parameters')
    .select('trial_duration_days')
    .eq('plan_type', 'free_trial')
    .maybeSingle();

  if (error) {
    console.error('Error fetching free-trial duration:', error);
    return 7;
  }
  return data?.trial_duration_days ?? 7;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile = null,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
    staleTime: Infinity, // Profile only changes via realtime — never refetch on navigation
  });
  const {
    data: trialDurationDays = 7,
    isLoading: trialDurationLoading,
  } = useQuery({
    queryKey: ['free-trial-duration'],
    queryFn: fetchFreeTrialDurationDays,
    staleTime: Infinity,
  });

  // Realtime subscription to keep cache fresh
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile updated via realtime:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            queryClient.setQueryData(['profile', user.id], payload.new as Profile);
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(['profile', user.id], null);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, queryClient]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // Optimistic update in cache
      queryClient.setQueryData(['profile', user.id], { ...profile, ...updates });
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error };
    }
  };

  const trialStartedAt = profile?.trial_started_at;
  const userPlan = profile?.user_plan;
  const isTrialExpired = isFreeTrialExpired(userPlan, trialStartedAt, trialDurationDays);

  return {
    profile,
    loading: loading || trialDurationLoading,
    error,
    refetch,
    updateProfile,
    isApproved: profile?.status === 'approved',
    isPending: profile?.status === 'pending',
    isRejected: profile?.status === 'rejected',
    isDeleted: profile?.is_deleted || false,
    isTrialExpired,
    trialDurationDays,
    userPlan,
  };
}
