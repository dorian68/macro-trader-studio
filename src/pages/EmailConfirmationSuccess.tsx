import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function EmailConfirmationSuccess() {
  const navigate = useNavigate();
  const [checkingPlan, setCheckingPlan] = useState(false);

  useEffect(() => {
    document.title = "Email Confirmed - Alphalens";

    // Check for pending plan and redirect to checkout immediately if signed in
    const checkPendingPlan = async () => {
      const pendingPlan = localStorage.getItem('alphalens_pending_plan');
      if (!pendingPlan) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log('[EmailConfirmation] Processing pending plan:', pendingPlan);
      setCheckingPlan(true);
      localStorage.removeItem('alphalens_pending_plan');

      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            plan: pendingPlan,
            success_url: 'https://alphalensai.com/payment-success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://alphalensai.com/payment-canceled'
          }
        });
        if (!error && data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (e) {
        console.error('[EmailConfirmation] Failed to create checkout:', e);
      }
      setCheckingPlan(false);
    };

    // Small delay to let Supabase process the confirmation token
    const timer = setTimeout(checkPendingPlan, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleGoToLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
      <Card className="w-full max-w-md text-center bg-[#0a0a0a] border-white/10">
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-4 py-4">
            <img
              src="/header_logo.png"
              alt="Alphalens AI"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Your email has been successfully confirmed
          </h1>
        </CardHeader>

        <CardContent className="space-y-6">
          {checkingPlan ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-gray-400 text-lg">
                Redirecting you to complete your subscription...
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-lg">
                Welcome to Alphalens. Your account is now verified. You can proceed to login and start using the platform.
              </p>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  Your account has been successfully activated and is ready to use. Our team will review your registration for full access.
                </p>
              </div>

              <Button
                onClick={handleGoToLogin}
                className="w-full h-12 text-lg font-semibold bg-white text-black hover:bg-gray-200 border-none"
                size="lg"
              >
                Go to Login
              </Button>

              <p className="text-xs text-gray-500 mt-6">
                If you have any questions, please contact our support team.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
