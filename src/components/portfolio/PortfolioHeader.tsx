import { ArrowLeft, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

interface PortfolioHeaderProps {
  portfolio: Portfolio | null;
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export default function PortfolioHeader({ portfolio, totalValue, totalPnL, totalPnLPercent }: PortfolioHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {portfolio ? (
        <div className="bg-card rounded-lg p-6 border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{portfolio.name}</h1>
              {portfolio.description && (
                <p className="text-muted-foreground mt-1">{portfolio.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Created on</p>
              <p className="text-sm">{new Date(portfolio.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Valuation</span>
              </div>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">P&L Total</span>
              </div>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalPnL.toLocaleString()}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Performance</span>
              </div>
              <p className={`text-2xl font-bold ${totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPnLPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-lg p-6 border">
          <h1 className="text-2xl font-bold mb-2">My Portfolios</h1>
          <p className="text-muted-foreground">
            Select a portfolio to view its details and manage it
          </p>
        </div>
      )}
    </div>
  );
}