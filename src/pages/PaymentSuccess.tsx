import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Calendar, ArrowRight, AlertTriangle, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PublicNavbar from '@/components/PublicNavbar';
import GuestSignupForm from '@/components/GuestSignupForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    } else {
      // For unauthenticated users, try to get session email if available
      if (sessionId) {
        fetchSessionEmail();
      } else {
        setLoading(false);
      }
    }
  }, [user, sessionId]);

  const fetchSessionEmail = async () => {
    try {
      // Note: In a real scenario, you'd need a backend endpoint to safely retrieve session details
      // For now, we'll just set loading to false
      setLoading(false);
    } catch (error) {
      console.error('Error fetching session email:', error);
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
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
  };

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
      <PublicNavbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Payment Successful!
              </h1>
              <p className="text-lg text-muted-foreground">
                Welcome to Alphalens AI. Your subscription is now active.
              </p>
            </div>

            {/* Unauthenticated User Warning */}
            {!loading && !user && (
              <Alert className="mb-8 border-amber-200 bg-amber-50/50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Action requise :</strong> Votre paiement a été traité avec succès, mais vous devez créer un compte pour accéder à vos services.
                  {sessionEmail && (
                    <span> Utilisez l'email <strong>{sessionEmail}</strong> pour récupérer votre abonnement.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Signup Form for Unauthenticated Users */}
            {!loading && !user && showSignupForm && (
              <div className="mb-8">
                <GuestSignupForm 
                  suggestedEmail={sessionEmail || undefined}
                  onSuccess={() => {
                    setShowSignupForm(false);
                    // Optionally redirect to dashboard or refresh page
                  }}
                />
              </div>
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
                  {user ? "What's Next?" : "Prochaines étapes"}
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
                          <p className="font-medium">Créer votre compte</p>
                          <p className="text-sm text-muted-foreground">
                            Créez un compte pour accéder à votre abonnement payé
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                          <span className="text-xs font-semibold text-primary">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Accéder au tableau de bord</p>
                          <p className="text-sm text-muted-foreground">
                            Une fois connecté, accédez immédiatement à vos services
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
                          <p className="font-medium">Select Your Broker</p>
                          <p className="text-sm text-muted-foreground">
                            Link your trading account for personalized recommendations
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
                    onClick={() => setShowSignupForm(!showSignupForm)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {showSignupForm ? 'Masquer le formulaire' : 'Créer mon compte'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate('/auth')}
                  >
                    J'ai déjà un compte
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
                  : "Important : Votre paiement est sécurisé. Créez votre compte pour accéder immédiatement à vos services. Notre équipe de support est disponible pour vous aider."
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