import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowDown, ArrowUp, Shield, Lightbulb } from "lucide-react";

interface DecisionSummaryProps {
  decisionSummary: Record<string, unknown>;
}

export function DecisionSummaryCard({ decisionSummary }: DecisionSummaryProps) {
  const alignment = decisionSummary.alignment as string | undefined;
  const verdict = decisionSummary.verdict as string | undefined;
  const confidenceLabel = decisionSummary.confidence_label as string | undefined;
  const tradeCard = decisionSummary.trade_card as Record<string, unknown> | undefined;
  const narrative = decisionSummary.narrative as string | undefined;
  const keyRisks = decisionSummary.key_risks as string[] | undefined;
  const nextStep = decisionSummary.next_step as string | undefined;
  const disclaimer = decisionSummary.disclaimer as string | undefined;

  const direction = tradeCard?.direction as string | undefined;
  const isLong = direction?.toLowerCase() === "long";
  const isShort = direction?.toLowerCase() === "short";

  const takeProfits = tradeCard?.takeProfits as number[] | undefined;

  const alignmentColor = alignment === "aligned" ? "text-success" : alignment === "mixed" ? "text-warning" : "text-muted-foreground";
  const verdictColor = verdict === "go" ? "bg-success/15 text-success border-success/30" : verdict === "conditional" ? "bg-warning/15 text-warning border-warning/30" : "bg-destructive/15 text-destructive border-destructive/30";
  const confColor = confidenceLabel === "high" ? "bg-success/15 text-success border-success/30" : confidenceLabel === "medium" ? "bg-warning/15 text-warning border-warning/30" : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Decision Summary
          </CardTitle>
          
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {alignment && (
            <Badge variant="outline" className={`text-xs ${alignmentColor}`}>
              Alignment: {alignment}
            </Badge>
          )}
          {verdict && (
            <Badge variant="outline" className={`text-xs ${verdictColor}`}>
              Verdict: {verdict}
            </Badge>
          )}
          {confidenceLabel && (
            <Badge variant="outline" className={`text-xs ${confColor}`}>
              Confidence: {confidenceLabel}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Trade Card */}
        {tradeCard && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trade Card</h4>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {direction && (
                <Badge className={isLong ? "bg-success/15 text-success border-success/30" : isShort ? "bg-destructive/15 text-destructive border-destructive/30" : ""} variant="outline">
                  {isLong ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                  {direction.toUpperCase()}
                </Badge>
              )}
              {tradeCard.timeframe && <Badge variant="secondary" className="text-xs">{tradeCard.timeframe as string}</Badge>}
              {tradeCard.horizon && <Badge variant="secondary" className="text-xs">{tradeCard.horizon as string}</Badge>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tradeCard.entryPrice != null && (
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Entry</p>
                  <p className="text-sm font-mono font-semibold">{Number(tradeCard.entryPrice).toFixed(5)}</p>
                </div>
              )}
              {tradeCard.stopLoss != null && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-[10px] text-destructive uppercase">Stop Loss</p>
                  <p className="text-sm font-mono font-semibold text-destructive">{Number(tradeCard.stopLoss).toFixed(5)}</p>
                </div>
              )}
              {takeProfits && takeProfits.length > 0 && (
                <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                  <p className="text-[10px] text-success uppercase">Take Profit{takeProfits.length > 1 ? "s" : ""}</p>
                  {takeProfits.map((tp, i) => (
                    <p key={i} className="text-sm font-mono font-semibold text-success">{Number(tp).toFixed(5)}</p>
                  ))}
                </div>
              )}
              {tradeCard.riskRewardRatio != null && (
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">R:R</p>
                  <p className="text-sm font-mono font-semibold">{Number(tradeCard.riskRewardRatio).toFixed(2)}</p>
                </div>
              )}
            </div>

            {tradeCard.invalidation && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-warning/50 pl-3">
                {tradeCard.invalidation as string}
              </p>
            )}
          </div>
        )}

        {/* Narrative */}
        {narrative && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Narrative</h4>
            <p className="text-sm leading-relaxed text-foreground/90">{narrative}</p>
          </div>
        )}

        {/* Key Risks */}
        {keyRisks && keyRisks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              Key Risks
            </h4>
            <ol className="space-y-1.5 pl-1">
              {keyRisks.map((risk, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-xs text-muted-foreground font-mono mt-0.5">{i + 1}.</span>
                  {risk}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Next Step */}
        {nextStep && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Next Step
            </h4>
            <p className="text-sm text-foreground/90">{nextStep}</p>
          </div>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/50">
            {disclaimer}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
