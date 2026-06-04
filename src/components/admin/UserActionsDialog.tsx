import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, User, Crown, Trash2, Key, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    user_id: string;
    email?: string;
    broker_name: string | null;
    status: 'pending' | 'approved' | 'rejected';
    role?: 'user' | 'admin' | 'super_user';
  } | null;
  onUpdateStatus: (userId: string, status: 'pending' | 'approved' | 'rejected', userEmail?: string) => Promise<{ success: boolean }>;
  onUpdateRole: (userId: string, role: 'user' | 'admin' | 'super_user') => Promise<{ success: boolean }>;
  onDeleteUser: (userId: string) => Promise<{ success: boolean }>;
  loading: boolean;
}

const roleIcons = {
  user: User,
  admin: Shield,
  super_user: Crown
};

const statusColors = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger'
} as const;

const roleColors = {
  user: 'secondary',
  admin: 'primary',
  super_user: 'accent'
} as const;

export function UserActionsDialog({
  isOpen,
  onClose,
  user,
  onUpdateStatus,
  onUpdateRole,
  onDeleteUser,
  loading
}: UserActionsDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>();
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'super_user'>();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { isSuperUser } = useUserRole();
  const { profile } = useProfile();
  const { toast } = useToast();

  // Validate password confirmation
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else if (newPassword && newPassword.length < 10) {
      setPasswordError('Password must be at least 10 characters');
    } else {
      setPasswordError('');
    }
  }, [newPassword, confirmPassword]);

  // Reset password form when dialog closes
  useEffect(() => {
    if (!isPasswordDialogOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    }
  }, [isPasswordDialogOpen]);

  if (!user) return null;

  // Check if current user is editing their own account
  const isEditingSelf = profile?.user_id === user.user_id;
  // Check if admin is trying to edit roles (only superUsers can assign superUser role)
  const canEditRoles = isSuperUser || (!isEditingSelf);
  // Available roles based on permissions
  const availableRoles = isSuperUser 
    ? ['user', 'admin', 'super_user'] 
    : ['user', 'admin']; // Admins can only assign user/admin roles

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    const result = await onUpdateStatus(user.user_id, selectedStatus, user.email);
    if (result.success) {
      onClose();
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    const result = await onUpdateRole(user.user_id, selectedRole);
    if (result.success) {
      onClose();
    }
  };

  const handleDeleteUser = async () => {
    const result = await onDeleteUser(user.user_id);
    if (result.success) {
      onClose();
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          userId: user.user_id,
          newPassword: newPassword
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Password Updated",
        description: `Password successfully updated for ${user.email}`,
      });

      setIsPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password update failed:', err);
      toast({
        title: "❌ Password Update Failed",
        description: err.message || "Check permissions or inputs.",
        variant: "destructive"
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const RoleIcon = roleIcons[user.role];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RoleIcon className="h-5 w-5" />
            Manage User
          </DialogTitle>
          <DialogDescription>
            Update user status and role permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm font-mono">{user.email || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Broker:</span>
              <span className="text-sm">{user.broker_name || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <Badge variant={statusColors[user.status] as any}>
                {user.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Role:</span>
              <Badge variant={roleColors[user.role] as any}>
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Status Update */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Status</label>
            <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleUpdateStatus} 
              disabled={!selectedStatus || loading}
              size="sm"
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Status
            </Button>
          </div>

          {/* Role Update */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Role</label>
            {isEditingSelf ? (
              <div className="p-3 border border-muted rounded-md bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  You cannot modify your own role. Contact a Super User to change your role.
                </p>
              </div>
            ) : canEditRoles ? (
              <>
                <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role === 'super_user' ? 'Super User' : role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleUpdateRole} 
                  disabled={!selectedRole || loading}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Update Role
                </Button>
              </>
            ) : (
              <div className="p-3 border border-muted rounded-md bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  You don't have permission to modify roles.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Section - Super User Only */}
        {isSuperUser && (
          <div className="space-y-2 pt-4 border-t">
            <Button
              onClick={() => setIsPasswordDialogOpen(true)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Delete User - Only for Super Users */}
          {isSuperUser && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user account
                    and remove all associated data from our servers.
                    <br /><br />
                    <strong>User:</strong> {user.email}
                    <br />
                    <strong>Role:</strong> {user.role.replace('_', ' ')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteUser}
                    disabled={loading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Password</DialogTitle>
            <DialogDescription>
              Set a new password for {user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={10}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={10}
                required
              />
            </div>
            {passwordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={!newPassword || !confirmPassword || !!passwordError || passwordLoading}
            >
              {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}