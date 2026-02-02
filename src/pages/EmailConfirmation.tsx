import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import alphalensLogo from '@/assets/alphalens-logo.png';

export default function EmailConfirmation() {
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get current user email
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');

        // Check if email is already confirmed
        if (user.email_confirmed_at) {
          navigate('/dashboard');
        }
      } else {
        // No user session, redirect to auth
        navigate('/auth');
      }
    };

    getUser();

    // Listen for auth changes to detect confirmation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session?.user?.email_confirmed_at) {
          // Email confirmed, redirect to dashboard
          navigate('/dashboard');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResendConfirmation = async () => {
    if (!userEmail) return;

    setLoading(true);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: userEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Email sent",
        description: "A new confirmation email has been sent to you."
      });
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
      <Card className="w-full max-w-md bg-[#0a0a0a] border-white/10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-1">
            <img
              src="/logo_v2.png"
              alt="Alphalens"
              className="h-24 w-auto"
            />
          </div>
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-blue-400" />
          </div>
          <CardTitle className="text-xl text-white">Confirm your email address</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-400">
            We've sent a confirmation email to <strong className="text-white">{userEmail}</strong>.
            Please click the link in that email to activate your account.
          </p>
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              💡 Also check your spam folder if you can't find the email.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleResendConfirmation}
              disabled={loading}
              variant="outline"
              className="w-full border-white/20 hover:bg-white/10 text-white"
            >
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Resend confirmation email
            </Button>

            <Button variant="ghost" onClick={handleSignOut} className="w-full text-gray-400 hover:text-white hover:bg-white/5">
              Sign out
            </Button>
          </div>

          <div className="text-xs text-gray-500 mt-4">
            Once your email is confirmed, your account will be submitted for approval by our team.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}