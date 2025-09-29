import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

interface PlanStats {
  plan_type: string;
  user_count: number;
  percentage: number;
}

export function SubscriptionPlanOverview() {
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperUser, isAdmin } = useProfile();

  const loadPlanStats = async () => {
    if (!isSuperUser && !isAdmin) return;
    
    setLoading(true);
    try {
      // Fetch user plan distribution from user_credits table
      const { data: creditsData, error } = await supabase
        .from('user_credits')
        .select('plan_type');

      if (error) throw error;

      // Count users by plan type
      const planCounts = creditsData?.reduce((acc: Record<string, number>, user) => {
        const planType = user.plan_type || 'free_trial';
        acc[planType] = (acc[planType] || 0) + 1;
        return acc;
      }, {}) || {};

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
        )}
      </CardContent>
    </Card>
  );
}