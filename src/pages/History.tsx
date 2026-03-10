import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { AIInteractionHistory } from "@/components/AIInteractionHistory";
import { useResultNotifications } from "@/hooks/useResultNotifications";
import { useTranslation } from "react-i18next";
import { SEOHead } from '@/components/SEOHead';

export default function History() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { markResultsAsSeen } = useResultNotifications();

  // Mark results as seen when visiting history page
  React.useEffect(() => {
    markResultsAsSeen();
  }, [markResultsAsSeen]);

  return (
    <Layout activeModule="history" onModuleChange={() => {}}>
      <SEOHead titleKey="seo.historyTitle" descriptionKey="seo.historyDescription" noIndex />
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="shrink-0 min-h-[44px] w-11"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
              {t('dashboard:history.title')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground break-words">
              {t('dashboard:history.subtitle')}
            </p>
          </div>
        </div>

        {/* AI Interaction History */}
        <AIInteractionHistory />
      </div>
    </Layout>
  );
}