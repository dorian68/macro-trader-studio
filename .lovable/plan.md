

# Plan : Refonte UX du Trade Generator — Narratif en 3 temps

## Problème actuel identifié

La page Trade Generator affiche actuellement les résultats dans 2 onglets (tabs) :
- **Trade Setup** : Contient le market commentary, les setups AI avec Entry/SL/TP
- **Forecast Data** : Contient le tableau de forecast par horizon

Ces deux sections sont perçues comme **redondantes** ou **concurrentes** car :
1. Elles utilisent des noms techniques ("Trade Setup", "Forecast Data")
2. Aucune narration ne les relie
3. L'utilisateur ne sait pas quelle section consulter en premier ni pourquoi

## Solution proposée : Nouveau narratif UX en 3 temps

Restructurer **uniquement la présentation visuelle** pour raconter une histoire décisionnelle claire :

```text
┌─────────────────────────────────────────────────────────────────┐
│  ★ RISK SURFACE (Hero - inchangé)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1️⃣ MARKET THESIS — Why this trade exists                    ││
│  │ (Human + AI Context)                                         ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ • Market Commentary (inchangé)                               ││
│  │ • Key Drivers (inchangé)                                     ││
│  │ • Setup Cards (Entry/SL/TP) (inchangé)                       ││
│  │ • Context, Risk Notes (inchangé)                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 2️⃣ QUANT VALIDATION — Is this statistically sound?          ││
│  │ (Deep Learning + Risk Engine)                                ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ • Forecast Summary by Horizon (inchangé)                     ││
│  │ • Risk Profiles (inchangé)                                   ││
│  │ • Prob TP, R/R Ratio (inchangé)                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 3️⃣ DECISION LAYER — Where thesis meets probability          ││
│  │ (Synthesis - aucune nouvelle donnée)                         ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ • Convergence Points                                         ││
│  │ • Divergence Alerts                                          ││
│  │ • Trade Recommendation Summary                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modifications fichier par fichier

### Fichier : `src/pages/ForecastTradeGenerator.tsx`

#### 1. Remplacer les tabs par des sections narratives verticales

**Lignes affectées :** L2226-2333 (Results Section)

**AVANT :**
```tsx
<Tabs defaultValue="trade-setup">
  <TabsList>
    <TabsTrigger value="trade-setup">Trade Setup</TabsTrigger>
    <TabsTrigger value="forecast-data">Forecast Data</TabsTrigger>
  </TabsList>
  <TabsContent value="trade-setup">...</TabsContent>
  <TabsContent value="forecast-data">...</TabsContent>
</Tabs>
```

**APRÈS :**
```tsx
{/* Section 1: Market Thesis */}
<NarrativeSection 
  step={1}
  title="Market Thesis"
  subtitle="Why this trade exists"
  icon={<Lightbulb />}
  tagline="Human + AI Context"
>
  {/* Contenu existant de Trade Setup - AUCUNE MODIFICATION */}
</NarrativeSection>

{/* Section 2: Quant Validation */}
<NarrativeSection 
  step={2}
  title="Quant Validation"
  subtitle="Is this trade statistically sound?"
  icon={<BarChart3 />}
  tagline="Deep Learning + Risk Engine"
>
  {/* Contenu existant de Forecast Data - AUCUNE MODIFICATION */}
</NarrativeSection>

{/* Section 3: Decision Layer */}
<DecisionLayer 
  aiSetup={aiSetupResult}
  forecastHorizons={forecastHorizons}
/>
```

#### 2. Créer le composant `NarrativeSection` (wrapper purement visuel)

**Emplacement :** Ajouter après les composants utilitaires existants (~L1340)

```tsx
interface NarrativeSectionProps {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tagline: string;
  children: React.ReactNode;
}

function NarrativeSection({ step, title, subtitle, icon, tagline, children }: NarrativeSectionProps) {
  const stepColors = {
    1: "border-l-violet-500",   // Purple for Thesis
    2: "border-l-blue-500",     // Blue for Quant
    3: "border-l-emerald-500",  // Green for Decision
  };

  return (
    <Card className={cn(
      "rounded-xl border shadow-sm overflow-hidden",
      "border-l-4",
      stepColors[step]
    )}>
      <CardHeader className="pb-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                Step {step}
              </Badge>
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <CardDescription className="text-sm">
              {subtitle}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tagline}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}
```

#### 3. Créer le composant `DecisionLayer` (synthèse visuelle uniquement)

**Emplacement :** Ajouter après `NarrativeSection` (~L1380)

Ce composant **ne calcule RIEN de nouveau**. Il reformule visuellement les données existantes.

```tsx
interface DecisionLayerProps {
  aiSetup: N8nTradeResult | null;
  forecastHorizons: ForecastHorizon[];
}

function DecisionLayer({ aiSetup, forecastHorizons }: DecisionLayerProps) {
  // Pas de nouveau calcul - extraction des données existantes uniquement
  const primarySetup = aiSetup?.setups?.[0];
  const primaryHorizon = forecastHorizons[0];
  
  if (!primarySetup && !primaryHorizon) {
    return null;
  }

  // Direction check - simple comparaison des données existantes
  const aiDirection = primarySetup?.direction?.toLowerCase();
  const quantDirection = primaryHorizon?.direction?.toLowerCase();
  const directionsAlign = aiDirection === quantDirection;
  
  // Confidence check from existing data
  const aiConfidence = primarySetup?.strategyMeta?.confidence;
  const quantProb = primaryHorizon?.prob_hit_tp_before_sl;
  
  return (
    <Card className="rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono border-emerald-500/50">
                Step 3
              </Badge>
              <CardTitle className="text-lg">Decision Layer</CardTitle>
            </div>
            <CardDescription>Where thesis meets probability</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Convergence / Divergence Points */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Convergence */}
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Convergence Points
              </span>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {directionsAlign && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Direction aligned: Both suggest {aiDirection?.toUpperCase()}
                </li>
              )}
              {quantProb && quantProb > 0.5 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Probability favors TP: {(quantProb * 100).toFixed(0)}% chance
                </li>
              )}
              {primaryHorizon?.riskReward && primaryHorizon.riskReward > 1 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Positive R/R ratio: {primaryHorizon.riskReward.toFixed(2)}
                </li>
              )}
              {(!directionsAlign && !quantProb) && (
                <li className="text-muted-foreground italic">Generating...</li>
              )}
            </ul>
          </div>

          {/* Divergence */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Divergence Alerts
              </span>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {!directionsAlign && aiDirection && quantDirection && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Direction conflict: AI suggests {aiDirection?.toUpperCase()}, Quant suggests {quantDirection?.toUpperCase()}
                </li>
              )}
              {quantProb && quantProb < 0.5 && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Low probability: Only {(quantProb * 100).toFixed(0)}% chance of TP
                </li>
              )}
              {primarySetup?.riskNotes && (
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Risk flagged: {primarySetup.riskNotes.substring(0, 60)}...
                </li>
              )}
              {(directionsAlign && (!quantProb || quantProb >= 0.5) && !primarySetup?.riskNotes) && (
                <li className="text-emerald-600 italic">No divergence detected</li>
              )}
            </ul>
          </div>
        </div>

        {/* Trade Recommendation Summary */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Recommended Trade
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {primarySetup?.direction && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-sm font-bold",
                  primarySetup.direction.toLowerCase() === "long"
                    ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                    : "border-rose-500 text-rose-600 bg-rose-500/10"
                )}
              >
                {primarySetup.direction.toLowerCase() === "long" && <TrendingUp className="h-4 w-4 mr-1" />}
                {primarySetup.direction.toLowerCase() === "short" && <TrendingDown className="h-4 w-4 mr-1" />}
                {primarySetup.direction.toUpperCase()}
              </Badge>
            )}
            {primarySetup?.entryPrice && (
              <span className="text-sm">
                Entry: <span className="font-mono font-semibold text-primary">{formatPrice(primarySetup.entryPrice)}</span>
              </span>
            )}
            {primarySetup?.stopLoss && (
              <span className="text-sm">
                SL: <span className="font-mono font-semibold text-rose-600">{formatPrice(primarySetup.stopLoss)}</span>
              </span>
            )}
            {primarySetup?.takeProfits?.[0] && (
              <span className="text-sm">
                TP: <span className="font-mono font-semibold text-emerald-600">{formatPrice(primarySetup.takeProfits[0])}</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 4. Ajouter les imports nécessaires

**Ligne 20-40 (imports Lucide) :**

```tsx
import {
  // ... existing imports ...
  Lightbulb,        // NEW - for Market Thesis
  BarChart3,        // NEW - for Quant Validation
  CheckCircle2,     // NEW - for Decision Layer
  AlertTriangle,    // NEW - for Divergence Alerts
} from "lucide-react";
```

---

## Récapitulatif des modifications

| Élément | Avant | Après |
|---------|-------|-------|
| Structure résultats | 2 tabs (Trade Setup / Forecast Data) | 3 sections verticales narratives |
| Tab "Trade Setup" | Nom technique | "Market Thesis — Why this trade exists" |
| Tab "Forecast Data" | Nom technique | "Quant Validation — Is this statistically sound?" |
| Nouvelle section | ❌ N'existe pas | "Decision Layer — Where thesis meets probability" |
| Contenu fonctionnel | ✅ Intact | ✅ 100% préservé |
| Données affichées | ✅ Identiques | ✅ Identiques (Decision Layer = reformulation visuelle) |
| Appels API | ✅ Inchangés | ✅ Inchangés |
| Calculs | ✅ Inchangés | ✅ Inchangés |

---

## Garanties de non-régression

| Critère | Garantie |
|---------|----------|
| Market Commentary | ✅ Rendu identique, juste dans une section renommée |
| Key Drivers | ✅ Badges identiques |
| Setup Cards (Entry/SL/TP) | ✅ TradeSetupCard inchangé |
| Context / Risk Notes | ✅ Collapsible identique |
| Forecast Table | ✅ EnhancedForecastTable inchangé |
| Risk Profiles panel | ✅ RiskProfilesPanel inchangé |
| Risk Surface | ✅ Reste en "Hero" au-dessus |
| API calls | ✅ Aucune modification |
| Calculations | ✅ Aucune nouvelle logique |
| Debug panels | ✅ Accessibles aux super-users |

---

## Nouveau flux UX

```text
1. Utilisateur génère un trade

2. Risk Surface s'affiche en HERO (inchangé)

3. Section 1: MARKET THESIS (violet)
   └── "Voici POURQUOI ce trade existe"
   └── Contexte macro, hypothèses AI
   └── Setup cards avec Entry/SL/TP
   └── L'utilisateur comprend le RAISONNEMENT

4. Section 2: QUANT VALIDATION (bleu)
   └── "Ce trade est-il STATISTIQUEMENT valide?"
   └── Tableau de forecast par horizon
   └── Probabilités, R/R ratio
   └── L'utilisateur valide la ROBUSTESSE

5. Section 3: DECISION LAYER (vert)
   └── "Où la thèse rencontre la probabilité"
   └── Points de convergence (direction alignée, prob > 50%)
   └── Alertes de divergence (direction conflit, prob faible)
   └── Récapitulatif du trade recommandé
   └── L'utilisateur prend sa DÉCISION
```

