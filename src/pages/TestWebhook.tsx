import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCreditManager } from '@/hooks/useCreditManager';
import Layout from '@/components/Layout';
import { SEOHead } from '@/components/SEOHead';

export default function TestWebhook() {
  const { user } = useAuth();
  const { credits, fetchCredits } = useCreditManager();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sessionId, setSessionId] = useState('');

  const refreshCredits = async () => {
    setLoading(true);
    try {
      await fetchCredits();
      setResult({
        success: true,
        message: 'Credits refreshed successfully!'
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to refresh credits'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <SEOHead titleKey="seo.defaultTitle" descriptionKey="seo.defaultDescription" noIndex />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Webhook & Credits Test Page</h1>

        {/* Current Credits Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Credits Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plan Type</Label>
                <p className="text-lg font-semibold">{credits?.plan_type || 'Loading...'}</p>
              </div>
              <div>
                <Label>User ID</Label>
                <p className="text-sm font-mono">{user?.id || 'Not logged in'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label>Queries</Label>
                <p className="text-2xl font-bold text-primary">
                  {credits?.credits_queries_remaining ?? '...'}
                </p>
              </div>
              <div>
                <Label>Ideas</Label>
                <p className="text-2xl font-bold text-primary">
                  {credits?.credits_ideas_remaining ?? '...'}
                </p>
              </div>
              <div>
                <Label>Reports</Label>
                <p className="text-2xl font-bold text-primary">
                  {credits?.credits_reports_remaining ?? '...'}
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={refreshCredits} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  'Refresh Credits Status'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Checkout Link */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Stripe Payment Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Instructions:</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Go to the Pricing page</li>
                  <li>Click "Upgrade" on any plan</li>
                  <li>Complete the Stripe checkout (use test card: 4242 4242 4242 4242)</li>
                  <li>After payment, copy the session_id from the URL</li>
                  <li>Paste it here to check if webhook was triggered</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="sessionId">Stripe Session ID</Label>
              <Input
                id="sessionId"
                placeholder="cs_test_..."
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <Button 
              onClick={() => window.open('/pricing', '_blank')}
              variant="outline"
              className="w-full"
            >
              Open Pricing Page
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Configuration Check */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Webhook Configuration Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Stripe Webhook Endpoint Added</p>
                  <p className="text-sm text-muted-foreground">
                    URL: https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/stripe-webhook
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Events: checkout.session.completed, customer.subscription.updated, 
                    invoice.payment_succeeded, customer.subscription.deleted
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">STRIPE_WEBHOOK_SECRET Added</p>
                  <p className="text-sm text-muted-foreground">
                    Secret must be added in Supabase Settings → Functions → Secrets
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Edge Function Deployed</p>
                  <p className="text-sm text-muted-foreground">
                    The stripe-webhook function should be deployed and accessible
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={() => window.open('https://supabase.com/dashboard/project/jqrlegdulnnrpiixiecf/functions/stripe-webhook/logs', '_blank')}
                variant="secondary"
                className="w-full"
              >
                Open Webhook Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Display */}
        {result && (
          <Alert className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
              {result.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Layout>
  );
}
