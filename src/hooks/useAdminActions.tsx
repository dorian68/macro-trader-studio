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
      // D'abord récupérer tous les profils
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Ensuite récupérer les utilisateurs auth pour obtenir les emails
      // Utiliser une fonction admin pour récupérer les emails
      const usersWithEmails = await Promise.all(
        (profilesData || []).map(async (profile) => {
          try {
            // Récupérer l'email depuis auth.users via admin API
            const { data: { user }, error } = await supabase.auth.admin.getUserById(profile.user_id);
            
            return {
              ...profile,
              email: user?.email || 'N/A'
            } as AdminUser;
          } catch (error) {
            console.warn(`Could not fetch email for user ${profile.user_id}:`, error);
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

  const createUser = async (email: string, password: string, role: 'user' | 'admin' | 'super_user', brokerName?: string) => {
    setLoading(true);
    try {
      // Use Supabase Auth Admin API to create user
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          broker_name: brokerName || null
        }
      });

      if (error) throw error;

      if (data.user) {
        // Update the profile with the specified role (the trigger creates it with default role 'user')
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            role,
            status: 'approved', // Auto-approve admin-created users
            broker_name: brokerName || null
          })
          .eq('user_id', data.user.id);

        if (profileError) throw profileError;
      }

      toast({
        title: "Success",
        description: `User created successfully with ${role} role`,
      });

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
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
    createUser,
    loading
  };
}