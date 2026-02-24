import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import SignalsEngineVisual from "@/components/homepage/SignalsEngineVisual";
import MacroDeskVisual from "@/components/homepage/MacroDeskVisual";
import ResearchLabVisual from "@/components/homepage/ResearchLabVisual";
import MultiAssetVisual from "@/components/features/MultiAssetVisual";
import RealtimeVisual from "@/components/features/RealtimeVisual";
import InstitutionalVisual from "@/components/features/InstitutionalVisual";

export default function Features() {
  const navigate = useNavigate();
  const { t } = useTranslation('features');

  const features = [
    {
      badge: "SIGNALS ENGINE",
      Visual: SignalsEngineVisual,
      title: t('main.aiTradeSetups.title'),
      description: t('main.aiTradeSetups.description'),
      details: [
        t('main.aiTradeSetups.detail1'),
        t('main.aiTradeSetups.detail2'),
        t('main.aiTradeSetups.detail3'),
        t('main.aiTradeSetups.detail4'),
      ],
      ctaText: t('main.aiTradeSetups.ctaText'),
      ctaRoute: "/dashboard"
    },
    {
      badge: "MACRO DESK",
      Visual: MacroDeskVisual,
      title: t('main.macroCommentary.title'),
      description: t('main.macroCommentary.description'),
      details: [
        t('main.macroCommentary.detail1'),
        t('main.macroCommentary.detail2'),
        t('main.macroCommentary.detail3'),
        t('main.macroCommentary.detail4'),
      ],
      ctaText: t('main.macroCommentary.ctaText'),
      ctaRoute: "/macro-analysis"
    },
    {
      badge: "RESEARCH LAB",
      Visual: ResearchLabVisual,
      title: t('main.researchReports.title'),
      description: t('main.researchReports.description'),
      details: [
        t('main.researchReports.detail1'),
        t('main.researchReports.detail2'),
        t('main.researchReports.detail3'),
        t('main.researchReports.detail4'),
      ],
      ctaText: t('main.researchReports.ctaText'),
      ctaRoute: "/reports"
    }
  ];

  const additionalFeatures = [
    {
      badge: "MULTI-ASSET",
      Visual: MultiAssetVisual,
      title: t('additional.multiAsset.title'),
      description: t('additional.multiAsset.description')
    },
    {
      badge: "REAL-TIME",
      Visual: RealtimeVisual,
      title: t('additional.realtime.title'),
      description: t('additional.realtime.description')
    },
    {
      badge: "INSTITUTIONAL",
      Visual: InstitutionalVisual,
      title: t('additional.institutional.title'),
      description: t('additional.institutional.description')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <section className="pt-10 pb-8 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-foreground mb-6">
            {t('hero.title')}
            <span className="text-primary"> {t('hero.titleHighlight')}</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('hero.description')}
          </p>
        </div>
      </section>

      <section className="py-8 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 justify-items-center">
            {features.map((feature) => (
              <Card key={feature.badge} className="p-0 border-border/60 hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full">
                <CardContent className="p-6 flex flex-col h-full gap-4">
                  {/* Badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium border border-border/80 rounded px-2 py-0.5">
                      {feature.badge}
                    </span>
                  </div>

                  {/* Mini visual */}
                  <div className="rounded-md bg-muted/5 border border-border/40 p-2">
                    <feature.Visual />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>

                  {/* Details */}
                  <ul className="space-y-1.5 flex-1">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start">
                        <span className="w-1 h-1 bg-accent/60 rounded-full mt-2 mr-2 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => navigate(feature.ctaRoute)}
                    className="mt-auto flex items-center gap-1.5 text-sm text-accent hover:underline underline-offset-4 cursor-pointer bg-transparent border-none p-0"
                  >
                    {feature.ctaText} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 px-4 bg-secondary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('additional.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('additional.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {additionalFeatures.map((feature) => (
              <Card key={feature.badge} className="p-0 border-border/60 hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-6 flex flex-col gap-4">
                  {/* Badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium border border-border/80 rounded px-2 py-0.5">
                      {feature.badge}
                    </span>
                  </div>

                  {/* Mini visual */}
                  <div className="rounded-md bg-muted/5 border border-border/40 p-2">
                    <feature.Visual />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">{t('cta.title')}</h2>
          <p className="text-base sm:text-lg md:text-xl mb-8 opacity-90">{t('cta.subtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3" onClick={() => navigate("/auth")}>
              {t('cta.startTrial')}
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" onClick={() => navigate("/contact")}>
              {t('cta.requestDemo')}
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
