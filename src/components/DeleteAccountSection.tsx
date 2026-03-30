import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';

const { useState } = React;

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmText !== 'DELETE' || isProcessing) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-own-account', {
        body: { confirmation: 'DELETE' }
      });

      if (error) throw error;

      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });

      // Sign out and redirect
      await signOut();
      navigate('/auth');
    } catch (error: any) {
      console.error('[DeleteAccount] Error:', error);
      toast({
        title: 'Deletion failed',
        description: 'Unable to delete your account. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setOpen(false);
      setConfirmText('');
    }
  };

  return (
    <div className="border border-destructive/30 rounded-lg p-4 mt-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1">
          <h3 className="text-sm font-semibold text-destructive">Delete Account</h3>
          <p className="text-xs text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(''); }}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete My Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account. You will lose access to all your data, 
                  trade setups, reports, and credits. This action cannot be reversed.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <p className="text-sm text-muted-foreground">
                  Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  autoComplete="off"
                />
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => { setOpen(false); setConfirmText(''); }}
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE' || isProcessing}
                  className="w-full sm:w-auto"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete My Account'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
