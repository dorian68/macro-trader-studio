import { useState } from 'react';
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
import { Loader2, Shield, User, Crown, Trash2 } from "lucide-react";
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
import { useProfile } from "@/hooks/useProfile";

interface UserActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    user_id: string;
    email?: string;
    broker_name: string | null;
    status: 'pending' | 'approved' | 'rejected';
    role: 'user' | 'admin' | 'super_user';
  } | null;
  onUpdateStatus: (userId: string, status: 'pending' | 'approved' | 'rejected') => Promise<{ success: boolean }>;
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
  const { isSuperUser } = useProfile();

  if (!user) return null;

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    const result = await onUpdateStatus(user.user_id, selectedStatus);
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
            <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_user">Super User</SelectItem>
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
          </div>
        </div>

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
    </Dialog>
  );
}