import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'user' | 'admin' | 'super_user';

interface UserRoleData {
  roles: AppRole[];
  loading: boolean;
  isUser: boolean;
  isAdmin: boolean;
  isSuperUser: boolean;
  hasRole: (role: AppRole) => boolean;
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoles() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('[useUserRole] Error fetching roles:', error);
          setRoles([]);
          return;
        }

        const userRoles = (data || []).map(r => r.role as AppRole);
        setRoles(userRoles);
        
        console.log('[useUserRole] User roles loaded:', {
          userId: user.id,
          roles: userRoles
        });
      } catch (error) {
        console.error('[useUserRole] Error:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchRoles();

      // Real-time subscription for role changes
      const subscription = supabase
        .channel('user-roles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_roles',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            console.log('[useUserRole] Roles changed, refetching...');
            fetchRoles();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setRoles([]);
      setLoading(false);
    }
  }, [user]);

  const hasRole = (role: AppRole): boolean => roles.includes(role);

  return {
    roles,
    loading,
    isUser: hasRole('user'),
    isAdmin: hasRole('admin'),
    isSuperUser: hasRole('super_user'),
    hasRole
  };
}
