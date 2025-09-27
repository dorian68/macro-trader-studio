import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GuestPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueGuest: () => void;
  planName: string;
  planPrice: string;
}

const GuestPaymentModal = ({ 
  isOpen, 
  onClose, 
  onContinueGuest, 
  planName, 
  planPrice 
}: GuestPaymentModalProps) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Secure your subscription
          </DialogTitle>
          <DialogDescription>
            You are about to subscribe to the <strong>{planName}</strong> plan ({planPrice}/month)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50/50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important:</strong> You are not signed in. To access your subscription immediately after payment, we recommend signing in first.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="bg-primary/5 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Recommended: Sign in first
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Immediate access after payment</li>
                <li>• Account automatically credited</li>
                <li>• Simplified subscription management</li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">
                Alternative: Guest payment
              </h4>
              <p className="text-sm text-muted-foreground">
                You will need to create an account with the <strong>same email</strong> used during payment to access your services.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={handleLogin} className="w-full">
              <User className="mr-2 h-4 w-4" />
              Sign In / Sign Up First
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onContinueGuest}
              className="w-full"
            >
              Continue as guest
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="w-full text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestPaymentModal;