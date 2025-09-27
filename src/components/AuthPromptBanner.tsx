import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AuthPromptBannerProps {
  onDismiss?: () => void;
}

const AuthPromptBanner = ({ onDismiss }: AuthPromptBannerProps) => {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5 mb-8">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Sign in first for immediate access
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              By signing in before payment, your subscription will be automatically activated on your account.
            </p>
            
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                <span>Immediate access after payment</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                <span>No account creation wait</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-primary" />
                <span>Guaranteed secure account</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90"
              >
                Sign In / Sign Up
              </Button>
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Continue without account
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AuthPromptBanner;