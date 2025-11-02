import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import newLogo from '@/assets/new-logo.png';
import PublicNavbar from '@/components/PublicNavbar';
import { useBrokerActions } from '@/hooks/useBrokerActions';
import { useCreditManager } from '@/hooks/useCreditManager';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

const { useState, useEffect } = React;

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  const [session, setSession] = useState(null);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [activeBrokers, setActiveBrokers] = useState([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { activateFreeTrial } = useCreditManager();
  const intent = searchParams.get('intent');
  const { fetchActiveBrokers } = useBrokerActions();

  // Validate password confirmation in real-time
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordMatchError('Passwords do not match');
    } else {
      setPasswordMatchError('');
    }
  }, [password, confirmPassword]);

  useEffect(() => {
    // CRITICAL: onAuthStateChange callback must NOT be async and must NOT call Supabase
    // To prevent deadlocks, defer all async operations to a separate function
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[Auth] onAuthStateChange event: ${event}, provider: ${session?.user?.app_metadata?.provider}`);
        setSession(session);
        
        // Defer OAuth handling to prevent deadlock
        if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
          setTimeout(() => {
            handleOAuthEvent(session);
          }, 0);
        } else if (event === 'SIGNED_IN' && session?.user && window.location.pathname === '/auth') {
          // Email/password flow - simple redirect
          if (intent !== 'free_trial') {
            navigate('/dashboard');
          }
        }
      }
    );

    // Check for existing session - redirect if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user && window.location.pathname === '/auth' && intent !== 'free_trial') {
        navigate('/dashboard');
      }
    });

    // Async handler for OAuth events (deferred from onAuthStateChange)
    const handleOAuthEvent = async (session: any) => {
      setProcessingOAuth(true);
      console.log('[Google Auth] Processing OAuth callback');

      try {
        // Robust isNewUser detection using session.user.created_at
        const userCreatedAt = new Date(session.user.created_at || 0).getTime();
        const isNewUser = Date.now() - userCreatedAt < 10000; // 10 second window
        console.log(`[Google Auth] isNewUser: ${isNewUser} (user created at: ${new Date(userCreatedAt).toISOString()})`);

        // Fetch initial profile
        let { data: profile } = await supabase
          .from('profiles')
          .select('broker_id, status, is_deleted, created_at')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // 🚫 Block soft-deleted users
        if (profile?.is_deleted) {
          console.log('[Google Auth] User is soft-deleted, blocking login');
          await supabase.auth.signOut();
          toast({
            title: "Account Deactivated",
            description: "Your account has been deactivated. Please contact support if you think this is an error.",
            variant: "destructive",
          });
          setProcessingOAuth(false);
          return;
        }

        const pendingBrokerId = sessionStorage.getItem('pending_broker_id');
        const pendingBrokerName = sessionStorage.getItem('pending_broker_name');
        console.log(`[Google Auth] pendingBrokerId: ${pendingBrokerId}, pendingBrokerName: ${pendingBrokerName}`);

        if (isNewUser) {
          console.log('[Google Auth] NEW user flow');

          // Case 1: New user tried to Sign In without selecting broker (mistake)
          if (!pendingBrokerId) {
            console.log('[Google Auth] New user tried to sign in without broker - redirecting to Sign Up');
            await supabase.auth.signOut();
            toast({
              title: "Compte inexistant",
              description: "Veuillez vous inscrire en sélectionnant votre broker dans l'onglet Sign Up.",
              variant: "destructive",
            });
            setProcessingOAuth(false);
            return;
          }

          // Case 2: New user with broker - wait for profile creation, then update
          console.log('[Google Auth] New user with broker - waiting for profile creation');

          // Wait for profile to be created by trigger (max 5 retries = 5 seconds)
          let retries = 0;
          while (!profile && retries < 5) {
            console.log(`[Google Auth] Retry ${retries + 1}/5 - waiting for profile creation`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data } = await supabase
              .from('profiles')
              .select('broker_id, status, is_deleted, created_at')
              .eq('user_id', session.user.id)
              .maybeSingle();
            profile = data;
            retries++;
          }

          if (!profile) {
            console.error('[Google Auth] Profile not created after 5 retries');
            await supabase.auth.signOut();
            toast({
              title: "Error",
              description: "Profile creation failed. Please contact support.",
              variant: "destructive"
            });
            setProcessingOAuth(false);
            return;
          }

          console.log(`[Google Auth] Profile found after ${retries} retries, updating broker info`);

          // Update profile with broker info
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              broker_id: pendingBrokerId,
              broker_name: pendingBrokerName,
              status: 'pending'
            })
            .eq('user_id', session.user.id);

          if (updateError) {
            console.error('[Google Auth] Failed to update broker:', updateError);
            await supabase.auth.signOut();
            toast({
              title: "Error",
              description: "Failed to assign broker. Please contact support.",
              variant: "destructive"
            });
            setProcessingOAuth(false);
            return;
          }

          console.log('[Google Auth] Broker assigned successfully');

          // Clear temporary storage
          sessionStorage.removeItem('pending_broker_id');
          sessionStorage.removeItem('pending_broker_name');

          toast({
            title: "Account Created",
            description: "Your account has been created and is pending approval. You'll receive an email once it's activated.",
          });

          navigate('/dashboard');
          setProcessingOAuth(false);
          return;
        } else {
          console.log('[Google Auth] RETURNING user flow');

          // Returning user - simple sign in
          toast({
            title: "Welcome back!",
            description: "Successfully signed in with Google.",
          });

          // Handle free trial if needed
          if (intent === 'free_trial') {
            const { error: trialError } = await activateFreeTrial();
            if (!trialError) {
              toast({
                title: "🎁 Free Trial Activated!",
                description: "Your account is ready with Free Trial access.",
              });
              navigate('/payment-success?type=free_trial');
              setProcessingOAuth(false);
              return;
            }
          }

          // Standard redirect to dashboard
          if (window.location.pathname === '/auth') {
            navigate('/dashboard');
          }

          setProcessingOAuth(false);
        }
      } catch (error) {
        console.error('[Google Auth] Unexpected error:', error);
        await supabase.auth.signOut();
        toast({
          title: "Authentication Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
        setProcessingOAuth(false);
      }
    };

    return () => subscription.unsubscribe();
  }, [navigate, intent, toast, activateFreeTrial]);

  // Separate effect for loading brokers
  useEffect(() => {
    const loadBrokers = async () => {
      try {
        const brokers = await fetchActiveBrokers();
        setActiveBrokers(brokers);
      } catch (error) {
        console.error('Failed to load brokers:', error);
      }
    };

    loadBrokers();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate broker selection
    if (!selectedBrokerId) {
      toast({
        title: "Validation Error",
        description: "Please select a broker.",
        variant: "destructive"
      });
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure both password fields are identical.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const selectedBroker = activeBrokers.find((b: any) => b.id === selectedBrokerId);
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          broker_id: selectedBrokerId,
          broker_name: selectedBroker?.name || null
        }
      }
    });

    if (error) {
      toast({
        title: "Registration Error",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Registration Successful",
        description: "Check your email to confirm your account. Your account will be reviewed for approval."
      });
      
      // If intent is free_trial, activate it after successful signup
      if (intent === 'free_trial' && !error) {
        setTimeout(async () => {
          const { error: trialError } = await activateFreeTrial();
          if (!trialError) {
            toast({
              title: "🎁 Free Trial Activated!",
              description: "Your account is ready with Free Trial access.",
            });
            navigate('/payment-success?type=free_trial');
          }
        }, 1000);
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        }
      }
    });
    
    if (error) {
      toast({
        title: "Google Sign-In Error",
        description: error.message,
        variant: "destructive"
      });
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    // First, check if broker is selected
    if (!selectedBrokerId) {
      toast({
        title: "Broker Required",
        description: "Please select a broker before signing up with Google.",
        variant: "destructive"
      });
      return;
    }
    
    setGoogleLoading(true);
    
    const selectedBroker = activeBrokers.find((b: any) => b.id === selectedBrokerId);
    const redirectUrl = `${window.location.origin}/auth`;
    
    // Store broker info temporarily for OAuth callback
    sessionStorage.setItem('pending_broker_id', selectedBrokerId);
    sessionStorage.setItem('pending_broker_name', selectedBroker?.name || '');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        }
      }
    });
    
    if (error) {
      toast({
        title: "Google Sign-Up Error",
        description: error.message,
        variant: "destructive"
      });
      setGoogleLoading(false);
      // Clear stored broker info
      sessionStorage.removeItem('pending_broker_id');
      sessionStorage.removeItem('pending_broker_name');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // ✅ Check for soft-deleted users
    if (data.user && !error) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_deleted, deleted_at')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      if (profile?.is_deleted) {
        // Force sign out
        await supabase.auth.signOut();
        
        toast({
          title: "Account Deactivated",
          description: "Your account has been deactivated. Please contact support if you think this is an error.",
          variant: "destructive",
        });
        
        setLoading(false);
        return;
      }
    }

    // Store stay logged in preference separately after successful login
    if (data.user && !error && stayLoggedIn) {
      localStorage.setItem('alphalens_stay_logged_in', 'true');
    }

    if (error) {
      toast({
        title: "Login Error",
        description: error.message,
        variant: "destructive"
      });
    } else if (data.user && !data.user.email_confirmed_at) {
      // User exists but email not confirmed, redirect to confirmation page
      navigate('/email-confirmation');
    } else if (data.user) {
      // If intent is free_trial, activate it after successful signin
      if (intent === 'free_trial') {
        const { error: trialError } = await activateFreeTrial();
        if (!trialError) {
          toast({
            title: "🎁 Free Trial Activated!",
            description: "Start exploring all features now!",
          });
          navigate('/payment-success?type=free_trial');
          setLoading(false);
          return;
        }
      }
      
      // Redirect to dashboard after successful sign-in
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      {processingOAuth && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing Google sign-in...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={newLogo} 
              alt="Alphalens" 
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Alphalens</CardTitle>
          <CardDescription>
            Connect to access your trading dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <GoogleAuthButton
                  mode="signin"
                  loading={googleLoading}
                  onClick={handleGoogleSignIn}
                />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="stay-logged-in"
                    checked={stayLoggedIn}
                    onCheckedChange={(checked) => setStayLoggedIn(checked === true)}
                  />
                  <Label htmlFor="stay-logged-in" className="text-sm text-muted-foreground cursor-pointer">
                    Stay logged in
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-broker">Broker *</Label>
                  <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your broker" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      {activeBrokers.map((broker: any) => (
                        <SelectItem key={broker.id} value={broker.id}>
                          {broker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeBrokers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      My broker is not listed? Contact support for assistance.
                    </p>
                  )}
                </div>
                
                <GoogleAuthButton
                  mode="signup"
                  loading={googleLoading}
                  onClick={handleGoogleSignUp}
                  disabled={!selectedBrokerId}
                />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or sign up with email
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className={passwordMatchError ? 'border-destructive' : ''}
                  />
                  {passwordMatchError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <Loader2 className="h-3 w-3" />
                      {passwordMatchError}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading || !!passwordMatchError}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}