import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, Globe, Building, DollarSign, TrendingUp, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AssetInfo {
  id: number;
  symbol: string;
  name: string | null;
  asset_type: string | null;
  description: string | null;
  currency: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  inception_date: string | null;
  website: string | null;
  country: string | null;
}

interface AssetInfoCardProps {
  symbol: string;
  className?: string;
}

const AssetInfoCard: React.FC<AssetInfoCardProps> = ({ symbol, className }) => {
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssetInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('instruments')
          .select('*')
          .eq('symbol', symbol)
          .maybeSingle();

        if (supabaseError) {
          throw supabaseError;
        }

        if (!data) {
          setError("Asset not found");
          return;
        }

        setAssetInfo(data);
      } catch (err) {
        setError("Error loading data");
        console.error('Error fetching asset info:', err);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchAssetInfo();
    }
  }, [symbol]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    // Convertir le code pays en emoji drapeau
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (loading) {
    return (
      <Card className={`animate-pulse ${className || ''}`}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !assetInfo) {
    return null;
  }

  return (
    <Card className={`overflow-hidden ${className || ''}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getCountryFlag(assetInfo.country) && (
                <span className="text-xl">{getCountryFlag(assetInfo.country)}</span>
              )}
              <h3 className="text-xl font-bold truncate">
                {assetInfo.name || assetInfo.symbol}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {assetInfo.symbol}
              </Badge>
              {assetInfo.asset_type && (
                <Badge variant="outline" className="text-xs">
                  {assetInfo.asset_type}
                </Badge>
              )}
            </div>
          </div>
          {assetInfo.website && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 touch-manipulation"
              onClick={() => window.open(assetInfo.website!, '_blank')}
              style={{ minHeight: '44px' }}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Visit</span>
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {assetInfo.description && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
            <p className="text-sm leading-relaxed">{assetInfo.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="text-sm font-medium">{assetInfo.currency || "Not available"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Market</p>
                <p className="text-sm font-medium">{assetInfo.exchange || "Not available"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date de création</p>
                <p className="text-sm font-medium">{formatDate(assetInfo.inception_date)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {assetInfo.sector && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Secteur</p>
                  <p className="text-sm font-medium">{assetInfo.sector}</p>
                </div>
              </div>
            )}

            {assetInfo.industry && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Industrie</p>
                  <p className="text-sm font-medium">{assetInfo.industry}</p>
                </div>
              </div>
            )}

            {assetInfo.country && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Pays</p>
                  <p className="text-sm font-medium">{assetInfo.country}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetInfoCard;