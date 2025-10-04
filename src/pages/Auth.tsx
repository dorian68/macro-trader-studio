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

const { useState, useEffect } = React;

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [activeBrokers, setActiveBrokers] = useState([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { activateFreeTrial } = useCreditManager();
  const intent = searchParams.get('intent');
  const { fetchActiveBrokers } = useBrokerActions();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user && event === 'SIGNED_IN' && window.location.pathname === '/auth') {
          // Don't redirect if we're in free trial flow
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

    return () => subscription.unsubscribe();
  }, [navigate, intent]);

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

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
                <Button type="submit" className="w-full" disabled={loading}>
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