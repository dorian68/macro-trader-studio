import React, { useEffect, useState } from 'react';
import { Check, User, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Footer } from '@/components/Footer';
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
  const { t } = useTranslation('pricing');
  const [b2cPlans, setB2cPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  useEffect(() => {
    console.log('📊 [Pricing] Alphalens pricing page initialized');
    fetchPlanData();
  }, []);
  const fetchPlanData = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('plan_parameters').select('*').in('plan_type', ['basic', 'standard', 'premium']).order('monthly_price_usd');
      if (error) {
        console.error('Error fetching plan data:', error);
        // Fallback to static data if fetch fails
        setB2cPlans(getStaticPlans());
        return;
      }
      if (data && data.length > 0) {
        const dynamicPlans = data.map(plan => ({
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
    usage: ['200 queries per month', '50 investment ideas per month', '16 reports per month'],
    highlight: true
  }];
  const getPlanDescription = (planType: string): string => {
    return t(`b2c.plans.${planType}.description`, 'Professional trading solution');
  };
  const getPlanUsage = (plan: any): string[] => {
    return [
      `${plan.max_queries} ${t('b2c.queriesPerMonth')}`,
      `${plan.max_ideas} ${t('b2c.ideasPerMonth')}`,
      `${plan.max_reports} ${t('b2c.reportsPerMonth')}`
    ];
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
        title: t('errors.invalidPlan'),
        description: t('errors.invalidPlanDescription'),
        variant: "destructive"
      });
      return;
    }

    // If user is not authenticated, redirect to auth with selected plan
    if (!user) {
      navigate(`/auth?plan=${planType}`);
      return;
    }

    // User is authenticated, proceed with checkout
    await proceedWithCheckout(planType);
  };
  const proceedWithCheckout = async (planType: string) => {
    setCheckoutLoading(planType);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: planType,
          success_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/payment-canceled`
        }
      });
      if (error) {
        console.error('Checkout error:', error);
        toast({
          title: t('errors.paymentError'),
          description: error.message || t('errors.checkoutFailed'),
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
        title: t('errors.paymentError'),
        description: t('errors.checkoutError'),
        variant: "destructive"
      });
    } finally {
      setCheckoutLoading(null);
    }
  };
  const isCheckoutLoading = (planName: string) => {
    return checkoutLoading === planName.toLowerCase();
  };
  return <>
    <PublicNavbar />
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* B2C Plans Section */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {t('b2c.title')}
            </h2>
            <p className="text-base text-muted-foreground">
              {t('b2c.subtitle')}
            </p>
          </div>

          {loading ? <div className="flex justify-center py-8">
            <div className="text-muted-foreground">{t('b2c.loading')}</div>
          </div> : <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {b2cPlans.map(plan => <div key={plan.name} className="relative flex">
              {plan.highlight && <Badge variant="default" className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs whitespace-nowrap z-20 shadow-lg" aria-label={t('b2c.mostComplete')}>
                {t('b2c.mostComplete')}
              </Badge>}
              <Card className={`${plan.highlight ? 'border-primary shadow-lg scale-105' : 'border-border'} flex flex-col h-full w-full`}>
                <CardHeader className={`text-center ${plan.highlight ? 'pb-4 pt-2' : 'pb-4'}`}>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">{plan.price === 'Unavailable' ? t('b2c.unavailable') : plan.price}</span>
                    {plan.price !== 'Unavailable' && <span className="text-muted-foreground text-sm">{t('b2c.perMonth')}</span>}
                  </div>
                  <CardDescription className="mt-1 text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">{t('b2c.features')}</h4>
                    <ul className="space-y-1">
                      {plan.features.map((feature, index) => <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-xs">{feature}</span>
                      </li>)}
                    </ul>
                  </div>

                  <div className="flex-1">
                    <h4 className="font-semibold mb-2 text-sm">{t('b2c.usageLimits')}</h4>
                    <ul className="space-y-1">
                      {plan.usage.map((usage, index) => <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-xs">{usage}</span>
                      </li>)}
                    </ul>
                  </div>

                  <div className="space-y-2 mt-auto">
                    <Button
                      className="w-full h-9 text-sm"
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => handleCTAClick(plan.name)}
                      disabled={isCheckoutLoading(plan.name) || plan.price === 'Unavailable'}
                    >
                      {isCheckoutLoading(plan.name) ? t('b2c.processing') : user ? t('b2c.getStarted') : <><LogIn className="mr-2 h-4 w-4" />{t('b2c.signInToPurchase')}</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>)}
          </div>}
        </div>

        {/* B2B Model Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              {t('b2b.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('b2b.subtitle')}
            </p>
          </div>

          <Card className="max-w-4xl mx-auto border-primary/20">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl">{t('b2b.cardTitle')}</CardTitle>
              <CardDescription className="text-lg mt-2">
                {t('b2b.cardDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 bg-gradient-to-br from-background via-muted/5 to-background">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20 backdrop-blur-sm">
                  <h4 className="font-semibold text-xl mb-4 text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    {t('b2b.benefits.title')}
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{t('b2b.benefits.whiteLabel')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{t('b2b.benefits.revenueShare')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{t('b2b.benefits.support')}</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{t('b2b.benefits.branding')}</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-accent/10 via-accent/5 to-transparent rounded-xl p-6 border border-accent/20 backdrop-blur-sm">
                  <h4 className="font-semibold text-xl mb-4 text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    {t('b2b.revenueModel.title')}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {t('b2b.revenueModel.description')}
                  </p>
                  <div className="mt-4 pt-4 border-t border-accent/20">
                    <p className="text-sm font-medium text-foreground">
                      {t('b2b.revenueModel.valueCreation')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-6">
                  {t('b2b.footer')}
                </p>
                <Button size="lg" className="w-full md:w-auto" onClick={() => handleCTAClick('B2B Contact Sales')}>
                  {t('b2b.contactSales')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Footer Note */}
        <div className="text-center mt-16 max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground">
            {t('footer')}
          </p>
        </div>
      </div>
    </div>

    <Footer />
  </>;
};
export default Pricing;