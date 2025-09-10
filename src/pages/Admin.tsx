import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Clock, 
  RefreshCw,
  Crown,
  User,
  TrendingUp
} from "lucide-react";
import { useAdminActions } from "@/hooks/useAdminActions";
import { UsersTable } from "@/components/admin/UsersTable";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import Layout from "@/components/Layout";

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

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { 
    fetchUsers, 
    updateUserStatus, 
    updateUserRole,
    deleteUser,
    createUser, 
    loading: actionLoading 
  } = useAdminActions();

  const loadUsers = async () => {
    setLoading(true);
    const userData = await fetchUsers();
    setUsers(userData);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
    users: users.filter(u => u.role === 'user').length,
    admins: users.filter(u => u.role === 'admin').length,
    superUsers: users.filter(u => u.role === 'super_user').length,
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage users, approvals, and system permissions
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CreateUserDialog
              onCreateUser={createUser}
              loading={actionLoading}
              onSuccess={loadUsers}
            />
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              className="h-10 sm:h-11"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-success" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserX className="h-4 w-4 text-danger" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Role Distribution */}
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Role Distribution
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Current user roles and permissions in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Users</span>
                </div>
                <Badge variant="secondary">{stats.users}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Admins</span>
                </div>
                <Badge variant="outline" className="border-primary text-primary">{stats.admins}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Super Users</span>
                </div>
                <Badge className="bg-accent text-accent-foreground">{stats.superUsers}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Management */}
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Manage user accounts, approve registrations, and assign roles
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <Tabs defaultValue="all" className="space-y-4">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <TabsList className="grid w-full grid-cols-4 min-w-[640px] sm:min-w-full">
                  <TabsTrigger value="all" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="break-words">All ({stats.total})</span>
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="break-words">Pending ({stats.pending})</span>
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                    <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="break-words">Approved ({stats.approved})</span>
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                    <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="break-words">Rejected ({stats.rejected})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all">
                <UsersTable
                  users={users}
                  onUpdateStatus={updateUserStatus}
                  onUpdateRole={updateUserRole}
                  onDeleteUser={deleteUser}
                  loading={actionLoading}
                  onRefresh={loadUsers}
                />
              </TabsContent>

              <TabsContent value="pending">
                <UsersTable
                  users={users.filter(u => u.status === 'pending')}
                  onUpdateStatus={updateUserStatus}
                  onUpdateRole={updateUserRole}
                  onDeleteUser={deleteUser}
                  loading={actionLoading}
                  onRefresh={loadUsers}
                />
              </TabsContent>

              <TabsContent value="approved">
                <UsersTable
                  users={users.filter(u => u.status === 'approved')}
                  onUpdateStatus={updateUserStatus}
                  onUpdateRole={updateUserRole}
                  onDeleteUser={deleteUser}
                  loading={actionLoading}
                  onRefresh={loadUsers}
                />
              </TabsContent>

              <TabsContent value="rejected">
                <UsersTable
                  users={users.filter(u => u.status === 'rejected')}
                  onUpdateStatus={updateUserStatus}
                  onUpdateRole={updateUserRole}
                  onDeleteUser={deleteUser}
                  loading={actionLoading}
                  onRefresh={loadUsers}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}