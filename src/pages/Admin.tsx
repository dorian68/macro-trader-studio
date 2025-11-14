import { useState, useEffect } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Clock, 
  RefreshCw,
  Crown,
  User,
  TrendingUp,
  Activity,
  Euro,
  Calculator,
  BarChart3,
  Building2,
  CreditCard,
  ArrowRightLeft,
  AlertCircle,
  Upload
} from "lucide-react";
import { useAdminActions } from "@/hooks/useAdminActions";
import { useUserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { UsersTable } from "@/components/admin/UsersTable";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { JobsMonitoring } from "@/components/admin/JobsMonitoring";
import { BrokersManagement } from "@/components/admin/BrokersManagement";
import { PlanParametersManagement } from "@/components/admin/PlanParametersManagement";
import { SubscriptionPlanOverview } from "@/components/admin/SubscriptionPlanOverview";
import { UserCreditsOverview } from "@/components/admin/UserCreditsOverview";
import { ChartProviderSettings } from "@/components/admin/ChartProviderSettings";
import { ReactivationRequestsManagement } from "@/components/admin/ReactivationRequestsManagement";
import ImportABCGPortfolio from "@/components/admin/ImportABCGPortfolio";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { startOfDay } from 'date-fns';
import { RealtimeDiagnostic } from "@/components/RealtimeDiagnostic";
import { useTranslation } from 'react-i18next';

interface AdminUser {
  id: string;
  user_id: string;
  broker_name: string | null;
  broker_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  email?: string;
  roles: string[];
}

interface UserCostStats {
  user_id: string;
  email: string;
  aiTradeSetupCount: number;
  macroCommentaryCount: number;
  reportCount: number;
  totalCost: number;
}

interface DailyCostStats {
  date: string;
  cost: number;
  requests: number;
}

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [costStats, setCostStats] = useState<UserCostStats[]>([]);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [dailyCostStats, setDailyCostStats] = useState<DailyCostStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [costTablePage, setCostTablePage] = useState(1);
  const [costTableItemsPerPage] = useState(5);
  const [userBroker, setUserBroker] = useState<any>(null);
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [updatingStripeMode, setUpdatingStripeMode] = useState(false);
  const [showStripeModeDialog, setShowStripeModeDialog] = useState(false);
  const [pendingStripeMode, setPendingStripeMode] = useState<'test' | 'live'>('test');
  const [sessionDashboardMode, setSessionDashboardMode] = useState<'tradingview' | 'light'>(() => {
    const stored = sessionStorage.getItem('dashboard_chart_mode');
    return (stored === 'light' || stored === 'tradingview') ? stored : 'tradingview';
  });
  const { toast } = useToast();
  const { isSuperUser, isAdmin } = useUserRole();
  const { profile } = useProfile();
  const { t } = useTranslation('admin');
  const { 
    fetchUsers,
    updateUserStatus, 
    updateUserRole,
    deleteUser,
    createUser, 
    loading: actionLoading 
  } = useAdminActions();

  const loadStripeMode = async () => {
    if (isSuperUser) {
      try {
        const { data, error } = await supabase.functions.invoke('get-stripe-mode');
        if (!error && data?.mode) {
          setStripeMode(data.mode);
        }
      } catch (err) {
        console.error('Failed to fetch Stripe mode:', err);
      }
    }
  };

  const handleToggleStripeMode = async () => {
    const newMode: 'test' | 'live' = stripeMode === 'test' ? 'live' : 'test';
    setPendingStripeMode(newMode);
    setShowStripeModeDialog(true);
  };

  const confirmStripeModeChange = async () => {
    setUpdatingStripeMode(true);
    setShowStripeModeDialog(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('update-stripe-mode', {
        body: { mode: pendingStripeMode },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      // Reload the mode after successful update
      await loadStripeMode();
      
      toast({
        title: t('stripe.modeUpdated'),
        description: t('stripe.modeUpdatedDescription', { mode: pendingStripeMode.toUpperCase() }),
        variant: pendingStripeMode === 'live' ? 'default' : 'default',
      });
    } catch (err: any) {
      console.error('Failed to update Stripe mode:', err);
      toast({
        title: t('stripe.updateFailed'),
        description: err.message || t('stripe.updateFailedDescription'),
        variant: "destructive",
      });
    } finally {
      setUpdatingStripeMode(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const userData = await fetchUsers();
    
    // Fetch credit data for super users and admins
    if ((isSuperUser || isAdmin) && userData.length > 0) {
      try {
        const { data: creditsData } = await supabase
          .from('user_credits')
          .select('user_id, credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining, plan_type, last_reset_date');
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, user_plan');

        // Merge credit and plan data with users
        const enhancedUsers = userData.map(user => {
          const userCredits = creditsData?.find(c => c.user_id === user.user_id);
          const userProfile = profilesData?.find(p => p.user_id === user.user_id);
          
          // Derive role from roles array for backward compatibility
          const primaryRole = user.roles?.includes('super_user') ? 'super_user' as const :
                             user.roles?.includes('admin') ? 'admin' as const : 'user' as const;
          
          return {
            ...user,
            role: primaryRole,
            user_plan: userProfile?.user_plan,
            credits: userCredits ? {
              queries: userCredits.credits_queries_remaining,
              ideas: userCredits.credits_ideas_remaining,
              reports: userCredits.credits_reports_remaining,
              plan_type: userCredits.plan_type,
              last_reset_date: userCredits.last_reset_date
            } : undefined
          };
        });
        
        setUsers(enhancedUsers);
      } catch (error) {
        console.error('Error loading credit data:', error);
        setUsers(userData);
      }
    } else {
      setUsers(userData);
    }
    
    setLoading(false);
  };

  const loadUserBroker = async () => {
    if (!profile?.broker_id) return;
    
    try {
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('id', profile.broker_id)
        .single();
      
      if (error) throw error;
      setUserBroker(data);
    } catch (error) {
      console.error('Error loading user broker:', error);
    }
  };

  const loadCostStats = async () => {
    if (!isSuperUser) return;
    setLoadingCosts(true);
    
    try {
      // Charger les données de jobs avec les profils utilisateurs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          user_id,
          feature,
          created_at
        `);

      if (jobsError) throw jobsError;

      // Charger les emails des utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, broker_name');

      if (profilesError) throw profilesError;

      // Récupérer les emails via l'edge function
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('fetch-users-with-emails', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const usersWithEmails = Array.isArray(response.data) ? response.data : (response.data?.users ?? []);

      // Build lookup maps for user display names
      const emailByUserId = new Map<string, string>();
      usersWithEmails.forEach((u: any) => {
        if (u?.user_id && u?.email) emailByUserId.set(u.user_id, u.email);
      });

      const brokerByUserId = new Map<string, string>();
      profilesData?.forEach((p: any) => {
        if (p?.user_id && p?.broker_name) brokerByUserId.set(p.user_id, p.broker_name);
      });
      // Tarification par fonctionnalité (en dollars)
      const featureCosts = {
        'AI Trade Setup': 0.06,
        'Macro Commentary': 0.07,
        'Report': 0.14
      };

      // Calculer les statistiques par utilisateur
      const userStatsMap = new Map<string, UserCostStats>();

      jobsData?.forEach(job => {
        const userId = job.user_id;
        const feature = job.feature;
        
        if (!userStatsMap.has(userId)) {
          const email = emailByUserId.get(userId);
          const broker = brokerByUserId.get(userId);
          const displayName = email || broker || 'Unknown';
          userStatsMap.set(userId, {
            user_id: userId,
            email: displayName,
            aiTradeSetupCount: 0,
            macroCommentaryCount: 0,
            reportCount: 0,
            totalCost: 0
          });
        }

        const userStats = userStatsMap.get(userId)!;
        const cost = featureCosts[feature as keyof typeof featureCosts] || 0;

        if (feature === 'AI Trade Setup') {
          userStats.aiTradeSetupCount++;
        } else if (feature === 'Macro Commentary') {
          userStats.macroCommentaryCount++;
        } else if (feature === 'Report') {
          userStats.reportCount++;
        }

        userStats.totalCost += cost;
      });

      setCostStats(Array.from(userStatsMap.values()));

      // Calculer les statistiques par jour pour la période sélectionnée
      const dailyStatsMap = new Map<string, DailyCostStats>();
      const selectedDays = Array.from({ length: selectedPeriod }, (_, i) => {
        const date = subDays(new Date(), selectedPeriod - 1 - i); // Ordre croissant
        const dateStr = format(date, 'yyyy-MM-dd');
        dailyStatsMap.set(dateStr, {
          date: dateStr,
          cost: 0,
          requests: 0
        });
        return dateStr;
      });

      jobsData?.forEach(job => {
        const jobDate = format(parseISO(job.created_at), 'yyyy-MM-dd');
        if (dailyStatsMap.has(jobDate)) {
          const dayStats = dailyStatsMap.get(jobDate)!;
          const cost = featureCosts[job.feature as keyof typeof featureCosts] || 0;
          dayStats.cost += cost;
          dayStats.requests += 1;
        }
      });

      setDailyCostStats(Array.from(dailyStatsMap.values()));
    } catch (error) {
      console.error('Error loading cost stats:', error);
    } finally {
      setLoadingCosts(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(), loadCostStats()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadUsers();
    loadUserBroker();
    if (isSuperUser) {
      loadCostStats();
      loadStripeMode();
    }
  }, [isSuperUser, selectedPeriod, profile]);

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
    users: users.filter(u => u.roles.includes('user')).length,
    admins: users.filter(u => u.roles.includes('admin')).length,
    superUsers: users.filter(u => u.roles.includes('super_user')).length,
  };

  // Statistiques de coûts globales
  const globalCostStats = {
    totalRequests: costStats.reduce((sum, user) => 
      sum + user.aiTradeSetupCount + user.macroCommentaryCount + user.reportCount, 0),
    totalCost: costStats.reduce((sum, user) => sum + user.totalCost, 0),
    aiTradeSetupTotal: costStats.reduce((sum, user) => sum + user.aiTradeSetupCount, 0),
    macroCommentaryTotal: costStats.reduce((sum, user) => sum + user.macroCommentaryCount, 0),
    reportTotal: costStats.reduce((sum, user) => sum + user.reportCount, 0),
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                {t('title')}
              </h1>
              {isAdmin && userBroker && (
                <Badge variant="outline" className="text-xs">
                  Broker: {userBroker.name}
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {isAdmin ? t('brokerSubtitle', { brokerName: userBroker?.name || 'your broker' }) : t('subtitle')}
            </p>
            {isAdmin && !profile?.broker_id && (
              <div className="mt-2 p-2 border border-warning rounded-md bg-warning/10">
                <p className="text-sm text-warning-foreground">
                  {t('brokerNotAssigned')}
                </p>
              </div>
            )}
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
              {t('actions.refresh')}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t('stats.totalUsers')}
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
                {t('stats.pending')}
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
                {t('stats.approved')}
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
                {t('stats.rejected')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Stripe Environment Status (Super Users Only) */}
        {isSuperUser && (
          <Card className="rounded-2xl shadow-sm border bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('stripe.title')}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {t('stripe.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={stripeMode === 'live' ? 'default' : 'secondary'}
                    className="text-sm px-3 py-1"
                  >
                    {stripeMode === 'live' ? '🟢 LIVE MODE' : '🔵 TEST MODE'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {stripeMode === 'live' 
                      ? 'Production payments are active' 
                      : 'Using test data and keys'}
                  </span>
                </div>
                <Button
                  onClick={handleToggleStripeMode}
                  disabled={updatingStripeMode}
                  variant={stripeMode === 'live' ? 'outline' : 'default'}
                  size="sm"
                  className="gap-2"
                >
                  {updatingStripeMode ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4" />
                  )}
                  Switch to {stripeMode === 'test' ? 'LIVE' : 'TEST'}
                </Button>
              </div>
              {stripeMode === 'live' && (
                <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-xs text-warning-foreground flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    All payments are being processed in production mode
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stripe Mode Confirmation Dialog */}
        <AlertDialog open={showStripeModeDialog} onOpenChange={setShowStripeModeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Switch Stripe to {pendingStripeMode.toUpperCase()} Mode?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                {pendingStripeMode === 'live' ? (
                  <>
                    <p className="font-semibold text-warning">⚠️ You are about to enable LIVE payment processing</p>
                    <p>This will:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Process real payments with real money</li>
                      <li>Use production Stripe API keys</li>
                      <li>Charge actual customer credit cards</li>
                      <li>Send real payment confirmation emails</li>
                    </ul>
                    <p className="font-semibold mt-3">Make sure your production webhooks and keys are properly configured.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Switching back to TEST mode</p>
                    <p>This will:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Use test Stripe API keys</li>
                      <li>Only accept test card numbers</li>
                      <li>Not charge real money</li>
                      <li>Switch to development environment</li>
                    </ul>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmStripeModeChange}
                className={pendingStripeMode === 'live' ? 'bg-warning hover:bg-warning/90' : ''}
              >
                Confirm Switch to {pendingStripeMode.toUpperCase()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

        {/* Subscription Plan Overview - Admins and Super Users */}
        {(isAdmin || isSuperUser) && <SubscriptionPlanOverview />}

        {/* User Credits Overview - Admins and Super Users */}
        {(isAdmin || isSuperUser) && <UserCreditsOverview />}

        {/* Cost Tracking Section - Super Users Only */}
        {isSuperUser && (
          <Card className="rounded-2xl shadow-sm border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Euro className="h-5 w-5 text-success" />
                Cost Tracking
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Monitor usage costs by user and feature
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {/* Global Stats */}
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Card className="rounded-xl border">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">Total Requests</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold">{globalCostStats.totalRequests}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Euro className="h-4 w-4 text-success" />
                      <span className="text-xs sm:text-sm font-medium">Total Cost</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold">${globalCostStats.totalCost.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <span className="text-xs sm:text-sm font-medium">AI Trade</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold">{globalCostStats.aiTradeSetupTotal}</div>
                    <div className="text-xs text-muted-foreground">${(globalCostStats.aiTradeSetupTotal * 0.06).toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-orange-500" />
                      <span className="text-xs sm:text-sm font-medium">Reports</span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold">{globalCostStats.reportTotal}</div>
                    <div className="text-xs text-muted-foreground">${(globalCostStats.reportTotal * 0.14).toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Cost Chart */}
              <div className="rounded-xl border mb-6">
                <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <BarChart3 className="h-4 w-4" />
                    Daily Costs (Last {selectedPeriod} Days)
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-muted-foreground">Period:</label>
                    <select 
                      value={selectedPeriod} 
                      onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                      className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-border rounded-md bg-background"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>
                </div>
                <div className="p-2 sm:p-4">
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyCostStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => format(parseISO(value), 'MM/dd')}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => `$${value.toFixed(2)}`}
                        />
                        <Tooltip 
                          labelFormatter={(value) => format(parseISO(value as string), 'MMM dd, yyyy')}
                          formatter={(value: number, name: string) => [
                            name === 'cost' ? `$${value.toFixed(2)}` : value,
                            name === 'cost' ? 'Cost' : 'Requests'
                          ]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cost" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* User Costs Table */}
              <div className="rounded-xl border">
                <div className="p-3 sm:p-4 border-b">
                  <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Users className="h-4 w-4" />
                    Cost by User
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-2 sm:p-3 font-medium text-xs sm:text-sm whitespace-nowrap">User</th>
                        <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm whitespace-nowrap">AI Trade</th>
                        <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm whitespace-nowrap">Macro</th>
                        <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm whitespace-nowrap">Reports</th>
                        <th className="text-right p-2 sm:p-3 font-medium text-xs sm:text-sm whitespace-nowrap">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingCosts ? (
                        <tr>
                          <td colSpan={5} className="text-center p-6 sm:p-8">
                            <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mx-auto mb-2" />
                            <div className="text-xs sm:text-sm">Loading cost data...</div>
                          </td>
                        </tr>
                      ) : costStats.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center p-6 sm:p-8 text-muted-foreground text-xs sm:text-sm">
                            No cost data available
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const sortedCostStats = costStats.sort((a, b) => b.totalCost - a.totalCost);
                          const totalPages = Math.ceil(sortedCostStats.length / costTableItemsPerPage);
                          const startIndex = (costTablePage - 1) * costTableItemsPerPage;
                          const endIndex = startIndex + costTableItemsPerPage;
                          const paginatedCosts = sortedCostStats.slice(startIndex, endIndex);
                          
                          return paginatedCosts.map((userStat) => (
                            <tr key={userStat.user_id} className="border-b hover:bg-muted/50">
                              <td className="p-2 sm:p-3">
                                <div className="font-medium text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{userStat.email}</div>
                              </td>
                              <td className="text-right p-2 sm:p-3">
                                <div className="text-xs sm:text-sm">{userStat.aiTradeSetupCount}</div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground">${(userStat.aiTradeSetupCount * 0.06).toFixed(2)}</div>
                              </td>
                              <td className="text-right p-2 sm:p-3">
                                <div className="text-xs sm:text-sm">{userStat.macroCommentaryCount}</div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground">${(userStat.macroCommentaryCount * 0.07).toFixed(2)}</div>
                              </td>
                              <td className="text-right p-2 sm:p-3">
                                <div className="text-xs sm:text-sm">{userStat.reportCount}</div>
                                <div className="text-[10px] sm:text-xs text-muted-foreground">${(userStat.reportCount * 0.14).toFixed(2)}</div>
                              </td>
                              <td className="text-right p-2 sm:p-3">
                                <div className="font-semibold text-xs sm:text-sm">${userStat.totalCost.toFixed(2)}</div>
                              </td>
                            </tr>
                          ));
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {!loadingCosts && costStats.length > 0 && (() => {
                  const sortedCostStats = costStats.sort((a, b) => b.totalCost - a.totalCost);
                  const totalPages = Math.ceil(sortedCostStats.length / costTableItemsPerPage);
                  const startIndex = (costTablePage - 1) * costTableItemsPerPage;
                  const endIndex = startIndex + costTableItemsPerPage;
                  
                  return (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, sortedCostStats.length)} of {sortedCostStats.length} users
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCostTablePage(prev => Math.max(1, prev - 1))}
                          disabled={costTablePage === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm">
                          Page {costTablePage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCostTablePage(prev => Math.min(totalPages, prev + 1))}
                          disabled={costTablePage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <TabsList className={`grid w-full ${isSuperUser ? 'grid-cols-6 min-w-[900px]' : 'grid-cols-2'} sm:min-w-full`}>
              <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">User Management</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Jobs Monitoring</span>
                <span className="sm:hidden">Jobs</span>
              </TabsTrigger>
              {isSuperUser && (
                <TabsTrigger value="brokers" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Brokers</span>
                </TabsTrigger>
              )}
              {isSuperUser && (
                <TabsTrigger value="plan-parameters" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                  <Calculator className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Plan Parameters</span>
                  <span className="sm:hidden">Plans</span>
                </TabsTrigger>
              )}
              {isSuperUser && (
                <TabsTrigger value="portfolio-import" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Portfolio Import</span>
                  <span className="sm:hidden">Import</span>
                </TabsTrigger>
              )}
              {isSuperUser && (
                <TabsTrigger value="chart-provider" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Chart Settings</span>
                  <span className="sm:hidden">Chart</span>
                </TabsTrigger>
              )}
              {isSuperUser && (
                <TabsTrigger value="realtime-diagnostic" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px]">
                  <span className="text-base">🔍</span>
                  <span className="hidden sm:inline">Realtime Diagnostic</span>
                  <span className="sm:hidden">Diagnostic</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="users">
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
          </TabsContent>

          <TabsContent value="monitoring">
            <JobsMonitoring />
          </TabsContent>

          {isSuperUser && (
            <TabsContent value="brokers">
              <BrokersManagement />
            </TabsContent>
          )}

          {isSuperUser && (
            <TabsContent value="portfolio-import">
              <ImportABCGPortfolio />
            </TabsContent>
          )}

          {isSuperUser && (
            <TabsContent value="plan-parameters">
              <PlanParametersManagement />
            </TabsContent>
          )}

          {isSuperUser && (
            <TabsContent value="realtime-diagnostic">
              <RealtimeDiagnostic />
            </TabsContent>
          )}

          {isSuperUser && (
            <TabsContent value="chart-provider">
              <ChartProviderSettings />
              
              {/* Dashboard Chart Mode Toggle (Testing) */}
              <Card className="rounded-2xl shadow-sm border mt-6">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Dashboard Chart Mode (Testing)
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Toggle between TradingView (production) and Dashboard Light (testing) for your session only
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-muted/20">
                    <div>
                      <p className="font-medium text-sm sm:text-base">Current Mode</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {sessionDashboardMode === 'light' ? 'Dashboard Light (Testing)' : 'TradingView (Production)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {sessionDashboardMode === 'tradingview' ? 'TradingView' : 'Light Mode'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={sessionDashboardMode === 'light'}
                          onChange={(e) => {
                            const newMode = e.target.checked ? 'light' : 'tradingview';
                            setSessionDashboardMode(newMode);
                            sessionStorage.setItem('dashboard_chart_mode', newMode);
                            toast({
                              title: 'Chart Mode Updated',
                              description: `Dashboard will now use ${e.target.checked ? 'Dashboard Light' : 'TradingView'} chart`,
                            });
                          }}
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-md">
                    <p className="text-xs text-warning-foreground">
                      ⚠️ This setting only affects YOUR session and will reset when you log out or close the tab.
                      Other users will always see the production TradingView chart.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}