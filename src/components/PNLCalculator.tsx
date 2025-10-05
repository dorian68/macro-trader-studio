import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calculator, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { getInstrumentPrice, getInstrumentType, getAllInstruments } from '@/services/marketDataService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PNLCalculatorProps {
  defaultInstrument?: string;
  prefilledEntry?: number;
  prefilledStopLoss?: number;
  prefilledTargets?: number[];
  showInstrumentPicker?: boolean;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

export default function PNLCalculator({
  defaultInstrument = 'EUR/USD',
  prefilledEntry,
  prefilledStopLoss,
  prefilledTargets = [],
  showInstrumentPicker = true,
  isCollapsible = false,
  defaultExpanded = true
}: PNLCalculatorProps) {
  const { toast } = useToast();
  const [instrument, setInstrument] = useState(defaultInstrument);
  const [positionSize, setPositionSize] = useState(1); // lots
  const [leverage, setLeverage] = useState(100);
  const [priceChange, setPriceChange] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [quoteToUSD, setQuoteToUSD] = useState(1);

  const instrumentType = getInstrumentType(instrument);
  const isFX = instrumentType === 'fx';

  useEffect(() => {
    fetchPrice();
  }, [instrument]);

  useEffect(() => {
    fetchQuoteConversion();
  }, [instrument, instrumentType]);

  const fetchPrice = async () => {
    setLoading(true);
    try {
      const price = await getInstrumentPrice(instrument);
      setCurrentPrice(price);
    } catch (error) {
      toast({
        title: "Price Fetch Error",
        description: error instanceof Error ? error.message : "Could not fetch price",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuoteConversion = async () => {
    if (!isFX) { setQuoteToUSD(1); return; }
    const quote = instrument.split('/')[1] || 'USD';
    if (quote === 'USD') { setQuoteToUSD(1); return; }
    try {
      try {
        const p1 = await getInstrumentPrice(`${quote}/USD`);
        setQuoteToUSD(p1);
      } catch {
        const p2 = await getInstrumentPrice(`USD/${quote}`);
        setQuoteToUSD(p2 > 0 ? 1 / p2 : 1);
      }
    } catch {
      setQuoteToUSD(1);
    }
  };
  const calculatePNL = (change: number): { pnl: number; pnlPercent: number } => {
    if (!currentPrice) return { pnl: 0, pnlPercent: 0 };

    // ===== ABSOLUTE PNL (dépend de positionSize) =====
    let pnl = 0;

    if (isFX) {
      // FX: PNL en pips
      const isJPYPair = instrument.includes('JPY');
      const pipSize = isJPYPair ? 0.01 : 0.0001;
      // PNL = variation (pips) × valeur d'un pip × positionSize
      const pipValueUSD = (positionSize * 100000 * pipSize) * quoteToUSD;
      pnl = change * pipValueUSD;
    } else {
      // Crypto/Commodities: PNL = positionSize × variation (points)
      pnl = positionSize * change;
    }

    // ===== PNL% (dépend de leverage via margin) =====
    let margin = 0;
    if (isFX) {
      // Marge FX = (positionSize × contract size × prix × conversion) / leverage
      margin = (positionSize * 100000 * currentPrice * quoteToUSD) / leverage;
    } else {
      // Marge Crypto/Commodities = (positionSize × prix) / leverage
      margin = (positionSize * currentPrice) / leverage;
    }

    const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;

    return { pnl, pnlPercent };
  };

  const calculatePNLForProjection = (change: number, entryPrice: number): { pnl: number; pnlPercent: number } => {
    let pnl = 0;

    if (isFX) {
      const isJPYPair = instrument.includes('JPY');
      const pipSize = isJPYPair ? 0.01 : 0.0001;
      const pipValueUSD = (positionSize * 100000 * pipSize) * quoteToUSD;
      pnl = change * pipValueUSD;
    } else {
      pnl = positionSize * change;
    }

    // Calculate margin using entry price
    let margin = 0;
    if (isFX) {
      // Notional in USD based on entry price
      margin = (positionSize * 100000 * entryPrice * quoteToUSD) / leverage;
    } else {
      margin = (positionSize * entryPrice) / leverage;
    }

    const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;

    return { pnl, pnlPercent };
  };

  const { pnl, pnlPercent } = calculatePNL(priceChange);

  const calculateTPSL = () => {
    if (!currentPrice || !prefilledEntry) return [];

    const results = [];
    const isJPYPair = instrument.includes('JPY');

    if (prefilledStopLoss) {
      const slChange = isFX 
        ? (prefilledStopLoss - prefilledEntry) * (isJPYPair ? 100 : 10000) // pips from entry price
        : (prefilledStopLoss - prefilledEntry); // points from entry price
      const slPNL = calculatePNL(slChange);
      results.push({ label: 'Stop Loss', level: prefilledStopLoss, ...slPNL });
    }

    prefilledTargets.forEach((target, idx) => {
      const tpChange = isFX
        ? (target - prefilledEntry) * (isJPYPair ? 100 : 10000) // pips from entry price
        : (target - prefilledEntry); // points from entry price
      const tpPNL = calculatePNL(tpChange);
      results.push({ label: `TP${idx + 1}`, level: target, ...tpPNL });
    });

    return results;
  };

  const projections = calculateTPSL();

  const CardWrapper = isCollapsible ? Collapsible : 'div';
  const wrapperProps = isCollapsible ? { open: isOpen, onOpenChange: setIsOpen } : {};

  return (
    <CardWrapper {...wrapperProps}>
      <Card className="gradient-card border-primary/20 shadow-glow-primary">
        {isCollapsible ? (
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <CardTitle>PNL Simulator</CardTitle>
                </div>
                <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} />
              </div>
              <CardDescription>
                Calculate position size and profit/loss projections
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
        ) : (
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>PNL Simulator</CardTitle>
            </div>
            <CardDescription>
              Calculate position size and profit/loss projections
            </CardDescription>
          </CardHeader>
        )}

        {isCollapsible ? (
          <CollapsibleContent>
            <CardContent className="space-y-6">
        {/* Instrument Selector */}
        {showInstrumentPicker && (
          <div className="space-y-2">
            <Label>Instrument</Label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {getAllInstruments().map(inst => (
                  <SelectItem key={inst} value={inst}>
                    {inst}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Current Price Display - PATCH: Mobile optimized */}
        {currentPrice && (
          <div className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/30 rounded-lg">
            <span className="text-xs sm:text-sm text-muted-foreground">Current Price</span>
            <span className="font-mono text-base sm:text-lg font-semibold">{currentPrice.toFixed(5)}</span>
          </div>
        )}

        {/* Position Size - PATCH: Mobile optimized */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">Position Size (lots)</Label>
            <span className="text-xs sm:text-sm font-mono">{positionSize.toFixed(2)}</span>
          </div>
          <Slider
            value={[positionSize]}
            onValueChange={([val]) => setPositionSize(val)}
            min={0.01}
            max={10}
            step={0.01}
            className="touch-manipulation"
          />
        </div>

        {/* Leverage - PATCH: Mobile optimized */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">Leverage</Label>
            <span className="text-xs sm:text-sm font-mono">{leverage}x</span>
          </div>
          <Slider
            value={[leverage]}
            onValueChange={([val]) => setLeverage(val)}
            min={1}
            max={500}
            step={1}
            className="touch-manipulation"
          />
        </div>

        {/* Price Change Input - PATCH: Mobile optimized */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">Price Change ({isFX ? 'pips' : 'points'})</Label>
          <Input
            type="number"
            value={priceChange}
            onChange={(e) => setPriceChange(parseFloat(e.target.value) || 0)}
            placeholder="Enter price change"
            className="font-mono text-sm sm:text-base"
          />
        </div>

        {/* PNL Results - PATCH: Mobile optimized */}
        <div className="space-y-3 p-3 sm:p-4 bg-muted/20 rounded-lg border border-border">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Projected PNL</span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {pnl >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success shrink-0" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-danger shrink-0" />
              )}
              <span className={`font-mono text-base sm:text-lg font-bold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                ${pnl.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">PNL %</span>
            <span className={`font-mono text-sm sm:text-base font-semibold ${pnlPercent >= 0 ? 'text-success' : 'text-danger'}`}>
              {pnlPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* TP/SL Projections - PATCH: Mobile optimized */}
        {projections.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Trade Setup Projections</Label>
            <div className="space-y-2">
              {projections.map((proj, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 sm:p-3 bg-muted/10 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={proj.label.includes('SL') ? 'destructive' : 'default'} className="text-xs">
                      {proj.label}
                    </Badge>
                    <span className="text-xs sm:text-sm font-mono text-muted-foreground">
                      @ {proj.level.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end sm:text-right gap-3">
                    <div className={`font-mono text-sm sm:text-base font-semibold ${proj.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      ${proj.pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {proj.pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
            </CardContent>
          </CollapsibleContent>
        ) : (
          <CardContent className="space-y-6">
            {/* Same content as CollapsibleContent but without wrapper */}
            {showInstrumentPicker && (
              <div className="space-y-2">
                <Label>Instrument</Label>
                <Select value={instrument} onValueChange={setInstrument}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    {getAllInstruments().map(inst => (
                      <SelectItem key={inst} value={inst}>
                        {inst}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentPrice && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Current Price</span>
                <span className="font-mono text-lg font-semibold">{currentPrice.toFixed(5)}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Position Size (lots)</Label>
                <span className="text-sm font-mono">{positionSize.toFixed(2)}</span>
              </div>
              <Slider
                value={[positionSize]}
                onValueChange={([val]) => setPositionSize(val)}
                min={0.01}
                max={10}
                step={0.01}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Leverage</Label>
                <span className="text-sm font-mono">{leverage}x</span>
              </div>
              <Slider
                value={[leverage]}
                onValueChange={([val]) => setLeverage(val)}
                min={1}
                max={500}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Price Change ({isFX ? 'pips' : 'points'})</Label>
              <Input
                type="number"
                value={priceChange}
                onChange={(e) => setPriceChange(parseFloat(e.target.value) || 0)}
                placeholder="Enter price change"
                className="font-mono"
              />
            </div>

            <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Projected PNL</span>
                <div className="flex items-center gap-2">
                  {pnl >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-danger" />
                  )}
                  <span className={`font-mono text-lg font-bold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${pnl.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PNL %</span>
                <span className={`font-mono font-semibold ${pnlPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                  {pnlPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {projections.length > 0 && (
              <div className="space-y-2">
                <Label>Trade Setup Projections</Label>
                <div className="space-y-2">
                  {projections.map((proj, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={proj.label.includes('SL') ? 'destructive' : 'default'}>
                          {proj.label}
                        </Badge>
                        <span className="text-sm font-mono text-muted-foreground">
                          @ {proj.level.toFixed(5)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-semibold ${proj.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          ${proj.pnl.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {proj.pnlPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </CardWrapper>
  );
}
