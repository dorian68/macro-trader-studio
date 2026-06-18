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
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'super_user' | 'beta_tester'>();
  const [betaLoading, setBetaLoading] = useState(false);
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
  // Role management is restricted to super users at the database level
  // (RLS policy "Super users can manage roles"). Mirror that in the UI so
  // non-super users never attempt a write that would fail.
  const availableRoles: Array<'user' | 'admin' | 'super_user'> = ['user', 'admin', 'super_user'];

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    const result = await onUpdateStatus(user.user_id, selectedStatus, user.email);
    if (result.success) {
      onClose();
    }
  };

  // "Beta Tester" is not an RBAC role — it puts the user on the credit-limited,
  // time-unlimited 'beta' plan while leaving their role as 'user' (zero powers).
  // Writes go directly to profiles/user_credits; allowed because this section is
  // super_user-only and super_users bypass the beta-protection triggers.
  const handleGrantBeta = async () => {
    if (!user) return;
    setBetaLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const { data: planParams } = await supabase
        .from('plan_parameters')
        .select('max_queries, max_ideas, max_reports')
        .eq('plan_type', 'beta')
        .maybeSingle();
      const q = planParams?.max_queries ?? 100;
      const i = planParams?.max_ideas ?? 50;
      const r = planParams?.max_reports ?? 20;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_plan: 'beta', status: 'approved', updated_at: nowIso })
        .eq('user_id', user.user_id);
      if (profileError) throw profileError;

      const { error: creditsError } = await supabase
        .from('user_credits')
        .upsert([{
          user_id: user.user_id,
          plan_type: 'beta',
          credits_queries_remaining: q,
          credits_ideas_remaining: i,
          credits_reports_remaining: r,
          last_reset_date: nowIso,
          updated_at: nowIso,
        }], { onConflict: 'user_id', ignoreDuplicates: false });
      if (creditsError) throw creditsError;

      toast({
        title: 'Beta access granted',
        description: `${user.email} is now a beta tester (${q} queries · ${i} ideas · ${r} reports). Adjust or revoke via the Plan dialog.`,
      });
      onClose();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message ?? 'Failed to grant beta access',
        variant: 'destructive',
      });
    } finally {
      setBetaLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    if (selectedRole === 'beta_tester') {
      await handleGrantBeta();
      return;
    }
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

          {/* Role Update — Super Users only (RLS restricts user_roles writes to super_user) */}
          {isSuperUser && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Update Role</label>
              {isEditingSelf ? (
                <div className="p-3 border border-muted rounded-md bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    You cannot modify your own role. Contact another Super User to change your role.
                  </p>
                </div>
              ) : (
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
                      <SelectItem value="beta_tester">Beta Tester</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedRole === 'beta_tester' && (
                    <p className="text-xs text-muted-foreground">
                      Grants the credit-limited, time-unlimited beta plan. The user stays a
                      regular user (no admin powers). Adjust credits or revoke later via the Plan dialog.
                    </p>
                  )}
                  <Button
                    onClick={handleUpdateRole}
                    disabled={!selectedRole || loading || betaLoading}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    {(loading || betaLoading) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {selectedRole === 'beta_tester' ? 'Grant Beta Access' : 'Update Role'}
                  </Button>
                </>
              )}
            </div>
          )}
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