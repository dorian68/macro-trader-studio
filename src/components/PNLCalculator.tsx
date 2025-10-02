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

  const instrumentType = getInstrumentType(instrument);
  const isFX = instrumentType === 'fx';

  useEffect(() => {
    fetchPrice();
  }, [instrument]);

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

  const calculatePNL = (change: number): { pnl: number; pnlPercent: number } => {
    if (!currentPrice) return { pnl: 0, pnlPercent: 0 };

    let pnl = 0;

    if (isFX) {
      // FX: calculate in pips
      // JPY pairs: 1 pip = 0.01, others: 1 pip = 0.0001
      const isJPYPair = instrument.includes('JPY');
      const pipSize = isJPYPair ? 0.01 : 0.0001;
      const pipValue = (positionSize * 100000 * pipSize);
      pnl = change * pipValue;
    } else {
      // Crypto/Commodities: use points (1 point = 1 USD)
      pnl = positionSize * change;
    }

    const margin = (positionSize * currentPrice) / leverage;
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
        ? (prefilledStopLoss - prefilledEntry) * (isJPYPair ? 100 : 10000) // pips (JPY vs others)
        : (prefilledStopLoss - prefilledEntry); // points
      const slPNL = calculatePNL(slChange);
      results.push({ label: 'Stop Loss', level: prefilledStopLoss, ...slPNL });
    }

    prefilledTargets.forEach((target, idx) => {
      const tpChange = isFX
        ? (target - prefilledEntry) * (isJPYPair ? 100 : 10000) // pips (JPY vs others)
        : (target - prefilledEntry); // points
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

        {/* Current Price Display */}
        {currentPrice && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="font-mono text-lg font-semibold">{currentPrice.toFixed(5)}</span>
          </div>
        )}

        {/* Position Size */}
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

        {/* Leverage */}
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

        {/* Price Change Input */}
        <div className="space-y-2">
          <Label>Price Change ({isFX ? 'pips' : '%'})</Label>
          <Input
            type="number"
            value={priceChange}
            onChange={(e) => setPriceChange(parseFloat(e.target.value) || 0)}
            placeholder="Enter price change"
            className="font-mono"
          />
        </div>

        {/* PNL Results */}
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

        {/* TP/SL Projections */}
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
