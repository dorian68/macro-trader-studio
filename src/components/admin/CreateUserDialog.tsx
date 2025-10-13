import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { useBrokerActions } from '@/hooks/useBrokerActions';

interface CreateUserDialogProps {
  onCreateUser: (email: string, password: string, role: 'user' | 'admin' | 'super_user', brokerId?: string) => Promise<any>;
  loading: boolean;
  onSuccess: () => void;
}

export function CreateUserDialog({ onCreateUser, loading, onSuccess }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin' | 'super_user'>('user');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [brokers, setBrokers] = useState<any[]>([]);
  const { toast } = useToast();
  const { isSuperUser } = useUserRole();
  const { profile } = useProfile();
  const { fetchBrokers } = useBrokerActions();

  useEffect(() => {
    if (open) {
      if (isSuperUser) {
        fetchBrokers().then(setBrokers);
      } else {
        // Admin users can only create users for their own broker
        if (profile?.broker_id) {
          setSelectedBrokerId(profile.broker_id);
        }
      }
    }
  }, [open, isSuperUser, profile, fetchBrokers]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setRole('user');
    setSelectedBrokerId(isSuperUser ? '' : profile?.broker_id || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Email and password are required",
        variant: "destructive"
      });
      return;
    }

    if (!selectedBrokerId && isSuperUser) {
      toast({
        title: "Validation Error",
        description: "Please select a broker",
        variant: "destructive"
      });
      return;
    }

    const result = await onCreateUser(email, password, role, selectedBrokerId);
    if (result.success) {
      setOpen(false);
      resetForm();
      onSuccess();
    }
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
            Create a user account with specific role and broker assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={(value: 'user' | 'admin' | 'super_user') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {isSuperUser && <SelectItem value="super_user">Super User</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Broker</Label>
            {isSuperUser ? (
              <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a broker" />
                </SelectTrigger>
                <SelectContent>
                  {brokers.map((broker) => (
                    <SelectItem key={broker.id} value={broker.id}>
                      {broker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 border rounded-md bg-muted">
                <span className="text-sm text-muted-foreground">
                  Users will be assigned to your broker automatically
                </span>
              </div>
            )}
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