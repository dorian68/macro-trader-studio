import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, DollarSign, Building, Globe, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetProfile {
  id: number;
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  market_cap: number | null;
  currency: string | null;
  exchange: string | null;
  website: string | null;
  trailing_pe: number | null;
  dividend_yield: number | null;
  beta: number | null;
}

interface AssetSummaryBannerProps {
  asset: AssetProfile;
  onViewComplete: () => void;
  className?: string;
}

export function AssetSummaryBanner({ asset, onViewComplete, className }: AssetSummaryBannerProps) {
  const formatMarketCap = (value: number | null) => {
    if (!value) return null;
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    return `${(value / 1e3).toFixed(1)}K`;
  };

  const getCountryFlag = (countryCode: string | null) => {
    if (!countryCode) return null;
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const formatNumber = (value: number | null, decimals: number = 2) => {
    if (value === null) return null;
    return value.toFixed(decimals);
  };

  return (
    <Card className={cn(
      "gradient-card border-primary/20 shadow-glow-primary sticky top-16 sm:top-4 z-40",
      className
    )}>
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Informations principales */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {getCountryFlag(asset.country) && (
                <span className="text-lg">{getCountryFlag(asset.country)}</span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">
                  {asset.name || asset.symbol}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-sm">
                    {asset.symbol}
                  </Badge>
                  {asset.sector && (
                    <Badge variant="outline" className="text-sm">
                      {asset.sector}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Market Details */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {asset.exchange && (
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {asset.exchange}
                </div>
              )}
              {asset.currency && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {asset.currency}
                </div>
              )}
            </div>
          </div>

          {/* Indicateurs clés */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full lg:w-auto">
            {asset.market_cap && (
              <div className="text-center lg:text-right">
                <div className="flex items-center justify-center lg:justify-end gap-1 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                  Market Cap
                </div>
                <div className="text-lg font-bold text-foreground">
                  {formatMarketCap(asset.market_cap)}
                </div>
              </div>
            )}

            {asset.trailing_pe && (
              <div className="text-center lg:text-right">
                <div className="text-xs text-muted-foreground mb-1">P/E Ratio</div>
                <div className="text-lg font-bold text-foreground">
                  {formatNumber(asset.trailing_pe)}
                </div>
              </div>
            )}

            {asset.dividend_yield && (
              <div className="text-center lg:text-right">
                <div className="text-xs text-muted-foreground mb-1">Dividend</div>
                <div className="text-lg font-bold text-success">
                  {formatNumber(asset.dividend_yield, 1)}%
                </div>
              </div>
            )}

            {asset.beta && (
              <div className="text-center lg:text-right">
                <div className="text-xs text-muted-foreground mb-1">Beta</div>
                <div className={cn(
                  "text-lg font-bold",
                  asset.beta > 1 ? "text-danger" : "text-success"
                )}>
                  {formatNumber(asset.beta)}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto lg:w-auto justify-end">
            {asset.website && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(asset.website!, '_blank')}
                className="touch-manipulation"
                style={{ minHeight: '44px' }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Site</span>
              </Button>
            )}
            <Button
              onClick={onViewComplete}
              className="bg-primary hover:bg-primary-dark touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <Eye className="h-4 w-4 mr-1" />
              Complete Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}