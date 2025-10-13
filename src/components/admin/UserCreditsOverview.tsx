import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CreditCard, Brain, Zap, FileText, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface UserCreditData {
  user_id: string;
  email: string;
  broker_name: string | null;
  credits_queries_remaining: number;
  credits_ideas_remaining: number;
  credits_reports_remaining: number;
  plan_type: string;
  total_credits: number;
}

export function UserCreditsOverview() {
  const [userCredits, setUserCredits] = useState<UserCreditData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const { isSuperUser, isAdmin } = useUserRole();

  const loadUserCredits = async () => {
    if (!isSuperUser && !isAdmin) return;
    
    setLoading(true);
    try {
      // Get current user's profile to determine broker filtering
      const { data: currentUserProfile, error: currentUserError } = await supabase
        .from('profiles')
        .select('broker_id, broker_name')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (currentUserError) throw currentUserError;

      // Get user credits data
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('user_id, credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining, plan_type');

      if (creditsError) throw creditsError;

      // Get user profiles for broker info - filter by broker for admin users
      let profilesQuery = supabase
        .from('profiles')
        .select('user_id, broker_name, broker_id');
      
      // If user is admin (not super_user), filter by their broker
      if (isAdmin && !isSuperUser && currentUserProfile?.broker_id) {
        profilesQuery = profilesQuery.eq('broker_id', currentUserProfile.broker_id);
      }

      const { data: profilesData, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Get user emails via edge function
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('fetch-users-with-emails', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const usersWithEmails = Array.isArray(response.data) ? response.data : (response.data?.users ?? []);

      // Create lookup maps
      const emailByUserId = new Map<string, string>();
      usersWithEmails.forEach((u: any) => {
        if (u?.user_id && u?.email) emailByUserId.set(u.user_id, u.email);
      });

      const brokerByUserId = new Map<string, string>();
      profilesData?.forEach((p: any) => {
        if (p?.user_id) brokerByUserId.set(p.user_id, p.broker_name);
      });

      // Combine data and calculate totals - only include users from filtered profiles
      const validUserIds = new Set(profilesData?.map(p => p.user_id) || []);
      const filteredCreditsData = creditsData?.filter(credit => validUserIds.has(credit.user_id)) || [];
      
      const userCreditsWithInfo: UserCreditData[] = filteredCreditsData.map(credit => {
        const email = emailByUserId.get(credit.user_id) || 'N/A';
        const broker_name = brokerByUserId.get(credit.user_id) || null;
        const total_credits = credit.credits_queries_remaining + credit.credits_ideas_remaining + credit.credits_reports_remaining;

        return {
          user_id: credit.user_id,
          email,
          broker_name,
          credits_queries_remaining: credit.credits_queries_remaining,
          credits_ideas_remaining: credit.credits_ideas_remaining,
          credits_reports_remaining: credit.credits_reports_remaining,
          plan_type: credit.plan_type,
          total_credits
        };
      });

      // Sort by total credits descending
      userCreditsWithInfo.sort((a, b) => b.total_credits - a.total_credits);
      
      setUserCredits(userCreditsWithInfo);
    } catch (error) {
      console.error('Error loading user credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserCredits();
  }, [isSuperUser, isAdmin]);

  if (!isSuperUser && !isAdmin) {
    return null;
  }

  const formatPlanName = (planType: string) => {
    switch (planType) {
      case 'free_trial': return 'Free Trial';
      case 'basic': return 'Basic';
      case 'standard': return 'Standard';
      case 'premium': return 'Premium';
      case 'enterprise': return 'Enterprise';
      default: return planType.charAt(0).toUpperCase() + planType.slice(1);
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'free_trial': return 'secondary';
      case 'basic': return 'outline';
      case 'standard': return 'default';
      case 'premium': return 'success';
      case 'enterprise': return 'accent';
      default: return 'secondary';
    }
  };

  // Filter and search logic
  const filteredUsers = userCredits.filter(user => {
    // For admin users (not super_user), only search by email
    // For super_user, search by email and broker
    const matchesSearch = isSuperUser 
      ? (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (user.broker_name && user.broker_name.toLowerCase().includes(searchTerm.toLowerCase())))
      : user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = planFilter === 'all' || user.plan_type === planFilter;
    
    return matchesSearch && matchesPlan;
  });

  // Sort logic
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    let aValue: any = a[key as keyof UserCreditData];
    let bValue: any = b[key as keyof UserCreditData];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="h-4 w-4" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const uniquePlans = [...new Set(userCredits.map(user => user.plan_type))];

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          User Credits Overview
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Credits remaining by user and feature type
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading user credits...
          </div>
        ) : userCredits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No credit data available
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isSuperUser ? "Search by email or broker..." : "Search by email..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans ({userCredits.length})</SelectItem>
                  {uniquePlans.map(plan => (
                    <SelectItem key={plan} value={plan}>
                      {formatPlanName(plan)} ({userCredits.filter(u => u.plan_type === plan).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('email')}
                          className="h-auto p-0 font-medium"
                        >
                          User {getSortIcon('email')}
                        </Button>
                      </th>
                      <th className="text-left p-3 font-medium text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('plan_type')}
                          className="h-auto p-0 font-medium"
                        >
                          Plan {getSortIcon('plan_type')}
                        </Button>
                      </th>
                      <th className="text-center p-3 font-medium text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('credits_queries_remaining')}
                          className="h-auto p-0 font-medium"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Brain className="h-4 w-4" />
                            Macro {getSortIcon('credits_queries_remaining')}
                          </div>
                        </Button>
                      </th>
                      <th className="text-center p-3 font-medium text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('credits_ideas_remaining')}
                          className="h-auto p-0 font-medium"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="h-4 w-4" />
                            AI Trade {getSortIcon('credits_ideas_remaining')}
                          </div>
                        </Button>
                      </th>
                      <th className="text-center p-3 font-medium text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('credits_reports_remaining')}
                          className="h-auto p-0 font-medium"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <FileText className="h-4 w-4" />
                            Reports {getSortIcon('credits_reports_remaining')}
                          </div>
                        </Button>
                      </th>
                      <th className="text-center p-3 font-medium text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('total_credits')}
                          className="h-auto p-0 font-medium"
                        >
                          Total {getSortIcon('total_credits')}
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                    <tr key={user.user_id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium text-sm">{user.email}</div>
                        {user.broker_name && (
                          <div className="text-xs text-muted-foreground">{user.broker_name}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={getPlanColor(user.plan_type) as any} className="text-xs">
                          {formatPlanName(user.plan_type)}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge 
                          variant={user.credits_queries_remaining > 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {user.credits_queries_remaining}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge 
                          variant={user.credits_ideas_remaining > 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {user.credits_ideas_remaining}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge 
                          variant={user.credits_reports_remaining > 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {user.credits_reports_remaining}
                        </Badge>
                      </td>
                      <td className="text-center p-3">
                        <Badge 
                          variant={user.total_credits > 0 ? "default" : "destructive"}
                          className="text-xs font-semibold"
                        >
                          {user.total_credits}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            
            {/* Pagination Controls */}
            {sortedUsers.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, sortedUsers.length)} of {sortedUsers.length} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}