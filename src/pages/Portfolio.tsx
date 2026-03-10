import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import PortfolioManager from '@/components/PortfolioManager';
import PortfolioHeader from '@/components/portfolio/PortfolioHeader';
import PositionsList from '@/components/portfolio/PositionsList';
import RecommendationsList from '@/components/portfolio/RecommendationsList';
import { useTranslation } from 'react-i18next';
import { SEOHead } from '@/components/SEOHead';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

export default function Portfolio() {
  const { t } = useTranslation('common');
  const { user, loading } = useAuth();
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercent, setTotalPnLPercent] = useState(0);

  const handleValuationChange = (value: number, pnl: number, pnlPercent: number) => {
    setTotalValue(value);
    setTotalPnL(pnl);
    setTotalPnLPercent(pnlPercent);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('actions.loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <SEOHead titleKey="seo.portfolioTitle" descriptionKey="seo.portfolioDescription" noIndex />
      <div className="container mx-auto py-8 px-4">
        <PortfolioHeader 
          portfolio={selectedPortfolio}
          totalValue={totalValue}
          totalPnL={totalPnL}
          totalPnLPercent={totalPnLPercent}
        />

        {selectedPortfolio ? (
          <div className="space-y-6">
            <PositionsList 
              portfolioId={selectedPortfolio.id}
              onValuationChange={handleValuationChange}
            />
            <RecommendationsList portfolioId={selectedPortfolio.id} />
          </div>
        ) : (
          <PortfolioManager 
            onPortfolioSelect={setSelectedPortfolio}
            selectedPortfolio={selectedPortfolio}
          />
        )}
      </div>
    </Layout>
  );
}