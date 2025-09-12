import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import alphalensLogo from '@/assets/alphalens-logo.png';
import PublicNavbar from '@/components/PublicNavbar';

const { useState, useEffect } = React;

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user && event === 'SIGNED_IN') {
          navigate('/dashboard');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Don't auto-navigate, let AuthGuard handle approval status
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate broker name
    if (!brokerName.trim()) {
      toast({
        title: "Validation Error",
        description: "Broker name is required.",
        variant: "destructive"
      });
      return;
    }
    
    if (brokerName.length < 2 || brokerName.length > 80) {
      toast({
        title: "Validation Error", 
        description: "Broker name must be between 2 and 80 characters.",
        variant: "destructive"
      });
      return;
    }
    
    if (!/^[a-zA-Z0-9\s\-&]+$/.test(brokerName)) {
      toast({
        title: "Validation Error",
        description: "Broker name can only contain letters, numbers, spaces, hyphens, and ampersands.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          broker_name: brokerName.trim()
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
              src={alphalensLogo} 
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
                  <Label htmlFor="signup-broker">Broker Name *</Label>
                  <Input
                    id="signup-broker"
                    type="text"
                    value={brokerName}
                    onChange={(e) => setBrokerName(e.target.value)}
                    placeholder="Enter your broker name"
                    required
                    minLength={2}
                    maxLength={80}
                  />
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