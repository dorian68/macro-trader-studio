import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import SignalsEngineVisual from "@/components/homepage/SignalsEngineVisual";
import MacroDeskVisual from "@/components/homepage/MacroDeskVisual";
import ResearchLabVisual from "@/components/homepage/ResearchLabVisual";
import { useTranslation } from "react-i18next";
import PublicNavbar from "@/components/PublicNavbar";
import { SEOHead } from "@/components/SEOHead";
import { Footer } from "@/components/Footer";
import { RelatedPages } from "@/components/RelatedPages";
import { organizationSchema, webSiteSchema, siteNavigationSchema } from "@/seo/structuredData";
import { useAuth } from "@/hooks/useAuth";
import { useCreditManager } from "@/hooks/useCreditManager";

export default function Homepage() {
  const { t } = useTranslation(['common', 'toasts']);
  const { user } = useAuth();
  const { trialUsed } = useCreditManager();
  return <div className="min-h-screen bg-background">
    <SEOHead
      titleKey="seo.homeTitle"
      descriptionKey="seo.homeDescription"
      canonicalPath="/"
      jsonLd={[organizationSchema, webSiteSchema, siteNavigationSchema]}
    />
    <PublicNavbar />

    {/* Hero Section */}
    <section className="relative min-h-screen flex flex-col">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat md:bg-fixed"
        style={{ backgroundImage: "url('/images/hero-bg.webp')" }}
      />
      {/* Overlay 1: Dark gradient from top for navbar readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />
      {/* Overlay 2: Subtle overall tint */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Overlay 3: Very subtle orange accent at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-accent/5 via-transparent to-transparent" />
      {/* Overlay 4: Dark gradient from bottom for seamless blend into site background */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

      {/* Content pushed to lower half */}
      <div className="relative z-10 flex-1 flex flex-col justify-center pb-10 sm:pb-14 md:pb-16 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="flex flex-col items-center mb-0">
            <div className="flex items-center gap-4">
              <img
                src="/alphalens_logo_new.png"
                alt="alphaLens.ai – AI-powered trading intelligence platform"
                className="h-56 sm:h-52 md:h-64 w-auto object-contain"
                fetchPriority="high"
              />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-[2.5rem] lg:text-5xl font-bold text-white mb-4 leading-tight -mt-10 sm:-mt-10 md:-mt-14">
            {t('hero.title')}
            <span className="text-white/90"> {t('hero.subtitle')}</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/70 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('hero.description')}
          </p>
          <div className="inline-flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth?intent=free_trial">
              <Button size="lg" className="text-lg px-8 py-3 bg-primary text-white hover:bg-accent hover:text-white hover:border-accent transition-colors duration-300">
                {t('hero.tryDemo')} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3 border-white/30 text-white hover:bg-accent hover:text-white hover:border-accent transition-colors duration-300">
                {t('hero.getStarted')}
              </Button>
            </Link>
          </div>
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
                <Link
                  to={card.route}
                  className="mt-auto flex items-center gap-1.5 text-sm text-accent hover:underline underline-offset-4 cursor-pointer"
                >
                  Open module <ArrowRight className="h-3.5 w-3.5" />
                </Link>
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
          <Link to="/contact">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              {t('cta.requestDemo')}
            </Button>
          </Link>
          <Link to="/auth?intent=free_trial">
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              {t('cta.startFreeTrial')}
            </Button>
          </Link>
        </div>
      </div>
    </section>

    <RelatedPages links={[
      { label: "Features", path: "/features" },
      { label: "Pricing", path: "/pricing" },
      { label: "Blog", path: "/blog" },
      { label: "Help Center", path: "/help" },
      { label: "About", path: "/about" },
    ]} />
    <Footer />
  </div>;
}