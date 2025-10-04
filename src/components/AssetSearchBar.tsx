import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Building, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Hardcoded list of target assets - same as HybridSearchBar
const TARGET_ASSETS = [
  // G10 Forex (principales paires)
  { symbol: "EUR/USD", name: "Euro / US Dollar", icon: "💱", sector: "Forex", exchange: "FX" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", icon: "💱", sector: "Forex", exchange: "FX" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", icon: "💱", sector: "Forex", exchange: "FX" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", icon: "💱", sector: "Forex", exchange: "FX" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", icon: "💱", sector: "Forex", exchange: "FX" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", icon: "💱", sector: "Forex", exchange: "FX" },
  
  // Crypto majeures
  { symbol: "Bitcoin", name: "Bitcoin", icon: "₿", sector: "Cryptocurrency", exchange: "CRYPTO" },
  { symbol: "Ethereum", name: "Ethereum", icon: "Ξ", sector: "Cryptocurrency", exchange: "CRYPTO" },
  { symbol: "ADA-USD", name: "Cardano", icon: "🔷", sector: "Cryptocurrency", exchange: "CRYPTO" },
  { symbol: "SOL-USD", name: "Solana", icon: "🌞", sector: "Cryptocurrency", exchange: "CRYPTO" },
  { symbol: "DOGE-USD", name: "Dogecoin", icon: "🐕", sector: "Cryptocurrency", exchange: "CRYPTO" },
  
  // Commodités principales
  { symbol: "GOLD", name: "Gold", icon: "🥇", sector: "Commodity", exchange: "COMEX" },
  { symbol: "SILVER", name: "Silver", icon: "🥈", sector: "Commodity", exchange: "COMEX" },
  { symbol: "CRUDE", name: "Crude Oil", icon: "🛢️", sector: "Commodity", exchange: "NYMEX" },
  { symbol: "NATGAS", name: "Natural Gas", icon: "🔥", sector: "Commodity", exchange: "NYMEX" },
  { symbol: "COPPER", name: "Copper", icon: "🟤", sector: "Commodity", exchange: "COMEX" },
  { symbol: "PLATINUM", name: "Platinum", icon: "⚪", sector: "Commodity", exchange: "NYMEX" }
];

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
  placeholder = "Search for an asset...",
  className 
}: AssetSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<AssetProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Display selected asset or search term
  const displayValue = isSearchMode ? searchTerm : (selectedAsset?.symbol || "");

  // Filter from hardcoded list instead of Supabase
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // Filter TARGET_ASSETS based on search term
    const filtered = TARGET_ASSETS
      .filter(asset => 
        asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((asset, index) => ({
        id: index,
        symbol: asset.symbol,
        name: asset.name,
        sector: asset.sector,
        industry: null,
        country: null,
        market_cap: null,
        currency: null,
        exchange: asset.exchange
      }));

    setSuggestions(filtered);
    setIsLoading(false);
  }, [searchTerm]);

  // Close dropdown when clicking outside
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
    setIsSearchMode(false);
  };

  const handleClearSelection = () => {
    onAssetSelect({
      id: 0,
      symbol: "",
      name: null,
      sector: null,
      industry: null,
      country: null,
      market_cap: null,
      currency: null,
      exchange: null
    });
    setSearchTerm("");
    setIsSearchMode(true);
    inputRef.current?.focus();
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
        
        {/* Input avec affichage de la sélection */}
        <input
          ref={inputRef}
          type="text"
          placeholder={selectedAsset?.symbol ? "" : placeholder}
          value={displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(e.target.value.trim().length >= 2);
            setSelectedIndex(-1);
            setIsSearchMode(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (selectedAsset?.symbol && !isSearchMode) {
              setIsSearchMode(true);
              setSearchTerm("");
            } else if (searchTerm.trim().length >= 2) {
              setShowDropdown(true);
            }
          }}
          className={cn(
            "w-full pl-10 py-3 bg-input/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth",
            selectedAsset?.symbol && !isSearchMode ? "pr-24" : "pr-4"
          )}
        />

        {/* Badge de sélection visible */}
        {selectedAsset?.symbol && !isSearchMode && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <Badge variant="default" className="font-semibold">
              {selectedAsset.symbol}
            </Badge>
            <button
              onClick={handleClearSelection}
              className="h-5 w-5 rounded-full bg-muted hover:bg-destructive/20 flex items-center justify-center transition-colors"
              type="button"
            >
              <span className="text-xs">✕</span>
            </button>
          </div>
        )}
      </div>

      {/* Dropdown avec suggestions */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-strong z-50 max-h-96 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
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
                        {asset.name || 'Name not available'}
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
              No assets found for "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}