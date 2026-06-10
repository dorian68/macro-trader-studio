import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Calendar, ArrowRight, AlertTriangle, Gift } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PublicNavbar from '@/components/PublicNavbar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCreditManager } from '@/hooks/useCreditManager';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { fetchCredits } = useCreditManager();
  const { toast } = useToast();
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    plan_type: string;
    subscription_end: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const sessionId = searchParams.get('session_id');
  const type = searchParams.get('type'); // 'free_trial' or undefined
  const isFreeTrial = type === 'free_trial';

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Error checking subscription:', error);
      } else {
        setSubscriptionData(data);
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const refreshUserData = async () => {
        await fetchCredits();
        
        if (!isFreeTrial) {
          await checkSubscriptionStatus();
          
          // Poll for credits/plan provisioning (webhook may lag)
          let pollCount = 0;
          const maxPolls = 10;
          const pollInterval = 3000;
          
          const poll = async () => {
            pollCount++;
            await fetchCredits();
            window.dispatchEvent(new CustomEvent('creditsUpdated'));
            
            // Check if profile has been updated by webhook
            const { data: profile } = await supabase
              .from('profiles')
              .select('status, user_plan')
              .eq('user_id', user.id)
              .maybeSingle();
            
            const isProvisioned = profile?.status === 'approved' && 
              profile?.user_plan && profile.user_plan !== 'free_trial';
            
            if (!isProvisioned && pollCount < maxPolls) {
              setTimeout(poll, pollInterval);
            } else if (isProvisioned) {
              console.log('[PaymentSuccess] Provisioning confirmed after', pollCount, 'polls');
              await fetchCredits();
              window.dispatchEvent(new CustomEvent('creditsUpdated'));
            }
          };
          
          setTimeout(poll, 2000);
        } else {
          setLoading(false);
          toast({
            title: "🎁 Free Trial Active",
            description: "Your Free Trial is ready. Explore all features!",
          });
        }
      };
      
      refreshUserData();
    } else {
      setLoading(false);
    }
  }, [user, isFreeTrial, fetchCredits, toast, checkSubscriptionStatus]);

  const getPlanDisplayName = (planType: string) => {
    const planNames = {
      basic: 'Basic Plan',
      standard: 'Standard Plan', 
      premium: 'Premium Plan'
    };
    return planNames[planType as keyof typeof planNames] || planType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <SEOHead titleKey="seo.paymentSuccessTitle" descriptionKey="seo.paymentSuccessDescription" noIndex />
      <PublicNavbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 ${isFreeTrial ? 'bg-purple-100' : 'bg-green-100'} rounded-full mb-4`}>
                {isFreeTrial ? (
                  <Gift className="h-8 w-8 text-purple-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {isFreeTrial ? "Free Trial Activated!" : "Payment Successful!"}
              </h1>
              <p className="text-lg text-muted-foreground">
                {isFreeTrial ? "Start exploring all features now" : "Welcome to Alphalens AI. Your subscription is now active."}
              </p>
            </div>

            {/* Unauthenticated User Warning */}
            {!loading && !user && (
              <Alert className="mb-8 border-amber-200 bg-amber-50/50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Sign in required:</strong> Use the account that started checkout to access your subscription.
                </AlertDescription>
              </Alert>
            )}

            {/* Subscription Details Card */}
            {!loading && user && subscriptionData?.subscribed && (
              <Card className="mb-8 border-green-200 bg-green-50/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Subscription Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <Badge variant="default" className="bg-green-600">
                      {getPlanDisplayName(subscriptionData.plan_type)}
                    </Badge>
                  </div>
                  
                  {subscriptionData.subscription_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Next billing:</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDate(subscriptionData.subscription_end)}
                        </span>
                      </div>
                    </div>
                  )}

                  {sessionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Session ID:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {sessionId.slice(0, 20)}...
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* What's Next Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>
                  What's Next?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {!user ? (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-semibold text-primary">1</span>
                        </div>
                        <div>
                          <p className="font-medium">Sign in to your account</p>
                          <p className="text-sm text-muted-foreground">
                            Use the account that initiated the secure checkout
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-semibold text-primary">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Access your dashboard</p>
                          <p className="text-sm text-muted-foreground">
                            Once logged in, immediately access your services
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-semibold text-primary">1</span>
                        </div>
                        <div>
                          <p className="font-medium">Access Your Dashboard</p>
                          <p className="text-sm text-muted-foreground">
                            Start exploring AI-powered market analysis and trading insights
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-semibold text-primary">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Explore Your Research Tools</p>
                          <p className="text-sm text-muted-foreground">
                            Access forecasts, reports, portfolio analytics, and market insights
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-semibold text-primary">3</span>
                        </div>
                        <div>
                          <p className="font-medium">Start Trading</p>
                          <p className="text-sm text-muted-foreground">
                            Get AI trade setups, market commentary, and research reports
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!user ? (
                <>
                  <Button 
                    size="lg"
                    className="flex-1"
                    onClick={() => navigate('/auth')}
                  >
                    Sign In
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="flex-1"
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate('/contact')}
                  >
                    Contact Support
                  </Button>
                </>
              )}
            </div>

            {/* Footer Note */}
            <div className="text-center mt-8 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {user 
                  ? "You'll receive a confirmation email shortly. If you have any questions, our support team is here to help."
                  : "Important: subscriptions are linked to the account that initiated checkout. Contact support if you cannot sign in."
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentSuccess;
