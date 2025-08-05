import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Plus } from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  market_value: number;
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
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');
  const [portfolioPositions, setPortfolioPositions] = useState<Position[]>([]);
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

  const fetchPortfolioPositions = async (portfolioId: string) => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId);

      if (error) throw error;
      setPortfolioPositions(data || []);
    } catch (error) {
      console.error('Error fetching portfolio positions:', error);
      setPortfolioPositions([]);
    }
  };

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a portfolio name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .insert([
          {
            name: newPortfolioName,
            description: newPortfolioDescription,
            user_id: user?.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setPortfolios([data, ...portfolios]);
      setSelectedPortfolio(data.id);
      setShowCreateForm(false);
      setNewPortfolioName('');
      setNewPortfolioDescription('');
      
      toast({
        title: "Success",
        description: "Portfolio created successfully",
      });
    } catch (error) {
      console.error('Error creating portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to create portfolio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const handlePortfolioSelect = (portfolioId: string) => {
    setSelectedPortfolio(portfolioId);
    fetchPortfolioPositions(portfolioId);
  };

  const runAnalysis = async () => {
    if (!selectedPortfolio) {
      toast({
        title: "Select a Portfolio",
        description: "Please select a portfolio for analysis",
        variant: "destructive",
      });
      return;
    }

    setAnalysisLoading(true);
    try {
      const selectedPortfolioData = portfolios.find(p => p.id === selectedPortfolio);
      
      const analysisData = {
        type: "run_analysis",
        analysis: {
          content: analysisContent,
          type: analysisType,
          asset_symbol: assetSymbol,
          timestamp: new Date().toISOString()
        },
        portfolio: {
          id: selectedPortfolio,
          name: selectedPortfolioData?.name,
          description: selectedPortfolioData?.description,
          total_value: selectedPortfolioData?.total_value,
          positions: portfolioPositions
        }
      };

      const response = await fetch('https://hook.eu2.make.com/abcdef123456', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) throw new Error('Failed to run analysis');

      toast({
        title: "Success",
        description: "Analysis launched successfully",
      });
      
      setDialogOpen(false);
      setSelectedPortfolio('');
      setPortfolioPositions([]);
    } catch (error) {
      console.error('Error running analysis:', error);
      toast({
        title: "Error",
        description: "Failed to launch analysis",
        variant: "destructive",
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handleClick} className={className}>
        <TrendingUp className="h-4 w-4 mr-2" />
        Apply to Portfolio
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-background border shadow-lg z-[9999]">
          <DialogHeader>
            <DialogTitle>Analyze with Portfolio</DialogTitle>
            <DialogDescription>
              Select a portfolio to analyze this {analysisType}
              {assetSymbol && ` on ${assetSymbol}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {portfolios.length === 0 && !showCreateForm ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  You don't have any portfolios yet. Create one to start the analysis.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Portfolio
                </Button>
              </div>
            ) : (
              <>
                {!showCreateForm && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Select a Portfolio</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowCreateForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New
                      </Button>
                    </div>
                    <Select value={selectedPortfolio} onValueChange={handlePortfolioSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a portfolio" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-background border shadow-lg">
                        {portfolios.map((portfolio) => (
                          <SelectItem key={portfolio.id} value={portfolio.id}>
                            <div className="flex flex-col">
                              <span>{portfolio.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Value: {portfolio.total_value?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showCreateForm && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h4 className="font-medium">Create New Portfolio</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="portfolio-name">Portfolio Name</Label>
                        <Input
                          id="portfolio-name"
                          value={newPortfolioName}
                          onChange={(e) => setNewPortfolioName(e.target.value)}
                          placeholder="e.g., My Main Portfolio"
                        />
                      </div>
                      <div>
                        <Label htmlFor="portfolio-description">Description (optional)</Label>
                        <Input
                          id="portfolio-description"
                          value={newPortfolioDescription}
                          onChange={(e) => setNewPortfolioDescription(e.target.value)}
                          placeholder="e.g., Long-term growth portfolio"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={createPortfolio} disabled={loading}>
                          {loading ? "Creating..." : "Create"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPortfolio && portfolioPositions.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Portfolio Composition</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {portfolioPositions.map((position) => (
                        <div key={position.id} className="flex justify-between text-sm">
                          <span>{position.symbol}</span>
                          <span>{position.quantity} @ ${position.average_price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            {selectedPortfolio && (
              <Button onClick={runAnalysis} disabled={analysisLoading}>
                {analysisLoading ? "Running Analysis..." : "Run Analysis"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}