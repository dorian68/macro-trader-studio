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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
// import newLogo from '@/assets/new-logo.png'; // Removed unused import
import PublicNavbar from '@/components/PublicNavbar';
import { useBrokerActions } from '@/hooks/useBrokerActions';
import { useCreditManager } from '@/hooks/useCreditManager';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { useTranslation } from 'react-i18next';

const { useState, useEffect } = React;

export default function Auth() {
  const { t } = useTranslation('auth');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  const [showBrokerPicker, setShowBrokerPicker] = useState(false);
  const [brokerChoice, setBrokerChoice] = useState<string | null>(null);
  const [pendingGoogleSession, setPendingGoogleSession] = useState<any>(null);
  const [showReactivation, setShowReactivation] = useState(false);
  const [pendingReactivationUser, setPendingReactivationUser] = useState<any>(null);
  const [session, setSession] = useState(null);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [activeBrokers, setActiveBrokers] = useState([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { activateFreeTrial } = useCreditManager();
  const intent = searchParams.get('intent');
  const { fetchActiveBrokers } = useBrokerActions();

  // ✅ Controlled tab state synchronized with URL query param
  const [tabValue, setTabValue] = useState<'signin' | 'signup'>(
    searchParams.get('tab') === 'signup' ? 'signup' : 'signin'
  );

  // Sync tabValue with URL query param changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signup' || tab === 'signin') {
      setTabValue(tab);
    }
  }, [searchParams]);

  // Diagnostic: parse OAuth errors and set fallback timer when returning from Google
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const urlError = url.searchParams.get('error');
      const urlErrorDesc = url.searchParams.get('error_description');

      if (urlError) {
        console.error('[Google Auth] OAuth error returned:', { urlError, urlErrorDesc });
        toast({
          title: t('errors.googleOAuthFailed') || 'Échec de la connexion Google',
          description: urlErrorDesc || urlError,
          variant: 'destructive',
        });
        setProcessingOAuth(false);
        setGoogleLoading(false);
      }

      const hasOAuthParams = !!url.searchParams.get('code') || window.location.hash.includes('access_token');
      if (window.location.pathname === '/auth' && hasOAuthParams) {
        const timer = setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('[Google Auth] CONFIG WARNING: No session after OAuth redirect. Check Supabase Auth URL Configuration and Google Provider.');
            toast({
              title: t('errors.oauthIncomplete') || 'Connexion Google incomplète',
              description: t('errors.checkAuthConfig') || 'Vérifiez la configuration Supabase (URL/Redirects & Google) puis réessayez.',
              variant: 'destructive',
            });
            setProcessingOAuth(false);
            setGoogleLoading(false);
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('[Google Auth] Diagnostic effect error:', e);
    }
  }, [searchParams, t, toast]);

  // Validate password confirmation in real-time
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordMatchError(t('passwordsDoNotMatch'));
    } else {
      setPasswordMatchError('');
    }
  }, [password, confirmPassword, t]);

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
    // BUT NOT if we're in an active OAuth flow
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const oauthFlow = localStorage.getItem('oauth_flow');
      const oauthStartedAt = localStorage.getItem('oauth_started_at');
      const isOAuthActive = oauthFlow && oauthStartedAt && (Date.now() - parseInt(oauthStartedAt)) < 300000; // 5min
      const hasOAuthParams = window.location.search.includes('code') || window.location.hash.includes('access_token');

      if (session?.user && window.location.pathname === '/auth' && intent !== 'free_trial' && !isOAuthActive && !hasOAuthParams) {
        navigate('/dashboard');
      }
    });

    // Async handler for OAuth events (deferred from onAuthStateChange)
    const handleOAuthEvent = async (session: any) => {
      setProcessingOAuth(true);
      console.log('[Google Auth] Processing OAuth callback');

      try {
        // ✅ FIX 1: Check if profile exists instead of using created_at timing
        console.log('[Google Auth] Checking for existing profile...');
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('user_id, broker_id, broker_name, status')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const isNewUser = !existingProfile;
        console.log('[Google Auth] Profile check:', { isNewUser, profile: existingProfile });

        // Fetch initial profile
        let { data: profile } = await supabase
          .from('profiles')
          .select('broker_id, status, is_deleted, created_at')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // 🔄 Offer reactivation for soft-deleted users
        if (profile?.is_deleted) {
          console.log('[Google Auth] User is soft-deleted, offering reactivation');
          setPendingReactivationUser(session.user);
          setShowReactivation(true);
          setProcessingOAuth(false);
          setGoogleLoading(false);
          return;
        }

        // ✅ FIX 3: Use localStorage instead of sessionStorage for OAuth popup compatibility
        let pendingBrokerId: string | null = null;
        let pendingBrokerName: string | null = null;

        const storedBrokerData = localStorage.getItem('oauth_pending_broker');
        if (storedBrokerData) {
          try {
            const { brokerId, brokerName, timestamp } = JSON.parse(storedBrokerData);
            // Check if not expired (5 minutes = 300000ms)
            if (Date.now() - timestamp < 300000) {
              pendingBrokerId = brokerId;
              pendingBrokerName = brokerName;
              console.log('[Google Auth] Retrieved broker from localStorage:', { brokerId, brokerName });
            } else {
              console.warn('[Google Auth] Broker data expired in localStorage');
            }
          } catch (e) {
            console.error('[Google Auth] Failed to parse broker data from localStorage:', e);
          }
          localStorage.removeItem('oauth_pending_broker');
        }
        console.log(`[Google Auth] pendingBrokerId: ${pendingBrokerId}, pendingBrokerName: ${pendingBrokerName}`);

        if (isNewUser) {
          console.log('[Google Auth] New user detected, waiting for trigger profile creation');

          // No broker selected during signup - guide user to Sign Up tab
          // No broker selected during signup - Allow proceeding without broker for direct registration
          if (!pendingBrokerId) {
            console.log('[Google Auth] No broker selected - proceeding with direct registration');
          }

          // ✅ FIX 2: Increase timeout to 10 seconds (10 retries)
          let profile = null;
          let retries = 0;
          while (!profile && retries < 10) {
            console.log(`[Google Auth] Retry ${retries + 1}/10 - waiting for profile creation`);
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            profile = data;
            retries++;
          }

          // ✅ FIX 3: Fallback - manually create profile if trigger failed
          if (!profile) {
            console.warn('[Google Auth] Profile not created by trigger, creating manually...');
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({
                user_id: session.user.id,
                email: session.user.email,
                status: 'pending'
              })
              .select()
              .single();

            if (insertError) {
              console.error('[Google Auth] Failed to create profile manually:', insertError);
              console.error('[Google Auth] LOGOUT TRIGGERED:', {
                reason: 'profile_creation_failed',
                userId: session.user.id,
                timestamp: new Date().toISOString()
              });
              toast({
                title: t('errors.accountCreationFailed'),
                description: 'Profile creation failed. Please try again.',
                variant: 'destructive'
              });
              await supabase.auth.signOut();
              setProcessingOAuth(false);
              setGoogleLoading(false);
              return;
            }

            profile = newProfile;
            console.log('[Google Auth] Profile created manually:', profile);
          }

          // Update profile with broker if one was selected
          if (pendingBrokerId) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                broker_id: pendingBrokerId,
                broker_name: pendingBrokerName,
                status: 'pending'
              })
              .eq('user_id', session.user.id);

            if (updateError) {
              console.error('[Google Auth] Failed to update profile with broker:', updateError);
              // Log error but allow proceed for direct registration? 
              // Or if broker was selected but failed, maybe we should just log.
            } else {
              console.log('[Google Auth] Broker assigned successfully');
            }
          }

          console.log('[Google Auth] Broker assigned successfully');

          toast({
            title: t('success.accountCreated'),
            description: t('success.accountCreatedDescription'),
          });

          // Clear OAuth flags
          localStorage.removeItem('oauth_flow');
          localStorage.removeItem('oauth_started_at');
          localStorage.removeItem('oauth_pending_broker');

          navigate('/dashboard');
          setProcessingOAuth(false);
          return;
        } else {
          // Returning user
          console.log('[Google Auth] Returning user detected');

          // ✅ FIX 5: Handle returning user without profile
          if (!existingProfile) {
            console.warn('[Google Auth] Returning user has no profile, will show broker picker');
            setPendingGoogleSession(session);
            setShowBrokerPicker(true);
            setProcessingOAuth(false);
            setGoogleLoading(false);
            localStorage.removeItem('oauth_flow');
            localStorage.removeItem('oauth_started_at');
            return;
          } else {
            // Check broker assignment
            if (!existingProfile.broker_id) {
              console.warn('[Google Auth] Returning user has no broker assigned, will show broker picker');
              setPendingGoogleSession(session);
              setShowBrokerPicker(true);
              setProcessingOAuth(false);
              setGoogleLoading(false);
              localStorage.removeItem('oauth_flow');
              localStorage.removeItem('oauth_started_at');
              return;
            }

            // Show welcome back message
            toast({
              title: t('success.welcomeBack'),
              description: t('success.welcomeBackDescription'),
            });
          }

          // Handle free trial if needed
          if (intent === 'free_trial') {
            const { error: trialError } = await activateFreeTrial();
            if (!trialError) {
              toast({
                title: t('success.freeTrialActivated'),
                description: t('success.freeTrialActivatedDescription'),
              });
              navigate('/payment-success?type=free_trial');
              setProcessingOAuth(false);
              return;
            }
          }

          // Navigate to dashboard
          // Clear OAuth flags
          localStorage.removeItem('oauth_flow');
          localStorage.removeItem('oauth_started_at');

          if (intent !== 'free_trial') {
            navigate('/dashboard');
          } else {
            navigate('/');
          }

          setProcessingOAuth(false);
        }
      } catch (error) {
        console.error('[Google Auth] Unexpected error:', error);
        await supabase.auth.signOut();
        toast({
          title: t('errors.authenticationError'),
          description: t('errors.authenticationErrorDescription'),
          variant: "destructive"
        });
        setProcessingOAuth(false);
      }
    };

    return () => subscription.unsubscribe();
  }, [navigate, intent, toast, activateFreeTrial, t]);

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



    // Validate password confirmation
    if (password !== confirmPassword) {
      toast({
        title: t('errors.passwordMismatch'),
        description: t('errors.passwordMismatchDescription'),
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('errors.passwordTooShort'),
        description: t('errors.passwordTooShortDescription'),
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
          full_name: fullName
        }
      }
    });

    if (error) {
      toast({
        title: t('errors.registrationError'),
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: t('success.registrationSuccessful'),
        description: t('success.registrationSuccessfulDescription')
      });

      // If intent is free_trial, activate it after successful signup
      if (intent === 'free_trial' && !error) {
        setTimeout(async () => {
          const { error: trialError } = await activateFreeTrial();
          if (!trialError) {
            toast({
              title: t('success.freeTrialActivated'),
              description: t('success.freeTrialActivatedDescription'),
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
    setProcessingOAuth(true);

    // Set OAuth flow flags
    localStorage.setItem('oauth_flow', 'signin');
    localStorage.setItem('oauth_started_at', Date.now().toString());

    const redirectUrl = `${window.location.origin}/auth`;
    console.log('[Google Sign In] Starting OAuth redirect', { redirectTo: redirectUrl });

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
        title: t('errors.googleSignInError'),
        description: error.message,
        variant: "destructive"
      });
      setGoogleLoading(false);
      setProcessingOAuth(false);
      localStorage.removeItem('oauth_flow');
      localStorage.removeItem('oauth_started_at');
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setProcessingOAuth(true);

    // Set OAuth flow flags
    localStorage.setItem('oauth_flow', 'signup');
    localStorage.setItem('oauth_started_at', Date.now().toString());

    const redirectUrl = `${window.location.origin}/auth`;

    console.log('[Google Sign Up] Starting OAuth redirect', { redirectTo: redirectUrl });

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
        title: t('errors.googleSignUpError'),
        description: error.message,
        variant: "destructive"
      });
      setGoogleLoading(false);
      setProcessingOAuth(false);
      localStorage.removeItem('oauth_flow');
      localStorage.removeItem('oauth_started_at');
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
        // Offer reactivation instead of blocking
        console.log('[Email Auth] User is soft-deleted, offering reactivation');
        setPendingReactivationUser(data.user);
        setShowReactivation(true);
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
        title: t('errors.loginError'),
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
            title: t('success.freeTrialActivated'),
            description: t('success.freeTrialActivatedDescription'),
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

  // Handle broker selection from picker dialog
  const handleBrokerPickerConfirm = async () => {
    if (!brokerChoice || !pendingGoogleSession) {
      toast({
        title: t('errors.validationError'),
        description: t('errors.selectBrokerError'),
        variant: 'destructive',
      });
      return;
    }

    setProcessingOAuth(true);
    const selectedBroker = activeBrokers.find((b: any) => b.id === brokerChoice);

    try {
      // Wait for profile to exist (fallback if trigger is slow)
      let attempts = 0;
      let profile = null;
      while (attempts < 10 && !profile) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', pendingGoogleSession.user.id)
          .maybeSingle();
        profile = data;
        if (!profile) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      // If still no profile, create one manually
      if (!profile) {
        console.warn('[Broker Picker] Profile not found after 10s, creating manually');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: pendingGoogleSession.user.id,
            status: 'pending',
          });

        if (insertError) {
          console.error('[Broker Picker] Failed to create profile:', insertError);
          toast({
            title: t('errors.profileCreationFailed'),
            description: t('errors.profileCreationFailedDescription'),
            variant: 'destructive',
          });
          setProcessingOAuth(false);
          return;
        }
      }

      // Update profile with broker
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          broker_id: brokerChoice,
          broker_name: selectedBroker?.name || '',
          status: 'pending',
        })
        .eq('user_id', pendingGoogleSession.user.id);

      if (updateError) {
        console.error('[Broker Picker] Failed to update broker:', updateError);
        toast({
          title: t('errors.brokerAssignmentFailed'),
          description: t('errors.brokerAssignmentFailedDescription'),
          variant: 'destructive',
        });
        setProcessingOAuth(false);
        return;
      }

      // Success
      console.log('[Broker Picker] Broker assigned successfully');
      toast({
        title: t('success.accountCreated'),
        description: t('success.accountCreatedDescription'),
      });

      // Clean up and navigate
      setShowBrokerPicker(false);
      setBrokerChoice(null);
      setPendingGoogleSession(null);
      localStorage.removeItem('oauth_flow');
      localStorage.removeItem('oauth_started_at');
      localStorage.removeItem('oauth_pending_broker');
      setProcessingOAuth(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('[Broker Picker] Unexpected error:', error);
      toast({
        title: t('errors.authenticationError'),
        description: t('errors.authenticationErrorDescription'),
        variant: 'destructive',
      });
      setProcessingOAuth(false);
    }
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
                  <p className="text-sm text-muted-foreground">{t('processingGoogleSignIn')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Broker Picker Dialog for Google OAuth without broker */}
        <Dialog open={showBrokerPicker} onOpenChange={setShowBrokerPicker}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('selectBroker')}</DialogTitle>
              <DialogDescription>
                {t('brokerRequired')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={brokerChoice || ''} onValueChange={setBrokerChoice}>
                <SelectTrigger>
                  <SelectValue placeholder={t('brokerPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {activeBrokers.map((broker: any) => (
                    <SelectItem key={broker.id} value={broker.id}>
                      {broker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeBrokers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('brokerNotListed')}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleBrokerPickerConfirm}
                disabled={!brokerChoice || processingOAuth}
                className="w-full"
              >
                {processingOAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('createAccount')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reactivation Dialog for soft-deleted users */}
        <Dialog open={showReactivation} onOpenChange={setShowReactivation}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('reactivation.title')}</DialogTitle>
              <DialogDescription>
                {t('reactivation.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  Your request will be reviewed by our team within 24-48 hours. You'll receive an email notification with the decision.
                </p>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReactivation(false);
                  setPendingReactivationUser(null);
                  supabase.auth.signOut();
                  navigate('/auth');
                }}
                disabled={loading}
                className="w-full"
              >
                {t('reactivation.cancel')}
              </Button>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('request-reactivation');

                    if (error) throw error;

                    toast({
                      title: t('auth.reactivation.request_sent_title'),
                      description: t('auth.reactivation.request_sent_description'),
                    });

                    setShowReactivation(false);
                    setPendingReactivationUser(null);
                    await supabase.auth.signOut();
                    navigate('/auth');
                  } catch (error: any) {
                    console.error('[Auth] Reactivation request error:', error);

                    if (error.message?.includes('already have a pending')) {
                      toast({
                        title: t('auth.reactivation.pending_request_title'),
                        description: t('auth.reactivation.pending_request_description'),
                      });
                    } else {
                      toast({
                        title: t('auth.reactivation.request_error_title'),
                        description: t('auth.reactivation.request_error_description'),
                        variant: "destructive",
                      });
                    }
                    await supabase.auth.signOut();
                    navigate('/auth');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.reactivation.request_button')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <Card className="w-full max-w-md bg-card border-white/10 shadow-glow-primary">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-1">
              <img
                src="/logo_v2.png"
                alt="Alphalens"
                className="h-24 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold">{t('welcomeToAlphalens')}</CardTitle>
            <CardDescription>
              {t('connectToDashboard')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={tabValue}
              onValueChange={(v) => setTabValue(v as 'signin' | 'signup')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
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
                        {t('orContinueWithEmail')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('password')}</Label>
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
                      {t('stayLoggedIn')}
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('signIn')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <GoogleAuthButton
                    mode="signup"
                    loading={googleLoading}
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                  />

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {t('orSignupWithEmail')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Full Name</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('password')}</Label>
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
                    <Label htmlFor="signup-confirm-password">{t('confirmPassword')}</Label>
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
                    {t('signUp')}
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