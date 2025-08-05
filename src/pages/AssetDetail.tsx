import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  ExternalLink, 
  Building, 
  Globe, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Percent,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetProfile {
  id: number;
  symbol: string;
  name: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  exchange: string | null;
  currency: string | null;
  website: string | null;
  inception_date: string | null;
  market_cap: number | null;
  enterprise_value: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  dividend_rate: number | null;
  dividend_yield: number | null;
  beta: number | null;
  book_value: number | null;
  price_to_book: number | null;
  revenue: number | null;
  revenue_per_share: number | null;
  gross_margins: number | null;
  operating_margins: number | null;
  net_income: number | null;
  eps: number | null;
  forward_eps: number | null;
  debt_to_equity: number | null;
  return_on_equity: number | null;
  return_on_assets: number | null;
  free_cash_flow: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
}

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [asset, setAsset] = useState<AssetProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssetProfile = async () => {
      if (!symbol) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('asset_profiles')
          .select('*')
          .eq('symbol', symbol)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Actif non trouvé",
            description: `Aucune information trouvée pour ${symbol}`,
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setAsset(data);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'actif:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les informations de l'actif",
          variant: "destructive"
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchAssetProfile();
  }, [symbol, navigate, toast]);

  const formatNumber = (value: number | null, decimals: number = 2) => {
    if (value === null) return 'Non disponible';
    return value.toLocaleString('fr-FR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const formatCurrency = (value: number | null, currency?: string | null) => {
    if (value === null) return 'Non disponible';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'USD',
      notation: value >= 1e9 ? 'compact' : 'standard',
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null) return 'Non disponible';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (loading) {
    return (
      <Layout activeModule="trading" onModuleChange={() => {}}>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!asset) return null;

  return (
    <Layout activeModule="trading" onModuleChange={() => {}}>
      <div className="space-y-6">
        {/* En-tête avec navigation */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {getCountryFlag(asset.country) && (
              <span className="text-2xl">{getCountryFlag(asset.country)}</span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground truncate">
                {asset.name || asset.symbol}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{asset.symbol}</Badge>
                {asset.sector && (
                  <Badge variant="outline">{asset.sector}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profil détaillé */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Profil de l'entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {asset.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {asset.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Secteur</h5>
                      <p className="text-foreground">{asset.sector || 'Non disponible'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Industrie</h5>
                      <p className="text-foreground">{asset.industry || 'Non disponible'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Pays</h5>
                      <p className="text-foreground">{asset.country || 'Non disponible'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Marché</h5>
                      <p className="text-foreground">{asset.exchange || 'Non disponible'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Devise</h5>
                      <p className="text-foreground">{asset.currency || 'Non disponible'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground">Date de création</h5>
                      <p className="text-foreground">{formatDate(asset.inception_date)}</p>
                    </div>
                  </div>
                </div>

                {asset.website && (
                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => window.open(asset.website!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visiter le site officiel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations de contact */}
            {(asset.address || asset.city || asset.phone) && (
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Informations de contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {asset.address && (
                      <p className="text-foreground">{asset.address}</p>
                    )}
                    {(asset.city || asset.state || asset.zip) && (
                      <p className="text-foreground">
                        {[asset.city, asset.state, asset.zip].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {asset.phone && (
                      <p className="text-foreground">{asset.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Colonne latérale - Indicateurs financiers */}
          <div className="space-y-6">
            {/* Valorisation */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Valorisation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatCurrency(asset.market_cap, asset.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Enterprise Value</span>
                    <span className="font-medium">{formatCurrency(asset.enterprise_value, asset.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">P/E Ratio</span>
                    <span className="font-medium">{formatNumber(asset.trailing_pe)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Forward P/E</span>
                    <span className="font-medium">{formatNumber(asset.forward_pe)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Price to Book</span>
                    <span className="font-medium">{formatNumber(asset.price_to_book)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dividendes */}
            {(asset.dividend_rate || asset.dividend_yield) && (
              <Card className="gradient-card border-success/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Percent className="h-5 w-5 text-success" />
                    Dividendes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {asset.dividend_rate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Taux</span>
                      <span className="font-medium text-success">
                        {formatCurrency(asset.dividend_rate, asset.currency)}
                      </span>
                    </div>
                  )}
                  {asset.dividend_yield && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Rendement</span>
                      <span className="font-medium text-success">
                        {formatPercentage(asset.dividend_yield)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Performance */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {asset.beta && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Beta</span>
                      <span className={cn(
                        "font-medium",
                        asset.beta > 1 ? "text-danger" : "text-success"
                      )}>
                        {formatNumber(asset.beta)}
                      </span>
                    </div>
                  )}
                  {asset.return_on_equity && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">ROE</span>
                      <span className="font-medium">
                        {formatPercentage(asset.return_on_equity)}
                      </span>
                    </div>
                  )}
                  {asset.return_on_assets && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">ROA</span>
                      <span className="font-medium">
                        {formatPercentage(asset.return_on_assets)}
                      </span>
                    </div>
                  )}
                  {asset.debt_to_equity && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Debt/Equity</span>
                      <span className={cn(
                        "font-medium",
                        asset.debt_to_equity > 1 ? "text-warning" : "text-success"
                      )}>
                        {formatNumber(asset.debt_to_equity)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Résultats financiers */}
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Résultats financiers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Chiffre d'affaires</span>
                    <span className="font-medium">{formatCurrency(asset.revenue, asset.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Résultat net</span>
                    <span className="font-medium">{formatCurrency(asset.net_income, asset.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">EPS</span>
                    <span className="font-medium">{formatNumber(asset.eps)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Forward EPS</span>
                    <span className="font-medium">{formatNumber(asset.forward_eps)}</span>
                  </div>
                  <Separator />
                  {asset.gross_margins && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Marge brute</span>
                      <span className="font-medium">{formatPercentage(asset.gross_margins)}</span>
                    </div>
                  )}
                  {asset.operating_margins && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Marge opérationnelle</span>
                      <span className="font-medium">{formatPercentage(asset.operating_margins)}</span>
                    </div>
                  )}
                  {asset.free_cash_flow && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Free Cash Flow</span>
                      <span className="font-medium">{formatCurrency(asset.free_cash_flow, asset.currency)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}