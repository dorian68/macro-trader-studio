import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReactivationRequest {
  id: string;
  user_id: string;
  email: string;
  broker_name: string | null;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export function ReactivationRequestsManagement() {
  const [requests, setRequests] = useState<ReactivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReactivationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchRequests();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('reactivation-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactivation_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('reactivation_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as ReactivationRequest[]);
    } catch (error) {
      console.error('[ReactivationRequests] Error fetching:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reactivation requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: ReactivationRequest) => {
    if (!confirm(t('admin.reactivations.approve_confirm'))) return;

    setProcessing(request.id);
    try {
      const { data, error } = await supabase.functions.invoke('approve-reactivation', {
        body: {
          request_id: request.id,
          action: 'approve',
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reactivation request approved successfully',
      });

      fetchRequests();
    } catch (error) {
      console.error('[ReactivationRequests] Approve error:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (request: ReactivationRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(selectedRequest.id);
    try {
      const { data, error } = await supabase.functions.invoke('approve-reactivation', {
        body: {
          request_id: selectedRequest.id,
          action: 'reject',
          rejection_reason: rejectionReason,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reactivation request rejected',
      });

      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      console.error('[ReactivationRequests] Reject error:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">{t('admin.reactivations.pending')}</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">{t('admin.reactivations.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('admin.reactivations.rejected')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{t('admin.reactivations.title')}</h2>
        <p className="text-muted-foreground">
          Manage user reactivation requests
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('admin.reactivations.no_requests')}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.email}</TableCell>
                <TableCell>{request.broker_name || 'N/A'}</TableCell>
                <TableCell>
                  {new Date(request.requested_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(request)}
                        disabled={processing === request.id}
                      >
                        {processing === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('admin.reactivations.approve')}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectClick(request)}
                        disabled={processing === request.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('admin.reactivations.reject')}
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.reactivations.reject')}</DialogTitle>
            <DialogDescription>
              {t('admin.reactivations.reject_confirm')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                {t('admin.reactivations.rejection_reason')}
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a detailed reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || processing !== null}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
