

# Plan : Amélioration de l'UX du Trade Generator en mode résultats

## Contexte du problème

Actuellement, lorsqu'un résultat est reçu :
- Le dashboard d'inputs (3 cards : Market Context, Trade Parameters, Model Options) reste entièrement visible
- L'utilisateur doit scroller pour voir les résultats
- La Risk Surface (élément critique) se retrouve tout en bas de page
- L'expérience n'est pas fluide pour un workflow "génération → consultation des résultats"

## Solution proposée : Panneau d'inputs auto-rétractable

L'idée est d'implémenter un **Collapsible intelligent** qui :
1. S'effondre automatiquement quand des résultats sont reçus
2. Affiche un résumé compact des paramètres utilisés en mode collapsed
3. Reste expansible pour permettre des ajustements et relances
4. Met en avant les résultats (et surtout la Risk Surface) immédiatement

```text
┌─────────────────────────────────────────────────────────┐
│  📊 Trade Generator                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ▼ Parameters  [EUR/USD | 1h | 24,48,72h | Breakout]    │  ← Résumé cliquable
│  ───────────────────────────────────────────────────────│     quand collapsed
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │           ★ RISK SURFACE (3D Chart)                 ││  ← Maintenant
│  │                                                      ││    premier élément
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  [Trade Setup]  [Forecast Data]   ← Tabs des résultats  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Modifications techniques

### 1. Nouveaux états dans ForecastTradeGeneratorContent

**Lignes affectées :** ~L1473 (zone des useState)

```typescript
// État pour contrôler l'expansion du panneau d'inputs
const [isInputPanelOpen, setIsInputPanelOpen] = useState(true);
```

### 2. Auto-collapse à la réception des résultats

**Lignes affectées :** handleSubmit (~L1700-1770)

Ajouter à la fin de handleSubmit (après le setLoading(false)) :
```typescript
// ✅ Auto-collapse inputs when results are received
setIsInputPanelOpen(false);
```

**Aussi dans le useEffect du pendingResult** (~L1527-1574) :
```typescript
// Après l'injection des données
setIsInputPanelOpen(false);
```

### 3. Restructuration du JSX : Inputs dans un Collapsible

**Lignes affectées :** L1845-2017 (Form Section)

Wrapper le grid des 3 cards dans un Collapsible avec :
- Un header compact affichant les paramètres actuels
- Une animation fluide
- Un bouton pour re-expand

```typescript
{/* Collapsible Input Panel */}
<Collapsible open={isInputPanelOpen} onOpenChange={setIsInputPanelOpen}>
  <Card className="rounded-2xl border shadow-sm overflow-hidden">
    <CollapsibleTrigger asChild>
      <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Parameters</CardTitle>
            {/* Résumé compact visible quand collapsed */}
            {!isInputPanelOpen && hasResults && (
              <div className="flex flex-wrap gap-2 ml-2">
                <Badge variant="secondary" className="text-xs">{symbol}</Badge>
                <Badge variant="secondary" className="text-xs">{timeframe}</Badge>
                <Badge variant="secondary" className="text-xs">{horizons}h</Badge>
                <Badge variant="secondary" className="text-xs">{STRATEGIES.find(s => s.value === strategy)?.label || strategy}</Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isInputPanelOpen && (
              <span className="text-xs text-muted-foreground">Click to edit</span>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              isInputPanelOpen ? "" : "-rotate-90"
            )} />
          </div>
        </div>
      </CardHeader>
    </CollapsibleTrigger>
    
    <CollapsibleContent>
      <CardContent className="pt-0 pb-4">
        {/* Le grid des 3 cards (Market Context, Trade Parameters, Model Options) */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* ... existing cards content ... */}
        </div>
      </CardContent>
    </CollapsibleContent>
  </Card>
</Collapsible>
```

### 4. Réorganiser la section Results pour prioriser Risk Surface

**Lignes affectées :** L2151-2284 (Results Section)

Créer un nouveau layout quand hasResults est true :

```typescript
{/* Results Section - Risk Surface FIRST */}
{hasResults && !loading && (
  <div className="space-y-6">
    
    {/* ★ Risk Surface en premier - élément héros */}
    {riskSurfaceData && (
      <Card className="rounded-xl border-2 border-primary/20 shadow-lg bg-gradient-to-br from-card to-card-secondary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Risk / Reward Surface
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Primary Analysis
            </Badge>
          </div>
          <CardDescription>
            3D visualization of probability-adjusted TP as a function of SL intensity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RiskSurfaceChart
            data={riskSurfaceData}
            loading={false}
            error={null}
            symbol={symbol}
            timeframe={timeframe}
            horizonHours={parseInt(horizons.split(",")[0]?.trim() || "24", 10)}
          />
        </CardContent>
      </Card>
    )}
    
    {/* Tabs pour Trade Setup et Forecast Data */}
    <Tabs defaultValue="trade-setup" className="space-y-4">
      <TabsList>
        <TabsTrigger value="trade-setup">Trade Setup</TabsTrigger>
        <TabsTrigger value="forecast-data">Forecast Data</TabsTrigger>
      </TabsList>
      
      {/* Trade Setup Tab - reste identique */}
      <TabsContent value="trade-setup" className="space-y-4">
        {/* ... existing content ... */}
      </TabsContent>
      
      {/* Forecast Data Tab - SANS la Risk Surface (déjà affichée) */}
      <TabsContent value="forecast-data" className="space-y-6">
        {/* Forecast Table uniquement */}
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Forecast Summary by Horizon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedForecastTable ... />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
)}
```

### 5. Animation CSS pour le Collapsible

**Fichier :** src/index.css

Ajouter après les animations existantes (~L380) :

```css
/* Collapsible panel animation */
@keyframes collapse-down {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: var(--radix-collapsible-content-height);
    opacity: 1;
  }
}

@keyframes collapse-up {
  from {
    max-height: var(--radix-collapsible-content-height);
    opacity: 1;
  }
  to {
    max-height: 0;
    opacity: 0;
  }
}

[data-state="open"] > .collapsible-content {
  animation: collapse-down 0.3s ease-out;
}

[data-state="closed"] > .collapsible-content {
  animation: collapse-up 0.2s ease-out;
}
```

---

## Tableau récapitulatif

| Fichier | Modifications |
|---------|---------------|
| `src/pages/ForecastTradeGenerator.tsx` | Ajouter état `isInputPanelOpen`, wrapper inputs dans Collapsible, réorganiser Results pour mettre Risk Surface en premier |
| `src/index.css` | Ajouter animations pour le Collapsible |

---

## Flux UX après modification

```text
1. Utilisateur arrive sur /trade-generator
   └── Panneau d'inputs OUVERT (full form visible)
   
2. Utilisateur clique "Generate Trade"
   └── Loading skeleton affiché
   
3. Résultats reçus
   └── Panneau d'inputs AUTO-COLLAPSE
   └── Résumé compact visible: [EUR/USD | 1h | 24,48,72h | Breakout]
   └── ★ RISK SURFACE affichée en premier (sans scroll)
   └── Tabs Trade Setup / Forecast Data en dessous
   
4. Utilisateur veut modifier les paramètres
   └── Clic sur le header "Parameters"
   └── Panneau se ré-ouvre avec animation fluide
   └── Modifie et relance
```

---

## Garanties de non-régression

- Toutes les fonctionnalités existantes restent intactes
- Les inputs sont toujours accessibles (collapsed mais expansible)
- Les résultats restent dans les mêmes tabs
- La Risk Surface est simplement déplacée et mise en avant
- Les éléments de debug super-user restent conditionnels et fonctionnels
- Le job tracking et les notifications ne sont pas impactés

