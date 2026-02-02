import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BarChart3, Brain, FileText, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/useAuth";
import { useCreditManager } from "@/hooks/useCreditManager";
import { useToast } from "@/hooks/use-toast";

export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activateFreeTrial } = useCreditManager();
  const { toast } = useToast();
  const { t } = useTranslation(['common', 'toasts']);

  const handleFreeTrialClick = async () => {
    if (!user) {
      // Not logged in - redirect to auth with intent
      navigate('/auth?intent=free_trial');
    } else {
      // Already logged in - activate free trial directly
      const { error } = await activateFreeTrial();
      if (!error) {
        toast({
          title: t('toasts:freeTrial.started'),
          description: t('toasts:freeTrial.startedDescription'),
        });
        navigate('/payment-success?type=free_trial');
      }
    }
  };
  return <div className="min-h-screen bg-background">
    <SEOHead titleKey="seo.homeTitle" descriptionKey="seo.homeDescription" />
    <PublicNavbar />

    {/* Hero Section */}
    <section className="relative pt-0 pb-24 px-4 text-center bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col items-center mb-0">
          <div className="flex items-center gap-4">
            <img
              src="/alphalens_logo_new.png"
              alt="alphaLens.ai logo"
              className="h-72 w-auto object-contain"
            />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 leading-tight -mt-16">
          {t('hero.title')}
          <span className="text-primary"> {t('hero.subtitle')}</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-6 max-w-3xl mx-auto leading-relaxed">
          {t('hero.description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="text-lg px-8 py-3 bg-primary text-white hover:bg-accent hover:text-white hover:border-accent transition-colors duration-300" onClick={handleFreeTrialClick}>
            {t('hero.tryDemo')} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-3 border-primary text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors duration-300" onClick={() => navigate("/auth")}>
            {t('hero.getStarted')}
          </Button>
        </div>
      </div>
    </section>

    {/* Product Features */}
    <section className="py-10 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            {t('hero.tradingIntelligence')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('hero.tradingIntelligenceDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 justify-items-center">
          <Card className="p-6 hover:shadow-lg transition-shadow border-border">
            <CardContent className="text-center p-0">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">{t('features.aiTradeSetups.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('features.aiTradeSetups.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow border-border">
            <CardContent className="text-center p-0">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">{t('features.macroCommentary.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('features.macroCommentary.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow border-border">
            <CardContent className="text-center p-0">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground">{t('features.researchReports.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('features.researchReports.description')}
              </p>
            </CardContent>
          </Card>


        </div>
      </div>
    </section>

    {/* Call to Action */}
    <section className="py-12 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-4xl font-bold mb-6">
          {t('cta.title')}
        </h2>
        <p className="text-xl mb-8 opacity-90">
          {t('cta.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" className="text-lg px-8 py-3" onClick={() => navigate("/contact")}>
            {t('cta.requestDemo')}
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8 py-3 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" onClick={handleFreeTrialClick}>
            {t('cta.startFreeTrial')}
          </Button>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="bg-background border-t border-border py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src="/footer_logo.png" alt="alphaLens.ai" className="h-10 w-auto" />
            </div>
            <p className="text-muted-foreground text-sm">
              {t('footer.description')}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.product')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/features")} className="hover:text-foreground transition-colors">Features</button></li>
              <li><button onClick={() => navigate("/pricing")} className="hover:text-foreground transition-colors">Pricing</button></li>
              <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">API</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.company')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors">About</button></li>
              <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Contact</button></li>
              <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Privacy</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.support')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Documentation</button></li>
              <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Help Center</button></li>
              <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Terms of Service</button></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  </div>;
}