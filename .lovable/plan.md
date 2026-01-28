
# Plan : Ajouter le champ `question` généré automatiquement dans Trade Generator

## ✅ IMPLÉMENTÉ

## Analyse du problème

L'API à `http://3.137.115.96:9000/run` (via `macro-lab-proxy`) exige un champ `question` dans le payload. Actuellement, le Trade Generator n'envoie pas ce champ, ce qui provoque l'erreur `{"error": "'question'"}`.

## Solution

Appliquer le même pattern que la page AI Setup :
1. Créer une fonction `buildQuestion()` qui génère une question structurée à partir des paramètres du formulaire
2. Modifier le payload pour inclure `type: "RAG"`, `mode: "run"` (au lieu de `"trade_generation"`) et le champ `question`

---

## Modifications techniques

### Fichier : `src/pages/ForecastTradeGenerator.tsx`

#### 1. Ajouter la fonction `buildQuestion` (avant le composant principal)

```typescript
function buildQuestion(p: {
  instrument: string;
  timeframe: string;
  riskLevel: string;
  strategy: string;
  customNotes: string;
  horizons: number[];
}) {
  const lines = [
    `Provide an institutional macro outlook and risks for ${p.instrument}, then a macro-grounded trade idea (entry/SL/TP).`,
    `Prioritize central banks / Bloomberg / Reuters; ignore low-authority sources unless they synthesize institutional research.`,
    `Focus on policy divergence, inflation, growth, labor, real yields, financial conditions.`,
    `Use technicals only to refine entries after macro.`
  ];
  if (p?.timeframe) lines.push(`User timeframe: ${p.timeframe}.`);
  if (p?.riskLevel) lines.push(`User risk: ${p.riskLevel}.`);
  if (p?.strategy) lines.push(`Strategy: ${p.strategy}.`);
  if (p?.horizons?.length) lines.push(`Forecast horizons: ${p.horizons.join(', ')} hours.`);
  if (p?.customNotes) lines.push(`Note: ${p.customNotes}.`);
  return lines.join(' ');
}
```

#### 2. Modifier le payload dans `handleSubmit`

Remplacer le payload actuel par :

```typescript
const macroPayload = {
  type: "RAG",
  mode: "run",
  instrument: symbol,
  question: buildQuestion({
    instrument: symbol,
    timeframe,
    riskLevel,
    strategy,
    customNotes,
    horizons: parsedHorizons
  }),
  user_email: null,
  isTradeQuery: true,
  timeframe: timeframe,
  riskLevel: riskLevel,
  strategy: strategy,
  customNotes: customNotes,
  horizons: parsedHorizons,
  use_montecarlo: useMonteCarlo,
  ...(useMonteCarlo && { paths: 1000, skew: monteCarloSkew })
};
```

---

## Payload final envoyé

```json
{
  "type": "RAG",
  "mode": "run",
  "instrument": "EUR/USD",
  "question": "Provide an institutional macro outlook and risks for EUR/USD, then a macro-grounded trade idea (entry/SL/TP). Prioritize central banks / Bloomberg / Reuters; ignore low-authority sources unless they synthesize institutional research. Focus on policy divergence, inflation, growth, labor, real yields, financial conditions. Use technicals only to refine entries after macro. User timeframe: 15min. User risk: medium. Strategy: breakout. Forecast horizons: 24, 48, 72 hours.",
  "user_email": null,
  "isTradeQuery": true,
  "timeframe": "15min",
  "riskLevel": "medium",
  "strategy": "breakout",
  "customNotes": "",
  "horizons": [24, 48, 72],
  "use_montecarlo": true,
  "paths": 1000,
  "skew": 0.5
}
```

---

## Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `src/pages/ForecastTradeGenerator.tsx` | Ajout fonction `buildQuestion`, modification payload avec `type: "RAG"`, `mode: "run"`, `question` |

---

## Garantie de compatibilité

- Le format est identique à celui de la page AI Setup qui fonctionne
- Le champ `question` est généré dynamiquement à partir de tous les paramètres du formulaire
- Les paramètres Monte Carlo sont conservés pour les fonctionnalités futures
