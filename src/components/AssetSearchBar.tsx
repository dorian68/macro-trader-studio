import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Building, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
}

interface AssetSearchBarProps {
  onAssetSelect: (asset: AssetProfile) => void;
  selectedAsset?: AssetProfile | null;
  placeholder?: string;
  className?: string;
}

export function AssetSearchBar({ 
  onAssetSelect, 
  selectedAsset, 
  placeholder = "Rechercher un actif...",
  className 
}: AssetSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<AssetProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Recherche temps réel avec debouncing
  useEffect(() => {
    const searchAssets = async () => {
      if (searchTerm.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('asset_profiles')
          .select('id, symbol, name, sector, industry, country, market_cap, currency, exchange')
          .or(`symbol.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
          .order('market_cap', { ascending: false, nullsLast: true })
          .limit(8);

        if (error) throw error;
        setSuggestions(data || []);
      } catch (error) {
        console.error('Erreur de recherche:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchAssets, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fermer dropdown quand on clique dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAssetSelect = (asset: AssetProfile) => {
    onAssetSelect(asset);
    setSearchTerm("");
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleAssetSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

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

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(e.target.value.trim().length >= 2);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.trim().length >= 2 && setShowDropdown(true)}
          className="w-full pl-10 pr-4 py-3 bg-input/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth"
        />
      </div>

      {/* Dropdown avec suggestions */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-strong z-50 max-h-96 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Recherche en cours...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="p-2 space-y-1">
              {suggestions.map((asset, index) => (
                <button
                  key={asset.id}
                  onClick={() => handleAssetSelect(asset)}
                  className={cn(
                    "w-full p-3 text-left rounded-lg transition-smooth border",
                    selectedIndex === index
                      ? "bg-primary/20 border-primary/30"
                      : "hover:bg-primary/10 border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getCountryFlag(asset.country) && (
                          <span className="text-sm">{getCountryFlag(asset.country)}</span>
                        )}
                        <span className="font-semibold text-foreground">{asset.symbol}</span>
                        {asset.sector && (
                          <Badge variant="secondary" className="text-xs">
                            {asset.sector}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {asset.name || 'Nom non disponible'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                    <div className="text-right shrink-0">
                      {asset.market_cap && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          {formatMarketCap(asset.market_cap)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.trim().length >= 2 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun actif trouvé pour "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}