import PublicNavbar from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Code, Zap, BarChart3, TrendingUp, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Documentation() {
  const { t } = useTranslation('documentation');
  
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <Tabs defaultValue="getting-started" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
              <TabsTrigger value="getting-started">{t('tabs.gettingStarted')}</TabsTrigger>
              <TabsTrigger value="features">{t('tabs.features')}</TabsTrigger>
              <TabsTrigger value="ai-setup">{t('tabs.aiSetup')}</TabsTrigger>
              <TabsTrigger value="portfolio">{t('tabs.portfolio')}</TabsTrigger>
              <TabsTrigger value="api">{t('tabs.api')}</TabsTrigger>
              <TabsTrigger value="faq">{t('tabs.faq')}</TabsTrigger>
            </TabsList>

            {/* Getting Started */}
            <TabsContent value="getting-started" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Book className="w-6 h-6 text-primary" />
                    <CardTitle>{t('gettingStarted.quickStart.title')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('gettingStarted.quickStart.step1')}</h3>
                    <p>{t('gettingStarted.quickStart.step1Description')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('gettingStarted.quickStart.step2')}</h3>
                    <p>{t('gettingStarted.quickStart.step2Description')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('gettingStarted.quickStart.step3')}</h3>
                    <p>{t('gettingStarted.quickStart.step3Description')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('gettingStarted.quickStart.step4')}</h3>
                    <p>{t('gettingStarted.quickStart.step4Description')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('gettingStarted.credits.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    {t('gettingStarted.credits.description')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>{t('gettingStarted.credits.tradeSetup')}</strong></li>
                    <li><strong>{t('gettingStarted.credits.macroCommentary')}</strong></li>
                    <li><strong>{t('gettingStarted.credits.reports')}</strong></li>
                  </ul>
                  <p className="mt-4">
                    {t('gettingStarted.credits.resetInfo')}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features */}
            <TabsContent value="features" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-primary" />
                    <CardTitle>{t('features.aiSetup.title')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    {t('features.aiSetup.description')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>{t('features.aiSetup.feature1')}</li>
                    <li>{t('features.aiSetup.feature2')}</li>
                    <li>{t('features.aiSetup.feature3')}</li>
                    <li>{t('features.aiSetup.feature4')}</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <CardTitle>{t('features.macroCommentary.title')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    {t('features.macroCommentary.description')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>{t('features.macroCommentary.feature1')}</li>
                    <li>{t('features.macroCommentary.feature2')}</li>
                    <li>{t('features.macroCommentary.feature3')}</li>
                    <li>{t('features.macroCommentary.feature4')}</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-primary" />
                    <CardTitle>{t('features.reports.title')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    {t('features.reports.description')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>{t('features.reports.feature1')}</li>
                    <li>{t('features.reports.feature2')}</li>
                    <li>{t('features.reports.feature3')}</li>
                    <li>{t('features.reports.feature4')}</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Setup */}
            <TabsContent value="ai-setup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('aiSetup.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('aiSetup.step1')}</h3>
                    <p>{t('aiSetup.step1Description')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('aiSetup.step2')}</h3>
                    <p>{t('aiSetup.step2Description')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('aiSetup.step3')}</h3>
                    <p>{t('aiSetup.step3Description')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('aiSetup.step4')}</h3>
                    <p>{t('aiSetup.step4Description')}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Portfolio */}
            <TabsContent value="portfolio" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('portfolio.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    {t('portfolio.description')}
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>{t('portfolio.feature1')}</li>
                    <li>{t('portfolio.feature2')}</li>
                    <li>{t('portfolio.feature3')}</li>
                    <li>{t('portfolio.feature4')}</li>
                    <li>{t('portfolio.feature5')}</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API */}
            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Code className="w-6 h-6 text-primary" />
                    <CardTitle>{t('api.title')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    {t('api.description')}
                  </p>
                  <p>
                    {t('api.contact')}{" "}
                    <span className="font-semibold text-foreground">research@albaricg.com</span>
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ */}
            <TabsContent value="faq" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('faq.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('faq.question1')}</h3>
                    <p>
                      {t('faq.answer1')}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('faq.question2')}</h3>
                    <p>
                      {t('faq.answer2')}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('faq.question3')}</h3>
                    <p>
                      {t('faq.answer3')}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{t('faq.question4')}</h3>
                    <p>
                      {t('faq.answer4')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground text-sm">
          <p>{t('footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
