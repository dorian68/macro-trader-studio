import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { AlertCircle, Clock, XCircle, Loader2 } from 'lucide-react';

const { useEffect, useState } = React;

interface AuthGuardProps {
  children: React.ReactNode;
  requireApproval?: boolean;
}

export default function AuthGuard({ children, requireApproval = true }: AuthGuardProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, isPending, isRejected, isApproved, isDeleted, isTrialExpired } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth status
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Safety net: if profile is somehow still marked deleted, force sign out
  // This should never happen in normal conditions (auth.users is hard-deleted)
  if (isDeleted) {
    signOut();
    return null;
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return null;
  }

  // ✅ Trial expired → show upgrade modal
  if (isTrialExpired) {
    const handleUpgrade = async () => {
      setCheckoutLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { 
            plan: 'basic', 
            success_url: 'https://alphalensai.com/payment-success?session_id={CHECKOUT_SESSION_ID}', 
            cancel_url: 'https://alphalensai.com/payment-canceled' 
          }
        });
        if (!error && data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (e) {
        console.error('[AuthGuard] Checkout error:', e);
      }
      setCheckoutLoading(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Your Free Trial Has Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your 7-day free trial has ended. Subscribe to our Basic plan to continue using AlphaLens with full access.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleUpgrade} 
                disabled={checkoutLoading}
                className="w-full"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  "Upgrade to Basic Plan"
                )}
              </Button>
              <Button variant="outline" onClick={() => signOut()} className="w-full" disabled={checkoutLoading}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If approval is required, check profile status
  if (requireApproval && profile) {
    if (isPending) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Account Pending Approval</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your account has been created successfully but is pending approval from our team. 
                You'll receive an email notification once your account is approved.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  This usually takes 1-2 business days. Thank you for your patience!
                </p>
              </div>
              <Button variant="outline" onClick={() => signOut()} className="w-full">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (isRejected) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl">Account Not Approved</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Unfortunately, your account application was not approved at this time. 
                Please contact our support team if you have any questions.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  For assistance, please reach out to support@alphalens.ai
                </p>
              </div>
              <Button variant="outline" onClick={() => signOut()} className="w-full">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!isApproved) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Account Setup Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your account setup is incomplete. Please complete the verification process 
                or contact support for assistance.
              </p>
              <Button variant="outline" onClick={() => signOut()} className="w-full">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // User is authenticated and approved (if required), render children
  return <>{children}</>;
}