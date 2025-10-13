import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface PlanStats {
  plan_type: string;
  user_count: number;
  percentage: number;
}

interface PlanPrice {
  plan_type: string;
  monthly_price_usd: number;
}

export function SubscriptionPlanOverview() {
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [estimatedRevenue, setEstimatedRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { isSuperUser, isAdmin } = useUserRole();

  const loadPlanStats = async () => {
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

      // Get user profiles for broker filtering
      let profilesQuery = supabase
        .from('profiles')
        .select('user_id, broker_id');
      
      // If user is admin (not super_user), filter by their broker
      if (isAdmin && !isSuperUser && currentUserProfile?.broker_id) {
        profilesQuery = profilesQuery.eq('broker_id', currentUserProfile.broker_id);
      }

      const { data: profilesData, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;

      // Get valid user IDs from filtered profiles
      const validUserIds = new Set(profilesData?.map(p => p.user_id) || []);

      // Fetch user plan distribution from user_credits table
      const { data: creditsData, error } = await supabase
        .from('user_credits')
        .select('user_id, plan_type');

      if (error) throw error;

      // Filter credits data to only include users from valid broker
      const filteredCreditsData = creditsData?.filter(user => validUserIds.has(user.user_id)) || [];

      // Count users by plan type
      const planCounts = filteredCreditsData.reduce((acc: Record<string, number>, user) => {
        const planType = user.plan_type || 'free_trial';
        acc[planType] = (acc[planType] || 0) + 1;
        return acc;
      }, {});

      // Calculate total users and percentages
      const totalUsers = Object.values(planCounts).reduce((sum: number, count) => sum + count, 0);
      
      const stats: PlanStats[] = Object.entries(planCounts).map(([plan_type, user_count]) => ({
        plan_type,
        user_count: user_count as number,
        percentage: totalUsers > 0 ? ((user_count as number) / totalUsers) * 100 : 0
      }));

      // Sort by user count descending
      stats.sort((a, b) => b.user_count - a.user_count);
      
      setPlanStats(stats);

      // Fetch plan prices for revenue calculation (superuser only)
      if (isSuperUser) {
        const { data: pricesData, error: pricesError } = await supabase
          .from('plan_parameters')
          .select('plan_type, monthly_price_usd');

        if (!pricesError && pricesData) {
          const prices: Record<string, number> = {};
          pricesData.forEach(plan => {
            prices[plan.plan_type] = plan.monthly_price_usd || 0;
          });
          // Add broker_free fixed price
          prices['broker_free'] = 3;
          setPlanPrices(prices);

          // Calculate estimated monthly revenue
          const revenue = stats.reduce((total, stat) => {
            const price = prices[stat.plan_type] || 0;
            return total + (stat.user_count * price);
          }, 0);
          setEstimatedRevenue(revenue);
        }
      }
    } catch (error) {
      console.error('Error loading plan statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlanStats();
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

  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Subscription Plan Overview
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Distribution of users across subscription plans
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading plan statistics...
          </div>
        ) : planStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No subscription data available
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {planStats.map((plan) => (
                <div 
                  key={plan.plan_type}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">
                        {formatPlanName(plan.plan_type)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {plan.percentage.toFixed(1)}% of users
                      </div>
                    </div>
                  </div>
                  <Badge variant={getPlanColor(plan.plan_type) as any} className="font-semibold">
                    {plan.user_count}
                  </Badge>
                </div>
              ))}
            </div>
            
            {isSuperUser && estimatedRevenue > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-semibold text-base">Estimated Monthly Revenue</div>
                      <div className="text-xs text-muted-foreground">Based on current user distribution</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${estimatedRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}