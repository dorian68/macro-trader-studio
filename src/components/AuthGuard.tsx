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
  const { profile, loading: profileLoading, isPending, isRejected, isApproved, isDeleted } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reactivating, setReactivating] = useState(false);

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

  // Handle account reactivation request
  const handleRequestReactivation = async () => {
    if (!user) return;
    
    setReactivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-reactivation');
      
      if (error) throw error;
      
      toast({
        title: "Reactivation Request Sent",
        description: "Your request has been sent to our team. You will receive a response via email within 24-48 hours.",
      });
    } catch (error: any) {
      console.error('[AuthGuard] Reactivation request error:', error);
      
      if (error.message?.includes('already have a pending')) {
        toast({
          title: "Request Already Pending",
          description: "You already have a pending reactivation request. Please wait for our team to review it.",
        });
      } else {
        toast({
          title: "Request Failed",
          description: "Unable to submit your reactivation request. Please try again or contact support.",
          variant: "destructive",
        });
      }
    } finally {
      setReactivating(false);
    }
  };

  // ✅ Check if user is soft-deleted (safety net)
  if (isDeleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Account Deactivated</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your account has been deactivated. Submit a reactivation request and our team will review it.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Your request will be reviewed by our team within 24-48 hours. You'll receive an email notification with the decision.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleRequestReactivation} 
                disabled={reactivating}
                className="w-full"
              >
                {reactivating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  "Request Account Reactivation"
                )}
              </Button>
              <Button variant="outline" onClick={() => signOut()} className="w-full" disabled={reactivating}>
                Sign Out
              </Button>
            </div>
            <div className="bg-muted border border-border rounded-lg p-3 mt-4">
              <p className="text-xs text-muted-foreground">
                Need help? Contact support@alphalens.ai
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return null;
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