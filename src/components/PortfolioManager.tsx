import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, DollarSign } from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

interface PortfolioManagerProps {
  onPortfolioSelect?: (portfolio: Portfolio | null) => void;
  selectedPortfolio?: Portfolio | null;
}

export default function PortfolioManager({ onPortfolioSelect, selectedPortfolio }: PortfolioManagerProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({ name: '', description: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['dashboard', 'toasts']);

  useEffect(() => {
    if (user) {
      fetchPortfolios();
    }
  }, [user]);

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
        title: t('toasts:portfolio.error'),
        description: t('toasts:portfolio.failedToLoad'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async () => {
    if (!newPortfolio.name.trim()) {
      toast({
        title: t('toasts:portfolio.error'),
        description: t('toasts:portfolio.nameRequired'),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .insert([
          {
            user_id: user?.id,
            name: newPortfolio.name,
            description: newPortfolio.description,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setPortfolios([data, ...portfolios]);
      setNewPortfolio({ name: '', description: '' });
      setDialogOpen(false);
      
      toast({
        title: t('toasts:portfolio.success'),
        description: t('toasts:portfolio.created'),
      });
    } catch (error) {
      console.error('Error creating portfolio:', error);
      toast({
        title: t('toasts:portfolio.error'),
        description: t('toasts:portfolio.failedToCreate'),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('dashboard:portfolioManager.title')}</h2>
          <p className="text-muted-foreground">
            {t('dashboard:portfolioManager.subtitle')}
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:portfolioManager.createPortfolio')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dashboard:portfolioManager.createNew')}</DialogTitle>
              <DialogDescription>
                {t('dashboard:portfolioManager.createNewDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('dashboard:portfolioManager.portfolioName')}</label>
                <Input
                  value={newPortfolio.name}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                  placeholder={t('dashboard:portfolioManager.portfolioNamePlaceholder')}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('dashboard:portfolioManager.description')}</label>
                <Textarea
                  value={newPortfolio.description}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                  placeholder={t('dashboard:portfolioManager.descriptionPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('dashboard:portfolioManager.cancel')}
              </Button>
              <Button onClick={createPortfolio} disabled={creating}>
                {creating ? t('dashboard:portfolioManager.creating') : t('dashboard:portfolioManager.createButton')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('dashboard:portfolioManager.noPortfolios')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('dashboard:portfolioManager.noPortfoliosDescription')}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard:portfolioManager.createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <Card 
              key={portfolio.id} 
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedPortfolio?.id === portfolio.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onPortfolioSelect?.(portfolio)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {portfolio.name}
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  {portfolio.description || t('dashboard:portfolioManager.noDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('dashboard:portfolioManager.totalValue')}</span>
                    <span className="font-medium">
                      ${(portfolio.total_value || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t('dashboard:portfolioManager.created')}</span>
                    <span className="text-sm">
                      {new Date(portfolio.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}