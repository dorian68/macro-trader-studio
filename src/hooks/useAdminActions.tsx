import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  user_id: string;
  broker_name: string | null;
  broker_id: string | null;
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
      // Utiliser la Edge Function pour récupérer les utilisateurs avec leurs emails
      const { data, error } = await supabase.functions.invoke('fetch-users-with-emails');

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data || !data.users) {
        throw new Error('No users data returned from Edge Function');
      }

      return data.users as AdminUser[];
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
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
      console.log('Attempting to delete user:', userId);
      
      // Call our Edge Function to delete user with proper permissions
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      console.log('Delete response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Failed to delete user';
        console.error('Function returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      toast({
        title: "Succès",
        description: "Utilisateur supprimé avec succès",
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (email: string, password: string, role: 'user' | 'admin' | 'super_user', brokerId?: string) => {
    setLoading(true);
    try {
      // Use the edge function to create user with proper broker assignment
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim(),
          role,
          brokerId: brokerId || null,
          password: password.trim()
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error during creation');
      }

      toast({
        title: "Success",
        description: `User created successfully with ${role} role`,
      });

      return { success: true, user: response.data };
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