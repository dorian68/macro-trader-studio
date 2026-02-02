import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import PublicNavbar from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";

export default function About() {
  const { t } = useTranslation('about');

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <div className="max-w-4xl mx-auto space-y-6 px-4 py-6">
        <div className="text-center space-y-4">
          <img src="/alphalens_logo_new.png" alt="alphaLens.ai" className="h-48 sm:h-64 w-auto mx-auto object-contain" />
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="gradient-card border-primary/20 shadow-glow-primary flex flex-col h-full">
            <CardHeader className="text-center pb-4">
              <img src="/lovable-uploads/optiquant-logo.png" alt="OptiQuant IA" className="h-14 w-auto mx-auto mb-4" />
              <CardTitle className="text-xl text-foreground">{t('optiquant.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              <p className="text-muted-foreground">{t('optiquant.description1')}</p>
              <p className="text-muted-foreground">{t('optiquant.description2')}</p>
              <Button variant="outline" className="w-full mt-auto" onClick={() => window.open('https://www.optiquant-ia.com/', '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('optiquant.visitButton')}
              </Button>
            </CardContent>
          </Card>

          <Card className="gradient-card border-primary/20 shadow-glow-primary flex flex-col h-full">
            <CardHeader className="text-center pb-4">
              <img src="/lovable-uploads/abcg-research-logo.png" alt="ABCG Research" className="h-14 w-auto mx-auto mb-4" />
              <CardTitle className="text-xl text-foreground">{t('abcg.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
              <p className="text-muted-foreground">{t('abcg.description1')}</p>
              <p className="text-muted-foreground">{t('abcg.description2')}</p>
              <Button variant="outline" className="w-full mt-auto" onClick={() => window.open('https://research.albaricg.com/', '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('abcg.visitButton')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="gradient-card border-primary/20 shadow-glow-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">{t('collaboration.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">{t('collaboration.description1')}</p>
            <p className="text-muted-foreground leading-relaxed">{t('collaboration.description2')}</p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-foreground mb-2">{t('collaboration.missionTitle')}</h3>
              <p className="text-muted-foreground">{t('collaboration.missionDescription')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
