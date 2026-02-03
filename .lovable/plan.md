

# Plan : Réorganisation UX de la page Trade Generator

## Objectifs

1. **Déplacer la Risk Surface dans Step 2** (Quant Validation) — sans régression
2. **Ajouter des textes explicatifs** pour chaque section décrivant les outils/modèles utilisés
3. **Améliorer l'affichage du contexte** dans Market Thesis pour une meilleure lisibilité

---

## Modifications fichier par fichier

### Fichier : `src/pages/ForecastTradeGenerator.tsx`

---

### 1. Supprimer la Risk Surface "Hero" standalone

**Lignes affectées :** L2411-2439

Supprimer le bloc Risk Surface qui apparaît actuellement en dehors des sections narratives.

---

### 2. Intégrer la Risk Surface dans le Step 2 (Quant Validation)

**Lignes affectées :** L2514-2549

Ajouter la Risk Surface **au début** du contenu de NarrativeSection Step 2, avant le tableau Forecast.

```text
┌────────────────────────────────────────────────────────────┐
│ Step 2: Quant Validation                                   │
│ "Is this trade statistically sound?"                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ✨ NEW: Texte explicatif des outils                        │
│ "This analysis uses deep learning forecasting models..."   │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │           RISK / REWARD SURFACE (3D)                   │ │
│ │           [RiskSurfaceChart component]                 │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Forecast Summary by Horizon                                │
│ [EnhancedForecastTable - unchanged]                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 3. Ajouter les textes explicatifs pour chaque section

**A. Step 1 : Market Thesis — Ajouter un bloc explicatif**

Avant le contenu existant, ajouter :

```tsx
<div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 mb-4">
  <p className="text-xs text-muted-foreground">
    <span className="font-medium text-violet-600 dark:text-violet-400">
      Powered by:
    </span>{" "}
    GPT-4 Market Intelligence • Real-time macro data feeds • 
    Technical pattern recognition
  </p>
</div>
```

**B. Step 2 : Quant Validation — Ajouter un bloc explicatif**

Avant la Risk Surface, ajouter :

```tsx
<div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 mb-4">
  <p className="text-xs text-muted-foreground">
    <span className="font-medium text-blue-600 dark:text-blue-400">
      Powered by:
    </span>{" "}
    Deep Learning Forecasting (Prophet + Neural Nets) • Monte Carlo Risk Engine • 
    ATR-based volatility calibration
  </p>
</div>
```

---

### 4. Améliorer l'affichage du contexte dans TradeSetupCard

**Lignes affectées :** L916-1025

**Problème actuel :**
- Le contexte est caché par défaut dans un Collapsible
- L'utilisateur doit cliquer sur "Details" pour le voir
- Quand déplié, c'est un simple bloc de texte peu lisible

**Solution proposée :**
Afficher le contexte directement (visible) mais avec une mise en forme plus digeste :
- Texte tronqué par défaut (3 lignes)
- Bouton "Read more" pour voir l'intégralité
- Format plus aéré avec bordure visuelle

**Nouveau code pour TradeSetupCard :**

```tsx
function TradeSetupCard({ setup, index }: { setup: N8nSetup; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullContext, setShowFullContext] = useState(false);

  // Determine if context needs truncation (> 200 chars)
  const contextNeedsTruncation = setup.context && setup.context.length > 200;
  const displayedContext = showFullContext 
    ? setup.context 
    : setup.context?.substring(0, 200);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        {/* ... header unchanged ... */}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Levels - unchanged */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* ... */}
        </div>

        {/* Context - NOW VISIBLE by default with better formatting */}
        {setup.context && (
          <div className="p-3 rounded-lg bg-muted/30 border-l-2 border-violet-500/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Trade Context
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {displayedContext}
              {contextNeedsTruncation && !showFullContext && "..."}
            </p>
            {contextNeedsTruncation && (
              <Button 
                variant="link" 
                size="sm" 
                className="px-0 h-auto text-xs text-primary mt-1"
                onClick={() => setShowFullContext(!showFullContext)}
              >
                {showFullContext ? "Show less" : "Read more"}
              </Button>
            )}
          </div>
        )}

        {/* Risk Notes - also visible when present */}
        {setup.riskNotes && (
          <div className="p-3 rounded-lg bg-rose-500/5 border-l-2 border-rose-500/50">
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              Risk Notes
            </p>
            <p className="text-sm text-rose-600 dark:text-rose-400">{setup.riskNotes}</p>
          </div>
        )}

        {/* Expandable Details - for Supports/Resistances only */}
        {((setup.supports && setup.supports.length > 0) || 
          (setup.resistances && setup.resistances.length > 0)) && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-xs">Technical Levels</span>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {setup.supports && setup.supports.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Supports</p>
                  <div className="flex flex-wrap gap-1">
                    {setup.supports.map((s, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs border-emerald-500/50 text-emerald-600">
                        {formatPrice(s)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {setup.resistances && setup.resistances.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Resistances</p>
                  <div className="flex flex-wrap gap-1">
                    {setup.resistances.map((r, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs border-rose-500/50 text-rose-600">
                        {formatPrice(r)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 5. Ajouter les imports nécessaires

```tsx
import { FileText } from "lucide-react";
```

---

## Récapitulatif des modifications

| Section | Avant | Après |
|---------|-------|-------|
| Risk Surface | Hero standalone au-dessus | Intégrée dans Step 2 (Quant Validation) |
| Step 1 (Market Thesis) | Pas d'explication des outils | Bloc "Powered by: GPT-4, macro feeds..." |
| Step 2 (Quant Validation) | Pas d'explication des outils | Bloc "Powered by: Deep Learning, Monte Carlo..." |
| Context dans TradeSetupCard | Caché dans Collapsible, texte brut | Visible par défaut, tronqué avec "Read more" |
| Risk Notes dans TradeSetupCard | Caché dans Collapsible | Visible directement avec style rose |
| Supports/Resistances | Dans Collapsible "Details" | Dans Collapsible "Technical Levels" (renommé) |

---

## Nouveau flux visuel

```text
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: MARKET THESIS                                          │
│  "Why this trade exists"                                        │
├─────────────────────────────────────────────────────────────────┤
│  ✨ Powered by: GPT-4 • Macro data • Technical patterns         │
│                                                                  │
│  [Market Commentary]                                             │
│  [Key Drivers badges]                                            │
│                                                                  │
│  ┌─────────────────────────────────┬───────────────────────────┐ │
│  │ Setup Card #1                   │ Setup Card #2             │ │
│  │ Entry/SL/TP/R:R                 │ Entry/SL/TP/R:R           │ │
│  │                                 │                           │ │
│  │ ┌── Trade Context ─────────┐   │ ┌── Trade Context ─────┐   │ │
│  │ │ "This trade exists      │   │ │ "Context visible..." │   │ │
│  │ │  because... Read more"  │   │ │                      │   │ │
│  │ └─────────────────────────┘   │ └──────────────────────┘   │ │
│  │                                 │                           │ │
│  │ ┌── Risk Notes ────────────┐   │                           │ │
│  │ │ ⚠ "Be aware of..."     │   │                           │ │
│  │ └─────────────────────────┘   │                           │ │
│  │                                 │                           │ │
│  │ [▸ Technical Levels]           │ [▸ Technical Levels]      │ │
│  └─────────────────────────────────┴───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Step 2: QUANT VALIDATION                                       │
│  "Is this trade statistically sound?"                           │
├─────────────────────────────────────────────────────────────────┤
│  ✨ Powered by: Deep Learning • Monte Carlo • ATR volatility    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │            ★ RISK / REWARD SURFACE (3D)                     ││
│  │            [Interactive chart - click to explore]           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Forecast Summary by Horizon                                     │
│  [EnhancedForecastTable - expandable rows]                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Step 3: DECISION LAYER                                         │
│  [Convergence / Divergence / Recommended Trade]                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Garanties de non-régression

| Critère | Garantie |
|---------|----------|
| Risk Surface fonctionnalité | ✅ Composant identique, juste déplacé |
| Risk Surface interactivité | ✅ Click, tooltip, panel conservés |
| TradeSetupCard - Entry/SL/TP | ✅ Grid inchangé |
| TradeSetupCard - Context | ✅ Données identiques, meilleur affichage |
| TradeSetupCard - Supports/Resistances | ✅ Accessibles via Collapsible |
| Forecast Table | ✅ EnhancedForecastTable inchangé |
| Risk Profiles panel | ✅ RiskProfilesPanel inchangé |
| API calls | ✅ Aucune modification |
| Calculations | ✅ Aucune modification |
| Decision Layer | ✅ Inchangé |

