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
import { Loader2, Shield, User, Crown } from "lucide-react";

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
  loading
}: UserActionsDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>();
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'super_user'>();

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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}