
# Plan: Afficher les Resultats Trade Generator avec Risk Surface et Forecast Data

## Contexte

La page Trade Generator (`/forecast-playground/trade-generator`) recoit maintenant une reponse JSON de l'API avec le format suivant:

```json
{
  "trade_generation_output": {
    "final_answer": "...",           // Texte AI / Market Commentary
    "trade_setup": {...},            // Donnees forecast (horizons, entry_price, etc.)
    "risk_surface": {...},           // Donnees pour le graphique 3D (sigma_ref, surface, atr)
    "confidence_note": "..."         // Note sur la recherche partenaire
  }
}
```

L'objectif est d'afficher ces donnees comme dans les pages `ForecastPlaygroundTool` et `AISetup`:
1. Afficher le commentaire de marche textuel (style AISetup)
2. Afficher le tableau de forecast avec Risk Profiles (style ForecastPlaygroundTool)
3. Afficher le graphique Risk Surface 3D (style ForecastPlaygroundTool)

---

## Modifications Techniques

### 1. Mise a Jour de l'Extraction des Donnees (Response Parsing)

Modifier la fonction `normalizeN8n` et ajouter de nouvelles fonctions d'extraction:

```typescript
// Extraire trade_setup depuis trade_generation_output
function extractTradeSetup(raw: unknown): TradeSetupResponse | null {
  const obj = raw as Record<string, unknown>;
  // Path: output.trade_generation_output.trade_setup
  if (obj?.output?.trade_generation_output?.trade_setup) {
    let setup = obj.output.trade_generation_output.trade_setup;
    if (typeof setup === 'string') {
      try { setup = JSON.parse(setup); } catch { return null; }
    }
    return setup as TradeSetupResponse;
  }
  return null;
}

// Extraire risk_surface depuis trade_generation_output
function extractRiskSurface(raw: unknown): SurfaceApiResponse | null {
  const obj = raw as Record<string, unknown>;
  if (obj?.output?.trade_generation_output?.risk_surface) {
    let surface = obj.output.trade_generation_output.risk_surface;
    if (typeof surface === 'string') {
      try { surface = JSON.parse(surface); } catch { return null; }
    }
    return surface as SurfaceApiResponse;
  }
  return null;
}

// Extraire final_answer (texte AI)
function extractFinalAnswer(raw: unknown): string | null {
  const obj = raw as Record<string, unknown>;
  if (obj?.output?.trade_generation_output?.final_answer) {
    return obj.output.trade_generation_output.final_answer as string;
  }
  return null;
}

// Extraire confidence_note
function extractConfidenceNote(raw: unknown): string | null {
  const obj = raw as Record<string, unknown>;
  return obj?.output?.trade_generation_output?.confidence_note as string || null;
}
```

### 2. Nouveaux States pour les Donnees

Ajouter les states pour stocker les donnees extraites:

```typescript
// Trade Setup Data (forecast horizons)
const [tradeSetupData, setTradeSetupData] = useState<TradeSetupResponse | null>(null);

// Risk Surface Data (3D chart)
const [riskSurfaceData, setRiskSurfaceData] = useState<SurfaceApiResponse | null>(null);

// Final Answer (AI textual analysis)
const [finalAnswer, setFinalAnswer] = useState<string | null>(null);

// Confidence Note
const [confidenceNote, setConfidenceNote] = useState<string | null>(null);
```

### 3. Mise a Jour de `handleSubmit`

Apres reception de la reponse, extraire et stocker toutes les donnees:

```typescript
const data = await response.json();
setRawResponse(data);

// Parse AI Setup data (existant)
const normalized = normalizeN8n(data);
if (normalized && normalized.setups && normalized.setups.length > 0) {
  setAiSetupResult(normalized);
}

// NEW: Extract trade_setup (forecast_data)
const tradeSetup = extractTradeSetup(data);
if (tradeSetup) {
  setTradeSetupData(tradeSetup);
  // Extraire les horizons pour le tableau
  const horizons = getPayloadHorizonsFromSetup(tradeSetup);
  setForecastHorizons(horizons);
}

// NEW: Extract risk_surface
const surface = extractRiskSurface(data);
if (surface) {
  setRiskSurfaceData(surface);
}

// NEW: Extract final_answer
const answer = extractFinalAnswer(data);
if (answer) {
  setFinalAnswer(answer);
}

// NEW: Extract confidence_note
const note = extractConfidenceNote(data);
setConfidenceNote(note);
```

### 4. Nouvelle Section UI: Market Commentary / Final Answer

Ajouter une section pour afficher le texte AI (comme dans AISetup):

```tsx
{/* AI Analysis / Final Answer */}
{finalAnswer && (
  <Card className="rounded-xl border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        AI Market Analysis
        {confidenceNote && (
          <Badge 
            variant="outline" 
            className={cn(
              "ml-auto text-xs",
              confidenceNote.includes("integrated") 
                ? "border-emerald-500/50 text-emerald-600" 
                : "border-amber-500/50 text-amber-600"
            )}
          >
            {confidenceNote}
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {finalAnswer}
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

### 5. Mise a Jour du Tab "Forecast Data"

Modifier le tab pour utiliser `riskSurfaceData` directement au lieu de `surfaceResult`:

```tsx
<TabsContent value="forecast-data" className="space-y-6">
  {/* Enhanced Forecast Table with Risk Profiles */}
  <Card className="rounded-xl border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        Forecast Summary by Horizon
      </CardTitle>
    </CardHeader>
    <CardContent>
      <EnhancedForecastTable 
        horizons={forecastHorizons} 
        symbol={symbol}
        timeframe={timeframe}
        surfaceResult={riskSurfaceData}  // <-- Utiliser les donnees du champ risk_surface
        expandedRows={expandedRows}
        onToggleRow={toggleRowExpanded}
      />
    </CardContent>
  </Card>

  {/* Risk Surface Chart - Source: risk_surface field */}
  {riskSurfaceData && (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Risk / Reward Surface
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RiskSurfaceChart
          data={riskSurfaceData}  // <-- Donnees directes du champ risk_surface
          loading={false}
          error={null}
          symbol={symbol}
          timeframe={timeframe}
          horizonHours={parseInt(horizons.split(",")[0]?.trim() || "24", 10)}
        />
      </CardContent>
    </Card>
  )}
</TabsContent>
```

### 6. Supprimer l'Appel API Separe pour Surface

Actuellement, le code fait un appel separe a `surface-proxy`. Avec le nouveau format, les donnees sont incluses dans la reponse. Supprimer:

```typescript
// SUPPRIMER ces states et logique:
// const [surfaceResult, setSurfaceResult] = useState<SurfaceApiResponse | null>(null);
// const [surfaceLoading, setSurfaceLoading] = useState(false);
// const [surfaceError, setSurfaceError] = useState<string | null>(null);
```

### 7. Helper pour Extraire Horizons depuis trade_setup

```typescript
function getPayloadHorizonsFromSetup(setup: TradeSetupResponse): ForecastHorizon[] {
  const horizons = setup?.payload?.horizons;
  if (!horizons) return [];
  if (Array.isArray(horizons)) return horizons;
  // Object format
  return Object.entries(horizons).map(([key, val]) => ({
    ...val,
    h: val.h || key,
  }));
}
```

---

## Structure Finale de l'UI

L'interface affichera dans l'ordre:

1. **Form Section** (existant) - Parametres de trading
2. **HTTP Debug Card** (si active) - Payload/Response
3. **AI Market Analysis Card** (NOUVEAU) - Texte `final_answer` + badge `confidence_note`
4. **Tabs Results**:
   - **Trade Setup Tab** (existant) - Market Commentary + Setup Cards (depuis `normalizeN8n`)
   - **Forecast Data Tab** (ameliore):
     - Forecast Summary Table avec Risk Profiles (donnees de `trade_setup`)
     - Risk Surface 3D Chart (donnees de `risk_surface`)

---

## Fichiers Modifies

| Fichier | Modifications |
|---------|---------------|
| `src/pages/ForecastTradeGenerator.tsx` | Ajouter fonctions d'extraction, nouveaux states, mise a jour handleSubmit, nouvelle section AI Analysis, mise a jour tabs |

---

## Garanties

1. **Zero Regression**: Les fonctionnalites existantes (form, debug, trade setup cards) restent intactes
2. **Compatibilite**: Si les champs `trade_setup` ou `risk_surface` sont absents, l'UI affiche gracieusement les donnees disponibles
3. **Pattern Coherent**: L'affichage suit exactement le pattern de ForecastPlaygroundTool pour le Risk Surface et AISetup pour le texte
4. **Donnees Sources Correctes**: `risk_surface` alimente le 3D chart, `trade_setup` alimente le forecast table
