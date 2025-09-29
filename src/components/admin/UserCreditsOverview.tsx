import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CreditCard, Brain, Zap, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

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
  const { isSuperUser, isAdmin } = useProfile();

  const loadUserCredits = async () => {
    if (!isSuperUser && !isAdmin) return;
    
    setLoading(true);
    try {
      // Get user credits data
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('user_id, credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining, plan_type');

      if (creditsError) throw creditsError;

      // Get user profiles for broker info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, broker_name');

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

      // Combine data and calculate totals
      const userCreditsWithInfo: UserCreditData[] = creditsData?.map(credit => {
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
      }) || [];

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
          <div className="rounded-xl border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm">User</th>
                    <th className="text-left p-3 font-medium text-sm">Plan</th>
                    <th className="text-center p-3 font-medium text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Brain className="h-4 w-4" />
                        Macro
                      </div>
                    </th>
                    <th className="text-center p-3 font-medium text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="h-4 w-4" />
                        AI Trade
                      </div>
                    </th>
                    <th className="text-center p-3 font-medium text-sm">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-4 w-4" />
                        Reports
                      </div>
                    </th>
                    <th className="text-center p-3 font-medium text-sm">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {userCredits.slice(0, 20).map((user) => ( // Show top 20 users
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
            {userCredits.length > 20 && (
              <div className="p-3 text-center text-sm text-muted-foreground border-t">
                Showing top 20 users by total credits. Total users: {userCredits.length}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}