import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const ResetPassword = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: t('errors.passwordTooShort'),
        description: t('errors.passwordTooShortDescription'),
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('errors.passwordMismatch'),
        description: t('errors.passwordMismatchDescription'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({
        title: t('errors.authenticationError'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSuccess(true);
      toast({
        title: t('resetPasswordSuccess'),
        description: t('resetPasswordSuccessDescription'),
      });
      // Sign out so user logs in with new password
      await supabase.auth.signOut();
      setTimeout(() => navigate('/auth'), 2000);
    }
  };

  return (
    <>
      <SEOHead
        titleKey="seo.resetPasswordTitle"
        descriptionKey="seo.resetPasswordDescription"
        canonicalPath="/reset-password"
      />
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md bg-card border-white/10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                {success ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <Lock className="h-8 w-8 text-primary" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">{t('resetPassword')}</CardTitle>
            <CardDescription>
              {success
                ? t('resetPasswordSuccessDescription')
                : t('resetPasswordNewDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('password')}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('resetPassword')}
                </Button>
              </form>
            ) : (
              <div className="text-center">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/auth')}
                >
                  {t('backToLogin')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default ResetPassword;
