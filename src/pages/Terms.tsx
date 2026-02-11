import PublicNavbar from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function Terms() {
  const { t } = useTranslation('legal');
  
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('terms.title')}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {t('terms.lastUpdated')}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>{t('terms.acceptance.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.acceptance.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.service.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.service.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('terms.service.feature1')}</li>
                  <li>{t('terms.service.feature2')}</li>
                  <li>{t('terms.service.feature3')}</li>
                  <li>{t('terms.service.feature4')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.responsibilities.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.responsibilities.intro')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('terms.responsibilities.item1')}</li>
                  <li>{t('terms.responsibilities.item2')}</li>
                  <li>{t('terms.responsibilities.item3')}</li>
                  <li>{t('terms.responsibilities.item4')}</li>
                  <li>{t('terms.responsibilities.item5')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.disclaimer.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p className="font-semibold text-foreground">
                  {t('terms.disclaimer.warning')}
                </p>
                <p>{t('terms.disclaimer.description')}</p>
                <p>{t('terms.disclaimer.advice')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.ai.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.ai.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('terms.ai.item1')}</li>
                  <li>{t('terms.ai.item2')}</li>
                  <li>{t('terms.ai.item3')}</li>
                  <li>{t('terms.ai.item4')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.subscription.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('terms.subscription.item1')}</li>
                  <li>{t('terms.subscription.item2')}</li>
                  <li>{t('terms.subscription.item3')}</li>
                  <li>{t('terms.subscription.item4')}</li>
                  <li>{t('terms.subscription.item5')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.intellectual.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.intellectual.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.liability.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.liability.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.dataRetention.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.dataRetention.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('terms.dataRetention.item1')}</li>
                  <li>{t('terms.dataRetention.item2')}</li>
                  <li>{t('terms.dataRetention.item3')}</li>
                  <li>{t('terms.dataRetention.item4')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.age.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.age.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.availability.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.availability.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.governing.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.governing.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.changes.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.changes.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('terms.contact.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('terms.contact.description')}</p>
                <p className="font-semibold text-foreground">
                  {t('terms.contact.email')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}