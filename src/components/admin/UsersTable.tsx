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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { 
  Settings, 
  Search, 
  Filter,
  User,
  Shield,
  Crown,
  Calendar,
  CreditCard
} from "lucide-react";
import { UserActionsDialog } from "./UserActionsDialog";
import { UserPlanDialog } from "./UserPlanDialog";
import { formatDistanceToNow } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";

interface AdminUser {
  id: string;
  user_id: string;
  broker_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  email?: string;
  user_plan?: string;
  roles: string[];
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  credits?: {
    queries: number;
    ideas: number;
    reports: number;
    plan_type: string;
    last_reset_date: string;
  };
}

interface UsersTableProps {
  users: AdminUser[];
  onUpdateStatus: (userId: string, status: 'pending' | 'approved' | 'rejected', userEmail?: string) => Promise<{ success: boolean }>;
  onUpdateRole: (userId: string, role: 'user' | 'admin' | 'super_user') => Promise<{ success: boolean }>;
  onDeleteUser: (userId: string) => Promise<{ success: boolean }>;
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
  onDeleteUser,
  loading,
  onRefresh
}: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);
  const [showDeleted, setShowDeleted] = useState(false);
  const { isSuperUser, isAdmin } = useUserRole();

  const filteredUsers = users.filter(user => {
    // ✅ Filter soft-deleted users unless showDeleted is enabled
    if (!showDeleted && user.is_deleted) {
      return false;
    }
    
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.broker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         false;
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || (user.roles && user.roles.includes(roleFilter));
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Pagination logic
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = itemsPerPage === 'all' 
    ? filteredUsers 
    : filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleManageUser = (user: AdminUser) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    onRefresh();
  };

  const handleManagePlan = (user: AdminUser) => {
    setSelectedUser(user);
    setPlanDialogOpen(true);
  };

  const handlePlanDialogClose = () => {
    setPlanDialogOpen(false);
    setSelectedUser(null);
    onRefresh();
  };

  const getStatusCount = (status: string) => {
    return users.filter(user => user.status === status).length;
  };

  const getRoleCount = (role: string) => {
    return users.filter(user => user.roles && user.roles.includes(role)).length;
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
        
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); handleFilterChange(); }}>
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

        <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); handleFilterChange(); }}>
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

      {/* Toggle for soft-deleted users (Super Users only) */}
      {isSuperUser && (
        <div className="flex items-center gap-2 mb-4">
          <Switch
            id="show-deleted"
            checked={showDeleted}
            onCheckedChange={setShowDeleted}
          />
          <Label htmlFor="show-deleted" className="text-sm cursor-pointer">
            Show deleted users ({users.filter(u => u.is_deleted).length})
          </Label>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg max-h-[600px] overflow-y-auto">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[120px]">User ID</TableHead>
                  <TableHead className="min-w-[100px]">Broker</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Role</TableHead>
                  {(isSuperUser || isAdmin) && <TableHead className="min-w-[150px]">Plan & Credits</TableHead>}
                  <TableHead className="min-w-[120px]">Created</TableHead>
                  <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(isSuperUser || isAdmin) ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      No users found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => {
                    // Get highest priority role for icon
                    const primaryRole = user.roles?.includes('super_user') ? 'super_user' : 
                                       user.roles?.includes('admin') ? 'admin' : 'user';
                    const RoleIcon = roleIcons[primaryRole];
                    return (
                      <TableRow 
                        key={user.id} 
                        className={`hover:bg-muted/50 ${user.is_deleted ? 'opacity-50 bg-red-50/50 dark:bg-red-950/20' : ''}`}
                      >
                        <TableCell>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {user.email || 'N/A'}
                            {user.is_deleted && (
                              <Badge variant="destructive" className="text-xs">
                                Supprimé
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded max-w-fit">
                            {user.user_id}
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
                            {user.roles && user.roles.length > 0 ? (
                              <div className="flex gap-1 flex-wrap">
                                {user.roles.map((role, idx) => (
                                  <Badge key={idx} variant={roleColors[role as 'user' | 'admin' | 'super_user'] as any}>
                                    {role.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline">No role</Badge>
                            )}
                          </div>
                        </TableCell>
                        {(isSuperUser || isAdmin) && (
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-xs">
                                <span className="font-medium">{user.user_plan || 'free_trial'}</span>
                              </div>
                              {user.credits && (
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  <div>Q: {user.credits.queries}</div>
                                  <div>I: {user.credits.ideas}</div>
                                  <div>R: {user.credits.reports}</div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManageUser(user)}
                              className="h-8"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Manage
                            </Button>
                            {isSuperUser && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManagePlan(user)}
                                className="h-8"
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Plan
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Items per page:</span>
          <Select 
            value={itemsPerPage.toString()} 
            onValueChange={(value) => {
              setItemsPerPage(value === 'all' ? 'all' : parseInt(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="all">Show All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {itemsPerPage === 'all' 
              ? `Showing all ${filteredUsers.length} users`
              : `Showing ${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, filteredUsers.length)} of ${filteredUsers.length}`
            }
          </span>
        </div>

        {itemsPerPage !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* User Actions Dialog */}
      <UserActionsDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        user={selectedUser}
        onUpdateStatus={onUpdateStatus}
        onUpdateRole={onUpdateRole}
        onDeleteUser={onDeleteUser}
        loading={loading}
      />

      {/* User Plan Dialog */}
      <UserPlanDialog
        isOpen={planDialogOpen}
        onClose={handlePlanDialogClose}
        user={selectedUser}
        onRefresh={onRefresh}
      />
    </div>
  );
}