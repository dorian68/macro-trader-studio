import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings, 
  Search, 
  Filter,
  User,
  Shield,
  Crown,
  Calendar
} from "lucide-react";
import { UserActionsDialog } from "./UserActionsDialog";
import { formatDistanceToNow } from "date-fns";

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

interface UsersTableProps {
  users: AdminUser[];
  onUpdateStatus: (userId: string, status: 'pending' | 'approved' | 'rejected') => Promise<{ success: boolean }>;
  onUpdateRole: (userId: string, role: 'user' | 'admin' | 'super_user') => Promise<{ success: boolean }>;
  loading: boolean;
  onRefresh: () => void;
}

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

const roleIcons = {
  user: User,
  admin: Shield,
  super_user: Crown
};

export function UsersTable({ 
  users, 
  onUpdateStatus, 
  onUpdateRole, 
  loading,
  onRefresh 
}: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.broker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         false;
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleManageUser = (user: AdminUser) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    onRefresh();
  };

  const getStatusCount = (status: string) => {
    return users.filter(user => user.status === status).length;
  };

  const getRoleCount = (role: string) => {
    return users.filter(user => user.role === role).length;
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or broker name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status ({users.length})</SelectItem>
            <SelectItem value="pending">Pending ({getStatusCount('pending')})</SelectItem>
            <SelectItem value="approved">Approved ({getStatusCount('approved')})</SelectItem>
            <SelectItem value="rejected">Rejected ({getStatusCount('rejected')})</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles ({users.length})</SelectItem>
            <SelectItem value="user">Users ({getRoleCount('user')})</SelectItem>
            <SelectItem value="admin">Admins ({getRoleCount('admin')})</SelectItem>
            <SelectItem value="super_user">Super Users ({getRoleCount('super_user')})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>User</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const RoleIcon = roleIcons[user.role];
                return (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm truncate max-w-[200px]">
                          {user.email || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {user.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {user.broker_name || <span className="text-muted-foreground">Not specified</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[user.status] as any}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <RoleIcon className="h-4 w-4" />
                        <Badge variant={roleColors[user.role] as any}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManageUser(user)}
                        className="h-8"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Actions Dialog */}
      <UserActionsDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        user={selectedUser}
        onUpdateStatus={onUpdateStatus}
        onUpdateRole={onUpdateRole}
        loading={loading}
      />
    </div>
  );
}