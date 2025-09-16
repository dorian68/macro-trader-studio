import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

interface CreateUserDialogProps {
  onCreateUser?: (email: string, password: string, role: 'user' | 'admin' | 'super_user', brokerName?: string) => Promise<{ success: boolean }>;
  loading?: boolean;
  onSuccess: () => void;
}

export function CreateUserDialog({ onCreateUser, loading: externalLoading, onSuccess }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [createMethod, setCreateMethod] = useState<'password' | 'admin'>('admin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin' | 'super_user',
    brokerName: '',
    active: true
  });
  const { toast } = useToast();
  const { isSuperUser } = useProfile();

  const loading = externalLoading || internalLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    if (createMethod === 'password' && !formData.password) {
      toast({
        title: "Error",
        description: "Password is required",
        variant: "destructive",
      });
      return;
    }

    // Only use admin creation method since password method requires service role
    setInternalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email.trim(),
          role: formData.role,
          brokerName: formData.brokerName.trim() || null,
          password: formData.password.trim() || undefined
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error during creation');
      }

      toast({
        title: "✅ User Created",
        description: `User ${formData.email} has been created with role ${formData.role}`,
      });

      resetForm();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Unable to create user",
        variant: "destructive",
      });
    } finally {
      setInternalLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: 'user',
      brokerName: '',
      active: true
    });
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a user account with specific role and status.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: 'user' | 'admin' | 'super_user') => 
                setFormData(prev => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_user">Super User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Leave empty for passwordless account"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brokerName">Broker Name (Optional)</Label>
            <Input
              id="brokerName"
              value={formData.brokerName}
              onChange={(e) => setFormData(prev => ({ ...prev, brokerName: e.target.value }))}
              placeholder="Broker name"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active">Active Account (Approved)</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}