import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, Wallet, Info } from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface PortfolioManagerProps {
  onPortfolioSelect?: (portfolio: Portfolio) => void;
  selectedPortfolio?: Portfolio | null;
}

export default function PortfolioManager({ onPortfolioSelect, selectedPortfolio }: PortfolioManagerProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      toast({
        title: "Database Migration Required",
        description: "Please run the database migration to enable portfolio management features."
      });
    }
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio Management
          </CardTitle>
          <CardDescription>
            Portfolio management will be available after running the database migration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-4">
              <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Migration Required</h3>
            <p className="text-muted-foreground mb-4">
              Run the database migration to create the necessary tables for portfolio management.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Features coming soon:
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground text-left">
                <li>• Create and manage multiple portfolios</li>
                <li>• Track positions and performance</li>
                <li>• AI-powered recommendations</li>
                <li>• Risk analysis and allocation</li>
                <li>• Real-time portfolio valuation</li>
              </ul>
            </div>
            <Button variant="outline" disabled>
              Waiting for migration...
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}