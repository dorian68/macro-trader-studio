import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, ArrowLeft, Mail, RefreshCw, CheckCircle2 } from 'lucide-react';
// import newLogo from '@/assets/new-logo.png'; // Removed unused import
import PublicNavbar from '@/components/PublicNavbar';
import { SEOHead } from '@/components/SEOHead';
import { useCreditManager } from '@/hooks/useCreditManager';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { useTranslation } from 'react-i18next';
import {
  AUTH_STORAGE_KEYS,
  beginOAuthAttempt,
  clearOAuthAttempt,
  getOAuthFlow,
  hasFreshOAuthAttempt,
  hasOAuthCallbackParams,
  isExistingSignupResponse,
  isLikelyNewOAuthUser,
  processPendingAuthIntent,
  type OAuthFlow,
} from '@/lib/auth-flow';

const { useState, useEffect, useRef } = React;

// Debug logger — no-op in production (avoids leaking OAuth/provider/user details).
const debugLog = import.meta.env.DEV ? console.log : (..._args: unknown[]) => {};

async function ensureOAuthProfile(userId: string) {
  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, status, is_deleted, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  let profile = await fetchProfile();
  if (profile) return profile;

  const { error: ensureError } = await supabase.functions.invoke('ensure-profile');
  if (ensureError) throw ensureError;

  profile = await fetchProfile();
  if (!profile) throw new Error('Profile is still missing after repair');
  return profile;
}

function removeOAuthCallbackParams() {
  const url = new URL(window.location.href);
  ['code', 'error', 'error_code', 'error_description'].forEach((key) => url.searchParams.delete(key));
  url.hash = '';
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

export default function Auth() {
  const { t } = useTranslation('auth');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { activateFreeTrial } = useCreditManager();
  const intent = searchParams.get('intent');
  const isManualSignInRef = useRef(false);
  const oauthProcessingRef = useRef(false);
  const pendingIntentProcessingRef = useRef(false);
  const processedOAuthTokenRef = useRef<string | null>(null);
  const selectedPlan = searchParams.get('plan');

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
        clearOAuthAttempt(localStorage);
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

  const completePendingAuthIntent = React.useCallback(async () => {
    if (pendingIntentProcessingRef.current) {
      return true;
    }

    pendingIntentProcessingRef.current = true;
    try {
      const result = await processPendingAuthIntent({
        storage: localStorage,
        createCheckout: (plan) => supabase.functions.invoke('create-checkout', {
          body: {
            plan,
            success_url: 'https://alphalensai.com/payment-success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://alphalensai.com/payment-canceled',
          },
        }),
        activateFreeTrial,
      });

      if (result.kind === 'checkout') {
        window.location.href = result.url;
        return true;
      }

      if (result.kind === 'free_trial') {
        navigate('/payment-success?type=free_trial');
        return true;
      }

      if (result.kind === 'error') {
        console.error('[Auth] Failed to process pending post-auth intent:', result.error);
        toast({
          title: t('errors.authenticationError'),
          description: result.error instanceof Error ? result.error.message : t('errors.authenticationErrorDescription'),
          variant: 'destructive',
        });
      }

      return false;
    } finally {
      pendingIntentProcessingRef.current = false;
    }
  }, [activateFreeTrial, navigate, t, toast]);

  const handleOAuthEvent = React.useCallback(async (oauthSession: Session) => {
    if (
      oauthProcessingRef.current ||
      processedOAuthTokenRef.current === oauthSession.access_token
    ) {
      return;
    }

    oauthProcessingRef.current = true;
    setProcessingOAuth(true);
    setGoogleLoading(true);
    const oauthFlow = getOAuthFlow(localStorage);
    debugLog('[Google Auth] Processing OAuth callback', { oauthFlow });

    try {
      const profile = await ensureOAuthProfile(oauthSession.user.id);

      if (profile.is_deleted) {
        clearOAuthAttempt(localStorage);
        processedOAuthTokenRef.current = oauthSession.access_token;
        await supabase.auth.signOut();
        toast({
          title: t('errors.accountDeactivated'),
          description: t('errors.accountDeactivatedDescription'),
          variant: 'destructive',
        });
        return;
      }

      const isNewUser = isLikelyNewOAuthUser(oauthSession.user, oauthFlow);

      toast({
        title: isNewUser ? t('success.accountCreated') : t('success.welcomeBack'),
        description: isNewUser
          ? t('success.accountCreatedDescription')
          : t('success.welcomeBackDescription'),
      });

      clearOAuthAttempt(localStorage);
      removeOAuthCallbackParams();
      processedOAuthTokenRef.current = oauthSession.access_token;

      const intentHandled = await completePendingAuthIntent();
      if (!intentHandled) navigate('/dashboard');
    } catch (error) {
      // Keep the OAuth attempt and pending commercial intent so a reload can retry.
      console.error('[Google Auth] OAuth completion failed:', error);
      toast({
        title: t('errors.authenticationError'),
        description: error instanceof Error ? error.message : t('errors.authenticationErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      oauthProcessingRef.current = false;
      setProcessingOAuth(false);
      setGoogleLoading(false);
    }
  }, [completePendingAuthIntent, navigate, t, toast]);

  useEffect(() => {
    const shouldProcessGoogleOAuth = (event: string, currentSession: Session | null) => {
      if (
        !currentSession ||
        currentSession.user.app_metadata?.provider !== 'google' ||
        window.location.pathname !== '/auth' ||
        processedOAuthTokenRef.current === currentSession.access_token
      ) {
        return false;
      }

      return (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        (hasFreshOAuthAttempt(localStorage) || hasOAuthCallbackParams(window.location))
      );
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        debugLog(`[Auth] onAuthStateChange event: ${event}, provider: ${currentSession?.user?.app_metadata?.provider}`);

        if (shouldProcessGoogleOAuth(event, currentSession)) {
          setTimeout(() => handleOAuthEvent(currentSession!), 0);
        } else if (event === 'SIGNED_IN' && currentSession?.user && window.location.pathname === '/auth') {
          // Skip if handleSignIn is already managing navigation
          if (isManualSignInRef.current) {
            debugLog('[Auth] Skipping onAuthStateChange navigation — handleSignIn is active');
            return;
          }
          setTimeout(async () => {
            const intentHandled = await completePendingAuthIntent();
            if (!intentHandled) navigate('/dashboard');
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!currentSession?.user || window.location.pathname !== '/auth') return;

      if (
        currentSession.user.app_metadata?.provider === 'google' &&
        (hasFreshOAuthAttempt(localStorage) || hasOAuthCallbackParams(window.location))
      ) {
        await handleOAuthEvent(currentSession);
        return;
      }

      if (!hasFreshOAuthAttempt(localStorage) && !hasOAuthCallbackParams(window.location)) {
        const intentHandled = await completePendingAuthIntent();
        if (!intentHandled) navigate('/dashboard');
      }
    }).catch((error) => {
      console.error('[Auth] Failed to restore session:', error);
    });

    return () => subscription.unsubscribe();
  }, [completePendingAuthIntent, handleOAuthEvent, navigate]);

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

    // Password policy: min 10 chars, at least one letter and one digit.
    // NOTE: this is UX only — the authoritative check is Supabase Auth's
    // "Minimum password length" + "Password requirements" (dashboard / config).
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      toast({
        title: t('errors.passwordTooShort') || 'Password too weak',
        description: t('errors.passwordRequirements') ||
          'Use at least 10 characters, including letters and numbers.',
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const redirectUrl = `https://alphalensai.com/confirm-success`;

    const { data, error } = await supabase.auth.signUp({
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
    } else if (isExistingSignupResponse(data.user)) {
      // Email already exists — Supabase returns a fake user with no identities
      toast({
        title: t('errors.emailAlreadyRegistered') || 'Email already registered',
        description: t('errors.emailAlreadyRegisteredDescription') ||
          'An account already uses this email. Sign in or use Forgot Password.',
        variant: "destructive"
      });
      setTabValue('signin');
      setLoading(false);
      return;
    } else {
      // Store selected plan if coming from Pricing page
      if (selectedPlan) {
        localStorage.removeItem(AUTH_STORAGE_KEYS.pendingFreeTrial);
        localStorage.setItem(AUTH_STORAGE_KEYS.pendingPlan, selectedPlan);
      }

      // Store free trial intent for activation after email confirmation + first login
      if (intent === 'free_trial') {
        localStorage.removeItem(AUTH_STORAGE_KEYS.pendingPlan);
        localStorage.setItem(AUTH_STORAGE_KEYS.pendingFreeTrial, 'true');
      }

      // Show inline success state instead of navigating away
      // (Supabase doesn't create a session for unconfirmed users, so EmailConfirmation page would redirect back)
      toast({
        title: t('success.registrationSuccessful'),
        description: t('success.registrationSuccessfulDescription'),
      });
      setSignupEmail(email);
      setSignupSuccess(true);
    }

    setLoading(false);
  };

  const handleGoogleAuth = async (flow: OAuthFlow) => {
    setGoogleLoading(true);
    setProcessingOAuth(true);

    beginOAuthAttempt(localStorage, flow, {
      selectedPlan,
      freeTrial: intent === 'free_trial',
    });

    const redirectUrl = `${window.location.origin}/auth`;
    debugLog('[Google Auth] Starting OAuth redirect', { flow, redirectTo: redirectUrl });

    try {
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

      if (!error) return;
      throw error;
    } catch (error) {
      console.error('[Google Auth] Failed to start OAuth:', error);
      toast({
        title: flow === 'signup' ? t('errors.googleSignUpError') : t('errors.googleSignInError'),
        description: error instanceof Error ? error.message : t('errors.authenticationErrorDescription'),
        variant: "destructive"
      });
      setGoogleLoading(false);
      setProcessingOAuth(false);
      clearOAuthAttempt(localStorage);
    }
  };

  const handleGoogleSignIn = () => handleGoogleAuth('signin');
  const handleGoogleSignUp = () => handleGoogleAuth('signup');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    isManualSignInRef.current = true;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Safety net: if profile is soft-deleted but auth user somehow still exists
    // (should not happen after hard delete), force sign out
    if (data.user && !error) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_deleted')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[Email Auth] Failed to check profile:', profileError);
        toast({
          title: t('errors.authenticationError'),
          description: profileError.message,
          variant: 'destructive',
        });
        setLoading(false);
        isManualSignInRef.current = false;
        return;
      }

      if (profile?.is_deleted) {
        debugLog('[Email Auth] Profile is deleted, signing out');
        await supabase.auth.signOut();
        toast({
          title: t('errors.loginError'),
          description: t('errors.invalidCredentials') || 'Invalid login credentials',
          variant: 'destructive',
        });
        setLoading(false);
        isManualSignInRef.current = false;
        return;
      }

      // ✅ SAFETY NET: Ensure profile exists (fixes orphan case where trigger failed)
      if (!profile) {
        debugLog('[Email Auth] No profile found, calling ensure-profile...');
        const { error: ensureError } = await supabase.functions.invoke('ensure-profile');
        if (ensureError) {
          console.error('[Email Auth] ensure-profile failed:', ensureError);
          toast({
            title: t('errors.authenticationError'),
            description: ensureError.message,
            variant: 'destructive',
          });
          setLoading(false);
          isManualSignInRef.current = false;
          return;
        }
        debugLog('[Email Auth] ensure-profile completed');
      }
    }

    // Store stay logged in preference separately after successful login
    if (data.user && !error && stayLoggedIn) {
      localStorage.setItem('alphalens_stay_logged_in', 'true');
    }

    if (error) {
      const isEmailNotConfirmed =
        error.message?.toLowerCase().includes('not confirmed') ||
        error.code === 'email_not_confirmed';

      if (isEmailNotConfirmed) {
        toast({
          title: t('emailConfirmation.pendingTitle'),
          description: t('emailConfirmation.pendingDescription'),
        });
        navigate(`/email-confirmation?email=${encodeURIComponent(email)}`);
        setLoading(false);
        isManualSignInRef.current = false;
        return;
      }

      toast({
        title: t('errors.loginError'),
        description: error.message,
        variant: "destructive"
      });
    } else if (data.user && !data.user.email_confirmed_at) {
      // User exists but email not confirmed, redirect to confirmation page
      navigate(`/email-confirmation?email=${encodeURIComponent(email)}`);
    } else if (data.user) {
      if (selectedPlan) {
        localStorage.removeItem(AUTH_STORAGE_KEYS.pendingFreeTrial);
        localStorage.setItem(AUTH_STORAGE_KEYS.pendingPlan, selectedPlan);
      }

      const intentHandled = await completePendingAuthIntent();
      if (intentHandled) {
        setLoading(false);
        isManualSignInRef.current = false;
        return;
      }

      // Redirect to dashboard after successful sign-in
      navigate('/dashboard');
    }

    setLoading(false);
    isManualSignInRef.current = false;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead titleKey="seo.authTitle" descriptionKey="seo.authDescription" canonicalPath="/auth" />
      <PublicNavbar />
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        {processingOAuth && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center" role="dialog" aria-modal="true">
            <Card className="w-full max-w-sm" tabIndex={-1} ref={(el) => el?.focus()}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{t('processingGoogleSignIn')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {signupSuccess ? (
          <Card className="w-full max-w-md bg-card border-white/10 shadow-glow-primary">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4 py-4">
                <img
                  src="/header_logo.png"
                  alt="Alphalens AI"
                  className="h-14 w-auto object-contain"
                />
              </div>
              <CardTitle className="text-xl">{t('emailConfirmation.title') || 'Check your email'}</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">{t('emailConfirmation.accountCreated') || 'Account created successfully!'}</span>
              </div>
              <p className="text-muted-foreground text-sm">
                {t('emailConfirmation.sentTo') || 'We sent a confirmation email to'}{' '}
                <strong className="text-foreground">{signupEmail}</strong>.
                {' '}{t('emailConfirmation.clickLink') || 'Please click the link in that email to activate your account.'}
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-primary">
                  {t('emailConfirmation.checkSpam') || 'Also check your spam folder if you can\'t find the email.'}
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: signupEmail,
                      options: {
                        emailRedirectTo: `https://alphalensai.com/confirm-success`
                      }
                    });
                    if (error) {
                      toast({ title: t('errors.authenticationError'), description: error.message, variant: 'destructive' });
                    } else {
                      toast({ title: t('emailConfirmation.resentTitle') || 'Email sent', description: t('emailConfirmation.resentDescription') || 'A new confirmation email has been sent.' });
                    }
                    setLoading(false);
                  }}
                >
                  {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  {t('emailConfirmation.resend') || 'Resend confirmation email'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setSignupSuccess(false);
                    setSignupEmail('');
                    setTabValue('signin');
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('backToLogin')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {t('emailConfirmation.pendingApproval') || 'Once your email is confirmed, your account will be submitted for approval by our team.'}
              </p>
            </CardContent>
          </Card>
        ) : (
        <Card className="w-full max-w-md bg-card border-white/10 shadow-glow-primary">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4 py-4">
              <img
                src="/header_logo.png"
                alt="Alphalens AI"
                className="h-14 w-auto object-contain"
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
                  <div className="flex items-center justify-between">
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
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('forgotPassword')}
                    </button>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('signIn')}
                  </Button>
                </form>

                {/* Forgot Password Inline Form */}
                {showForgotPassword && (
                  <div className="mt-4 p-4 border border-border rounded-lg space-y-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowForgotPassword(false); setForgotPasswordSent(false); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <h3 className="text-sm font-semibold">{t('resetPassword')}</h3>
                    </div>
                    {forgotPasswordSent ? (
                      <p className="text-sm text-muted-foreground">{t('checkEmail')}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email">{t('email')}</Label>
                          <Input
                            id="forgot-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          className="w-full"
                          disabled={forgotPasswordLoading || !email}
                          onClick={async () => {
                            setForgotPasswordLoading(true);
                            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                              redirectTo: `https://alphalensai.com/reset-password`,
                            });
                            setForgotPasswordLoading(false);
                            if (error) {
                              toast({
                                title: t('errors.authenticationError'),
                                description: error.message,
                                variant: 'destructive',
                              });
                            } else {
                              setForgotPasswordSent(true);
                            }
                          }}
                        >
                          {forgotPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('resetPassword')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="signup">
                {selectedPlan && (
                  <div className="mb-4 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-xs text-muted-foreground">Selected plan:</span>
                    <span className="text-sm font-semibold text-primary capitalize">{selectedPlan}</span>
                  </div>
                )}
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
                    <Label htmlFor="signup-fullname">{t('fullName') || 'Full Name'}</Label>
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
                      minLength={10}
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
                      minLength={10}
                      className={passwordMatchError ? 'border-destructive' : ''}
                    />
                    {passwordMatchError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
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
        )}
      </div>
    </div>
  );
}
