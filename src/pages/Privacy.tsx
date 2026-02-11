import PublicNavbar from "@/components/PublicNavbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export default function Privacy() {
  const { t } = useTranslation('legal');
  
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-br from-background via-background to-secondary/10">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('privacy.title')}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {t('privacy.lastUpdated')}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.collection.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.collection.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.collection.item1')}</li>
                  <li>{t('privacy.collection.item2')}</li>
                  <li>{t('privacy.collection.item3')}</li>
                  <li>{t('privacy.collection.item4')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.legalBasis.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.legalBasis.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.legalBasis.item1')}</li>
                  <li>{t('privacy.legalBasis.item2')}</li>
                  <li>{t('privacy.legalBasis.item3')}</li>
                  <li>{t('privacy.legalBasis.item4')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.usage.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.usage.intro')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.usage.item1')}</li>
                  <li>{t('privacy.usage.item2')}</li>
                  <li>{t('privacy.usage.item3')}</li>
                  <li>{t('privacy.usage.item4')}</li>
                  <li>{t('privacy.usage.item5')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.security.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.security.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.security.item1')}</li>
                  <li>{t('privacy.security.item2')}</li>
                  <li>{t('privacy.security.item3')}</li>
                  <li>{t('privacy.security.item4')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.sharing.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.sharing.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.sharing.item1')}</li>
                  <li>{t('privacy.sharing.item2')}</li>
                  <li>{t('privacy.sharing.item3')}</li>
                  <li>{t('privacy.sharing.item4')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.transfers.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.transfers.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.transfers.item1')}</li>
                  <li>{t('privacy.transfers.item2')}</li>
                  <li>{t('privacy.transfers.item3')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.retention.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.retention.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.retention.item1')}</li>
                  <li>{t('privacy.retention.item2')}</li>
                  <li>{t('privacy.retention.item3')}</li>
                  <li>{t('privacy.retention.item4')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.profiling.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.profiling.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.aiTransparency.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.aiTransparency.description')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.aiTransparency.item1')}</li>
                  <li>{t('privacy.aiTransparency.item2')}</li>
                  <li>{t('privacy.aiTransparency.item3')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.rights.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.rights.intro')}</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>{t('privacy.rights.item1')}</li>
                  <li>{t('privacy.rights.item2')}</li>
                  <li>{t('privacy.rights.item3')}</li>
                  <li>{t('privacy.rights.item4')}</li>
                  <li>{t('privacy.rights.item5')}</li>
                  <li>{t('privacy.rights.item6')}</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.cookies.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.cookies.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.dpo.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.dpo.description')}</p>
                <p className="font-semibold text-foreground">
                  {t('privacy.dpo.email')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy.contact.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>{t('privacy.contact.description')}</p>
                <p className="font-semibold text-foreground">
                  {t('privacy.contact.email')}
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