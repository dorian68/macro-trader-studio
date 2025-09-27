import React, { useEffect, useState } from 'react';
import { Check, User, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';
import AuthPromptBanner from '@/components/AuthPromptBanner';
import GuestPaymentModal from '@/components/GuestPaymentModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
interface PlanData {
  name: string;
  price: string;
  description: string;
  features: string[];
  usage: string[];
  highlight: boolean;
}

const Pricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [b2cPlans, setB2cPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showAuthBanner, setShowAuthBanner] = useState(true);
  const [guestPaymentModal, setGuestPaymentModal] = useState<{
    isOpen: boolean;
    plan: string;
    planName: string;
    planPrice: string;
  }>({
    isOpen: false,
    plan: '',
    planName: '',
    planPrice: ''
  });

  useEffect(() => {
    console.log('📊 [Pricing] Alphalens pricing page initialized');
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    try {
      const { data, error } = await supabase
        .from('plan_parameters')
        .select('*')
        .in('plan_type', ['basic', 'standard', 'premium'])
        .order('monthly_price_usd');

      if (error) {
        console.error('Error fetching plan data:', error);
        // Fallback to static data if fetch fails
        setB2cPlans(getStaticPlans());
        return;
      }

      if (data && data.length > 0) {
        const dynamicPlans = data.map((plan) => ({
          name: plan.plan_type.charAt(0).toUpperCase() + plan.plan_type.slice(1),
          price: plan.monthly_price_usd > 0 ? `$${plan.monthly_price_usd}` : 'Unavailable',
          description: getPlanDescription(plan.plan_type),
          features: ['Market Commentary', 'AI Trade Setup', 'Research Reports'],
          usage: getPlanUsage(plan),
          highlight: plan.plan_type === 'premium'
        }));
        setB2cPlans(dynamicPlans);
      } else {
        setB2cPlans(getStaticPlans());
      }
    } catch (err) {
      console.error('Error fetching plan data:', err);
      setB2cPlans(getStaticPlans());
    } finally {
      setLoading(false);
    }
  };

  const getStaticPlans = (): PlanData[] => [{
    name: 'Basic',
    price: '$25',
    description: 'Perfect for individual traders getting started',
    features: ['Market Commentary', 'AI Trade Setup', 'Research Reports'],
    usage: ['70 queries per month', '20 investment ideas per month', '4 reports per month'],
    highlight: false
  }, {
    name: 'Standard',
    price: '$35',
    description: 'Ideal for active traders and investors',
    features: ['Market Commentary', 'AI Trade Setup', 'Research Reports'],
    usage: ['120 queries per month', '35 investment ideas per month', '8 reports per month'],
    highlight: false
  }, {
    name: 'Premium',
    price: '$49',
    description: 'Complete solution for professional traders',
    features: ['Market Commentary', 'AI Trade Setup', 'Research Reports'],
    usage: ['Unlimited queries', '50 investment ideas per month', '16 reports per month'],
    highlight: true
  }];

  const getPlanDescription = (planType: string): string => {
    const descriptions = {
      basic: 'Perfect for individual traders getting started',
      standard: 'Ideal for active traders and investors',
      premium: 'Complete solution for professional traders'
    };
    return descriptions[planType as keyof typeof descriptions] || 'Professional trading solution';
  };

  const getPlanUsage = (plan: any): string[] => {
    const usage = [];
    if (plan.max_queries === 0) {
      usage.push('Unlimited queries');
    } else {
      usage.push(`${plan.max_queries} queries per month`);
    }
    usage.push(`${plan.max_ideas} investment ideas per month`);
    usage.push(`${plan.max_reports} reports per month`);
    return usage;
  };

  const handleCTAClick = async (plan: string) => {
    console.log(`📊 [Pricing] CTA clicked: ${plan}`);
    
    if (plan === 'B2B Contact Sales') {
      navigate('/contact');
      return;
    }

    // Handle individual plan checkout
    const planType = plan.toLowerCase();
    
    if (!['basic', 'standard', 'premium'].includes(planType)) {
      toast({
        title: "Invalid Plan",
        description: "Please select a valid plan.",
        variant: "destructive"
      });
      return;
    }

    // If user is not authenticated, show guest payment modal
    if (!user) {
      const selectedPlan = b2cPlans.find(p => p.name.toLowerCase() === planType);
      setGuestPaymentModal({
        isOpen: true,
        plan: planType,
        planName: selectedPlan?.name || plan,
        planPrice: selectedPlan?.price || '$--'
      });
      return;
    }

    // User is authenticated, proceed with normal checkout
    await proceedWithCheckout(planType);
  };

  const proceedWithCheckout = async (planType: string) => {
    setCheckoutLoading(planType);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan: planType,
          success_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/payment-canceled`
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        toast({
          title: "Payment Error",
          description: error.message || "Failed to create checkout session. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err) {
      console.error('Failed to create checkout session:', err);
      toast({
        title: "Payment Error", 
        description: "Unable to process payment. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleGuestContinue = () => {
    setGuestPaymentModal(prev => ({ ...prev, isOpen: false }));
    proceedWithCheckout(guestPaymentModal.plan);
  };
  
  const isCheckoutLoading = (planName: string) => {
    return checkoutLoading === planName.toLowerCase();
  };
  return <>
      <PublicNavbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Alphalens AI Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose the perfect plan for your trading and investment needs. 
              Professional AI-powered market analysis for every level.
            </p>
          </div>

          {/* Auth Prompt Banner for unauthenticated users */}
          {!user && showAuthBanner && (
            <AuthPromptBanner onDismiss={() => setShowAuthBanner(false)} />
          )}

          {/* B2B Model Section */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                B2B Partnership Model
              </h2>
              <p className="text-lg text-muted-foreground">
                Designed for brokers and financial institutions
              </p>
            </div>
            
            <Card className="max-w-4xl mx-auto border-primary/20">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Enterprise Partnership</CardTitle>
                <CardDescription className="text-lg mt-2">
                  Complete Alphalens integration for your client base
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 bg-gradient-to-br from-background via-muted/5 to-background">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20 backdrop-blur-sm">
                    <h4 className="font-semibold text-xl mb-4 text-foreground flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      Partnership Benefits
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>White-label integration</span>
                      </li>
                      <li className="flex items-center gap-3 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>Revenue share model</span>
                      </li>
                      <li className="flex items-center gap-3 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>Dedicated support</span>
                      </li>
                      <li className="flex items-center gap-3 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>Custom branding</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-gradient-to-br from-accent/10 via-accent/5 to-transparent rounded-xl p-6 border border-accent/20 backdrop-blur-sm">
                    <h4 className="font-semibold text-xl mb-4 text-foreground flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent"></div>
                      Revenue Model
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      Earn direct revenue from your clients who subscribe to Alphalens paid plans through our profit-sharing partnership.
                    </p>
                    <div className="mt-4 pt-4 border-t border-accent/20">
                      <p className="text-sm font-medium text-foreground">
                        Immediate value creation for your clients
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-6">
                    Entry-level access to showcase Alphalens' value to all broker clients. 
                    Direct revenue from traders who subscribe to paid plans.
                  </p>
                  <Button size="lg" className="w-full md:w-auto" onClick={() => handleCTAClick('B2B Contact Sales')}>
                    Contact Sales
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* B2C Plans Section */}
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-foreground mb-4">
                Individual Plans
              </h2>
              <p className="text-lg text-muted-foreground">
                Professional AI analysis for individual traders and investors
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-muted-foreground">Loading plans...</div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {b2cPlans.map(plan => (
                  <div key={plan.name} className="relative">
                    {plan.highlight && (
                      <Badge 
                        variant="default" 
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs whitespace-nowrap z-20 shadow-lg" 
                        aria-label="Most Complete"
                      >
                        Most Complete
                      </Badge>
                    )}
                    <Card className={`${plan.highlight ? 'border-primary shadow-lg scale-105' : 'border-border'}`}>
                  <CardHeader className={`text-center ${plan.highlight ? 'pb-6 pt-2' : 'pb-6'}`}>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <CardDescription className="mt-2">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Features</h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => <li key={index} className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>)}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Usage Limits</h4>
                      <ul className="space-y-2">
                        {plan.usage.map((usage, index) => <li key={index} className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm">{usage}</span>
                          </li>)}
                      </ul>
                    </div>
                    
                     <div className="space-y-3 mt-6">
                       {!user && (
                         <Button 
                           variant="secondary"
                           className="w-full"
                           onClick={() => navigate('/auth')}
                         >
                           <LogIn className="mr-2 h-4 w-4" />
                           Se connecter d'abord (recommandé)
                         </Button>
                       )}
                       
                       <Button 
                         className="w-full" 
                         variant={plan.highlight ? "default" : "outline"} 
                         onClick={() => handleCTAClick(plan.name)}
                         disabled={isCheckoutLoading(plan.name) || plan.price === 'Unavailable'}
                       >
                         {isCheckoutLoading(plan.name) ? "Processing..." : user ? "Get Started" : "Payer en tant qu'invité"}
                       </Button>
                     </div>
                   </CardContent>
                 </Card>
                   </div>
                 ))}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center mt-16 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground">
              All plans include access to our comprehensive market analysis platform. 
              Upgrade or downgrade your plan at any time to match your trading activity.
            </p>
          </div>
        </div>
      </div>

      {/* Guest Payment Modal */}
      <GuestPaymentModal
        isOpen={guestPaymentModal.isOpen}
        onClose={() => setGuestPaymentModal(prev => ({ ...prev, isOpen: false }))}
        onContinueGuest={handleGuestContinue}
        planName={guestPaymentModal.planName}
        planPrice={guestPaymentModal.planPrice}
      />

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/lovable-uploads/Only_text_white_BG_FINAL.png" alt="alphaLens.ai" className="h-[1.95rem]" />
              </div>
              <p className="text-muted-foreground text-sm">
                Professional financial research and trading intelligence powered by artificial intelligence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/features")} className="hover:text-foreground transition-colors">Features</button></li>
                <li><button onClick={() => navigate("/pricing")} className="hover:text-foreground transition-colors">Pricing</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">API</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors">About</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Contact</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Privacy</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Documentation</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Help Center</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground text-sm">
            <p>© 2025 alphaLens.ai. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>;
};
export default Pricing;