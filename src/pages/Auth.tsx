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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        // Handle Google OAuth callback
        if (event === 'SIGNED_IN' && session?.user) {
          const provider = session.user.app_metadata.provider;
          
          if (provider === 'google') {
            console.log('[Google Auth] User signed in via Google');
            
            // Check if profile exists AND if user is soft-deleted
            const { data: profile, error: profileError } = await supabase
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
              
              return;
            }
            
            // Determine if this is a NEW user or RETURNING user
            const isNewUser = profile && new Date(profile.created_at).getTime() > Date.now() - 5000;
            
            if (isNewUser) {
              console.log('[Google Auth] NEW user detected');
              
              // Get pending broker info from sessionStorage (set in handleGoogleSignUp)
              const pendingBrokerId = sessionStorage.getItem('pending_broker_id');
              const pendingBrokerName = sessionStorage.getItem('pending_broker_name');
              
              if (pendingBrokerId && profile && !profile.broker_id) {
                // Update profile with broker info
                console.log('[Google Auth] Updating new user profile with broker');
                
                await supabase
                  .from('profiles')
                  .update({
                    broker_id: pendingBrokerId,
                    broker_name: pendingBrokerName,
                    status: 'pending' // Keep pending for approval
                  })
                  .eq('user_id', session.user.id);
                
                // Clear temporary storage
                sessionStorage.removeItem('pending_broker_id');
                sessionStorage.removeItem('pending_broker_name');
                
                toast({
                  title: "Account Created",
                  description: "Your account has been created and is pending approval. You'll receive an email once it's activated.",
                });
                
                // Redirect to dashboard - AuthGuard will show pending message
                navigate('/dashboard');
                return;
              }
              
              // If no broker info in sessionStorage, user needs to complete signup
              if (!profile?.broker_id) {
                toast({
                  title: "Setup Required",
                  description: "Please select your broker to complete registration.",
                  variant: "destructive",
                });
                
                await supabase.auth.signOut();
                return;
              }
            } else {
              console.log('[Google Auth] RETURNING user detected');
              
              // Returning user - just sign in normally
              // Update broker info if it was pending
              if (profile && !profile.broker_id) {
                const pendingBrokerId = sessionStorage.getItem('pending_broker_id');
                const pendingBrokerName = sessionStorage.getItem('pending_broker_name');
                
                if (pendingBrokerId) {
                  await supabase
                    .from('profiles')
                    .update({
                      broker_id: pendingBrokerId,
                      broker_name: pendingBrokerName
                    })
                    .eq('user_id', session.user.id);
                  
                  sessionStorage.removeItem('pending_broker_id');
                  sessionStorage.removeItem('pending_broker_name');
                }
              }
              
              toast({
                title: "Welcome back!",
                description: "Successfully signed in with Google.",
              });
            }
            
            // Handle free trial if needed
            if (intent === 'free_trial') {
              const { error: trialError } = await activateFreeTrial();
              if (!trialError) {
                toast({
                  title: "🎁 Free Trial Activated!",
                  description: "Your account is ready with Free Trial access.",
                });
                navigate('/payment-success?type=free_trial');
                return;
              }
            }
            
            // Standard redirect to dashboard
            if (window.location.pathname === '/auth') {
              navigate('/dashboard');
            }
          } else {
            // Email/password flow
            if (session?.user && event === 'SIGNED_IN' && window.location.pathname === '/auth') {
              // Don't redirect if we're in free trial flow
              if (intent !== 'free_trial') {
                navigate('/dashboard');
              }
            }
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
          prompt: 'consent',
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
          prompt: 'consent',
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