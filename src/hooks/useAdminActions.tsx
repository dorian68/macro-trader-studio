import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  user_id: string;
  broker_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin' | 'super_user';
  created_at: string;
  updated_at: string;
  email?: string;
}

export function useAdminActions() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async (): Promise<AdminUser[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user emails from auth.users via RPC call or direct query
      const usersWithEmails = await Promise.all(
        (data || []).map(async (profile) => {
          try {
            // For now, we'll use the user_id as a placeholder since we can't access auth.users directly
            return {
              ...profile,
              email: `user-${profile.user_id.slice(0, 8)}@...` // Placeholder since we can't access auth.users
            } as AdminUser;
          } catch {
            return {
              ...profile,
              email: 'N/A'
            } as AdminUser;
          }
        })
      );

      return usersWithEmails;
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
      return [];
    }
  };

  const updateUserStatus = async (userId: string, status: 'pending' | 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${status} successfully`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: 'user' | 'admin' | 'super_user') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User role updated to ${role} successfully`,
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchUsers,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    loading
  };
}