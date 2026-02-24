import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SignalsEngineVisual from "@/components/homepage/SignalsEngineVisual";
import MacroDeskVisual from "@/components/homepage/MacroDeskVisual";
import ResearchLabVisual from "@/components/homepage/ResearchLabVisual";
import { useTranslation } from "react-i18next";
import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/useAuth";
import { useCreditManager } from "@/hooks/useCreditManager";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/Footer";

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
              className="h-40 sm:h-56 md:h-72 w-auto object-contain"
            />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-primary mb-4 leading-tight -mt-8 sm:-mt-12 md:-mt-16">
          {t('hero.title')}
          <span className="text-primary"> {t('hero.subtitle')}</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 max-w-3xl mx-auto leading-relaxed">
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
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('hero.tradingIntelligence')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('hero.tradingIntelligenceDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 justify-items-center">
          {[
            { badge: "SIGNALS ENGINE", title: "AI Trade Setups", desc: "Regime-aware setups with entry, TP/SL, and sizing across FX & crypto.", route: "/dashboard", Visual: SignalsEngineVisual },
            { badge: "MACRO DESK", title: "Macro Commentary", desc: "Event-driven commentary with market impact mapping and actionable bias.", route: "/macro-analysis", Visual: MacroDeskVisual },
            { badge: "RESEARCH LAB", title: "Research Reports", desc: "Institutional-style reports combining quant outputs and macro context.", route: "/reports", Visual: ResearchLabVisual },
          ].map((card) => (
            <Card key={card.badge} className="p-0 border-border/60 hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full">
              <CardContent className="p-6 flex flex-col h-full gap-4">
                {/* Badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium border border-border/80 rounded px-2 py-0.5">
                    {card.badge}
                  </span>
                </div>

                {/* Mini visual */}
                <div className="rounded-md bg-muted/5 border border-border/40 p-2">
                  <card.Visual />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{card.desc}</p>

                {/* CTA */}
                <button
                  onClick={() => navigate(card.route)}
                  className="mt-auto flex items-center gap-1.5 text-sm text-accent hover:underline underline-offset-4 cursor-pointer bg-transparent border-none p-0"
                >
                  Open module <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}

        </div>
      </div>
    </section>

    {/* Call to Action */}
    <section className="py-12 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
          {t('cta.title')}
        </h2>
        <p className="text-base sm:text-lg md:text-xl mb-8 opacity-90">
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
    <Footer />
  </div>;
}