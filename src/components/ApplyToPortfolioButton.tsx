import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp } from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

interface ApplyToPortfolioButtonProps {
  analysisContent: string;
  analysisType: 'macro' | 'asset' | 'report';
  assetSymbol?: string;
  className?: string;
}

export default function ApplyToPortfolioButton({ 
  analysisContent, 
  analysisType, 
  assetSymbol,
  className 
}: ApplyToPortfolioButtonProps) {
  const [loading, setLoading] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && dialogOpen) {
      fetchPortfolios();
    }
  }, [user, dialogOpen]);

  const fetchPortfolios = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolios(data || []);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      toast({
        title: "Error",
        description: "Failed to load portfolios",
        variant: "destructive",
      });
    }
  };

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to access personalized recommendations",
        variant: "destructive"
      });
      return;
    }
    
    setDialogOpen(true);
  };

  const handleApply = async () => {
    if (!selectedPortfolio) {
      toast({
        title: "Select Portfolio",
        description: "Please select a portfolio to add this recommendation",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ai_recommendations')
        .insert([
          {
            portfolio_id: selectedPortfolio,
            symbol: assetSymbol || 'GENERAL',
            recommendation_type: 'BUY',
            confidence_score: 0.8,
            reasoning: `${analysisType} analysis: ${analysisContent.substring(0, 500)}...`,
            is_applied: false,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Recommendation added to your portfolio`,
      });
      
      setDialogOpen(false);
      setSelectedPortfolio('');
    } catch (error) {
      console.error('Error adding recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to add recommendation to portfolio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handleClick} className={className}>
        <TrendingUp className="h-4 w-4 mr-2" />
        Apply to Portfolio
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Portfolio</DialogTitle>
            <DialogDescription>
              Add this {analysisType} analysis to one of your portfolios
              {assetSymbol && ` for ${assetSymbol}`}
            </DialogDescription>
          </DialogHeader>
          
          {portfolios.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                You don't have any portfolios yet. Create one first to add recommendations.
              </p>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Go to Portfolios
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Portfolio</label>
                <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            {portfolios.length > 0 && (
              <Button onClick={handleApply} disabled={loading || !selectedPortfolio}>
                {loading ? "Adding..." : "Add Recommendation"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}