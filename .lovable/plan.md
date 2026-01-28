
# Plan : Intégrer l'appel à `macro-lab-proxy` dans le Trade Generator

## Statut : ✅ IMPLÉMENTÉ

## Analyse

### Situation actuelle
- L'edge function `macro-lab-proxy` existe et cible `http://3.137.115.96:9000/run`
- Le Trade Generator appelle maintenant :
  1. `forecast-proxy` (prédictions quantitatives)
  2. `surface-proxy` (surface de risque 3D)
  3. `macro-lab-proxy` (AI Trade Setups) ← **NOUVEAU**

---

## Modifications effectuées

### Fichier : `src/pages/ForecastTradeGenerator.tsx`

1. **Constante URL ajoutée** (ligne 68)
   ```typescript
   const MACRO_LAB_PROXY_URL = "https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/macro-lab-proxy";
   ```

2. **États AI Setup ajoutés** (lignes 821-822)
   ```typescript
   const [aiSetupLoading, setAiSetupLoading] = useState(false);
   const [aiSetupError, setAiSetupError] = useState<string | null>(null);
   ```

3. **Appel macro-lab-proxy dans handleSubmit** (après surface-proxy)
   - Payload avec `mode: "trade_generation"` (CRITIQUE)
   - Contexte forecast inclus (entry_price, direction, horizons)
   - Parsing via `normalizeN8n()` existant

4. **UI Trade Setup mise à jour**
   - État de chargement avec `Loader2`
   - Affichage erreur avec `Alert variant="destructive"`
   - Affichage résultats avec `TradeSetupCard`
   - Fallback info si pas de données

---

## Payload envoyé à macro-lab-proxy

```json
{
  "mode": "trade_generation",
  "type": "trade_setup",
  "instrument": "EUR/USD",
  "timeframe": "15min",
  "horizons": [24],
  "riskLevel": "medium",
  "strategy": "breakout",
  "customNotes": "",
  "forecast_context": {
    "entry_price": 1.0845,
    "direction": "long",
    "horizons": [
      { "h": "24h", "tp": 1.0892, "sl": 1.0810, "direction": "long" }
    ]
  }
}
```

---

## Garantie de non-régression

- ✅ Appel `forecast-proxy` inchangé (Step 1)
- ✅ Appel `surface-proxy` inchangé (Step 2)
- ✅ Nouvel appel `macro-lab-proxy` additionnel (Step 3)
- ✅ Fonction `normalizeN8n` réutilisée
- ✅ Aucune modification des autres pages
