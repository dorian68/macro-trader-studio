import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import PortfolioManager from '@/components/PortfolioManager';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function Portfolio() {
  const { user, loading } = useAuth();
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
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
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Portfolios</h1>
          <p className="text-muted-foreground mt-2">
            Manage your investments and receive personalized recommendations
          </p>
        </div>

        <PortfolioManager 
          onPortfolioSelect={setSelectedPortfolio}
          selectedPortfolio={selectedPortfolio}
        />
      </div>
    </Layout>
  );
}