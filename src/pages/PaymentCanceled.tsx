import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, CreditCard, HelpCircle } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';

const PaymentCanceled = () => {
  const navigate = useNavigate();

  return (
    <>
      <PublicNavbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            {/* Canceled Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Payment Canceled
              </h1>
              <p className="text-lg text-muted-foreground">
                Your payment was canceled and no charges were made.
              </p>
            </div>

            {/* What Happened Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  What Happened?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You canceled the payment process before completing your subscription. 
                  No charges have been made to your payment method, and you can try again at any time.
                </p>
              </CardContent>
            </Card>

            {/* Try Again Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Ready to Try Again?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Your subscription is just a few clicks away. Choose the plan that's right for you 
                  and start accessing AI-powered trading insights.
                </p>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Why Choose Alphalens AI?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Professional AI-powered market analysis</li>
                    <li>• Real-time trading recommendations</li>
                    <li>• Comprehensive research reports</li>
                    <li>• Expert macro commentary</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="flex-1"
                onClick={() => navigate('/pricing')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                View Pricing Plans
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>

            {/* Support Section */}
            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground mb-4">
                Need help with your payment or have questions about our plans?
              </p>
              <Button variant="link" onClick={() => navigate('/contact')}>
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentCanceled;