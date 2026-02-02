import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, BarChart3, FileText, Globe2, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicNavbar from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";

export default function Features() {
  const navigate = useNavigate();
  const { t } = useTranslation('features');

  const features = [
    {
      icon: Brain,
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
      icon: BarChart3,
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
      icon: FileText,
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
      icon: Globe2,
      title: t('additional.multiAsset.title'),
      description: t('additional.multiAsset.description')
    },
    {
      icon: Zap,
      title: t('additional.realtime.title'),
      description: t('additional.realtime.description')
    },
    {
      icon: Shield,
      title: t('additional.institutional.title'),
      description: t('additional.institutional.description')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <section className="pt-10 pb-8 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 justify-items-center">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-border bg-card flex flex-col h-full">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <p className="text-muted-foreground">{feature.description}</p>
                  <ul className="space-y-2 flex-1">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start">
                        <span className="w-1 h-1 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full mt-auto" onClick={() => navigate(feature.ctaRoute)}>
                    {feature.ctaText}
                  </Button>
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
            {additionalFeatures.map((feature, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow border-border">
                <CardContent className="p-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">{t('cta.title')}</h2>
          <p className="text-xl mb-8 opacity-90">{t('cta.subtitle')}</p>
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
