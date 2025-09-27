import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TradeSetupDisplayProps {
  data: any;
  originalQuery?: string;
}

export function TradeSetupDisplay({ data, originalQuery }: TradeSetupDisplayProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground">No trade setup data available.</p>
        </CardContent>
      </Card>
    );
  }

  // Handle both single setup and setups array
  const setupData = data.setups ? data.setups[0] : data;
  
  // Map both old and new field names for backward compatibility
  const {
    instrument = data.instrument, // Can come from parent content
    timeframe,
    horizon,
    strategy,
    direction,
    entry_price,
    entry, // Alternative field name
    entryPrice, // camelCase alternative
    stop_loss,
    stopLoss, // camelCase alternative
    targets,
    takeProfits, // camelCase alternative
    key_levels,
    levels, // Alternative field name
    risk_reward_ratio,
    risk_reward, // Alternative field name
    riskReward, // camelCase alternative
    confidence,
    position_size,
    market_context,
    context, // Alternative field name
    trade_reasoning,
    reasoning, // Alternative field name
    riskNotes, // camelCase field
    as_of,
    atr_multiple_sl
  } = setupData || data;

  const getDirectionIcon = (dir: string) => {
    return dir?.toLowerCase() === 'long' ? (
      <TrendingUp className="h-4 w-4 text-emerald-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getDirectionColor = (dir: string) => {
    return dir?.toLowerCase() === 'long' 
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950" 
      : "text-red-600 bg-red-50 dark:bg-red-950";
  };

  const finalEntry = entry_price || entry || entryPrice;
  const finalStopLoss = stop_loss || stopLoss;
  const finalTargets = targets || takeProfits;
  const finalKeyLevels = key_levels || levels;
  const finalRiskReward = risk_reward_ratio || risk_reward || riskReward;
  const finalContext = market_context || context;
  const finalReasoning = trade_reasoning || reasoning;
  
  // Extract commentary from market_commentary_anchor if available
  const marketCommentary = data.market_commentary_anchor?.summary;

  return (
    <div className="space-y-4">
      {/* Original Query */}
      {originalQuery && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Original Query</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm bg-muted/50 p-3 rounded-lg font-mono break-words">
              {originalQuery}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Trade Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Trade Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instrument && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Instrument</span>
                <p className="font-medium break-words">{instrument}</p>
              </div>
            )}
            {timeframe && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Timeframe</span>
                <p className="font-medium">{timeframe}</p>
              </div>
            )}
            {horizon && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Horizon</span>
                <p className="font-medium">{horizon}</p>
              </div>
            )}
            {strategy && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Strategy</span>
                <p className="font-medium break-words">{strategy}</p>
              </div>
            )}
            {as_of && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">As Of</span>
                <p className="font-medium text-xs">{new Date(as_of).toLocaleString()}</p>
              </div>
            )}
          </div>
          
          {/* Direction - Prominently displayed */}
          {direction && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Direction:</span>
                <div className="flex items-center gap-2">
                  {getDirectionIcon(direction)}
                  <Badge className={`${getDirectionColor(direction)} border-0 font-semibold`}>
                    {direction.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Trade Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finalEntry && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Entry</span>
                <p className="font-semibold text-lg">{finalEntry}</p>
              </div>
            )}
            {finalStopLoss && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Stop Loss</span>
                <p className="font-semibold text-lg text-red-600 dark:text-red-400">{finalStopLoss}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Price Targets */}
      {finalTargets && finalTargets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Take Profits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {finalTargets.map((target: any, index: number) => (
                <div key={index} className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    TP{index + 1}
                  </span>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                    {typeof target === 'object' ? target.price || target.level || target : target}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Levels */}
      {finalKeyLevels && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Key Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(finalKeyLevels.support || finalKeyLevels.supports) && (finalKeyLevels.support?.length > 0 || finalKeyLevels.supports?.length > 0) && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Supports</h4>
                <div className="space-y-1">
                  {(finalKeyLevels.support || finalKeyLevels.supports || []).map((level: any, index: number) => (
                    <div key={index} className="p-2 bg-muted/50 rounded text-sm break-words">
                      {typeof level === 'object' ? level.price || level.level || level : level}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(finalKeyLevels.resistance || finalKeyLevels.resistances) && (finalKeyLevels.resistance?.length > 0 || finalKeyLevels.resistances?.length > 0) && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Resistances</h4>
                <div className="space-y-1">
                  {(finalKeyLevels.resistance || finalKeyLevels.resistances || []).map((level: any, index: number) => (
                    <div key={index} className="p-2 bg-muted/50 rounded text-sm break-words">
                      {typeof level === 'object' ? level.price || level.level || level : level}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Risk Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {finalRiskReward && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground block">Risk:Reward</span>
                <p className="font-bold text-lg">{finalRiskReward}</p>
              </div>
            )}
            {confidence && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground block">Confidence</span>
                <p className="font-bold text-lg">{confidence}%</p>
              </div>
            )}
            {position_size && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground block">Position Size</span>
                <p className="font-bold text-sm break-words">{position_size}</p>
              </div>
            )}
            {atr_multiple_sl && (
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground block">ATR Multiple SL</span>
                <p className="font-bold text-lg">{atr_multiple_sl}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Context & Commentary */}
      {(finalContext || finalReasoning || marketCommentary || riskNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Context & Commentary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {finalContext && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Market Context</h4>
                <p className="text-foreground leading-relaxed break-words">{finalContext}</p>
              </div>
            )}
            {finalReasoning && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Trade Reasoning</h4>
                <p className="text-foreground leading-relaxed break-words">{finalReasoning}</p>
              </div>
            )}
            {marketCommentary && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Market Commentary</h4>
                <p className="text-foreground leading-relaxed break-words">{marketCommentary}</p>
              </div>
            )}
            {riskNotes && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Risk Notes</h4>
                <p className="text-foreground leading-relaxed break-words">{riskNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}