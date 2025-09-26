import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '@/components/PublicNavbar';
const Pricing = () => {
  const navigate = useNavigate();
  useEffect(() => {
    console.log('📊 [Pricing] Alphalens pricing page initialized');
  }, []);
  const handleCTAClick = (plan: string) => {
    console.log(`📊 [Pricing] CTA clicked: ${plan}`);
    // TODO: Implement actual subscription logic
  };
  const b2cPlans = [{
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

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {b2cPlans.map(plan => <Card key={plan.name} className={`relative ${plan.highlight ? 'border-primary shadow-lg scale-105' : 'border-border'}`}>
                  {plan.highlight && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge variant="default" className="px-4 py-1">
                        Most Complete
                      </Badge>
                    </div>}
                  
                  <CardHeader className="text-center pb-6">
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
                    
                    <Button className="w-full mt-6" variant={plan.highlight ? "default" : "outline"} onClick={() => handleCTAClick(plan.name)}>
                      Get Started
                    </Button>
                  </CardContent>
                </Card>)}
            </div>
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