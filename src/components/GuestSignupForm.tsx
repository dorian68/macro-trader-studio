import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GuestSignupFormProps {
  suggestedEmail?: string;
  onSuccess: () => void;
}

const GuestSignupForm = ({ suggestedEmail, onSuccess }: GuestSignupFormProps) => {
  const [email, setEmail] = useState(suggestedEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: string[] = [];
    
    if (!email || !email.includes('@')) {
      newErrors.push('Valid email address required');
    }
    
    if (!password || password.length < 6) {
      newErrors.push('Password must be at least 6 characters');
    }
    
    if (password !== confirmPassword) {
      newErrors.push('Passwords do not match');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      toast({
        title: "Account created successfully!",
        description: "Check your email to confirm your account.",
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrors([error.message || 'Error creating account']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Create your account
        </CardTitle>
        <CardDescription>
          Create an account to access your Alphalens AI subscription
        </CardDescription>
      </CardHeader>

      <CardContent>
        {suggestedEmail && (
          <Alert className="mb-4 border-green-200 bg-green-50/50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Use the email <strong>{suggestedEmail}</strong> to recover your paid subscription.
            </AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create my account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GuestSignupForm;