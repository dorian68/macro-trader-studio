

# Bug: Chart Macro Lab ne charge pas — Diagnostic

## Cause racine

Le probleme est un **mismatch de format de symbole** entre la page Macro Lab et le mapping TwelveData.

**Flux actuel:**
1. `ForecastMacroLab.tsx` ligne 1227 passe `selectedAsset.tradingViewSymbol` = `"EURUSD"` au composant `CandlestickChart`
2. `CandlestickChart` passe ce symbole a `LightweightChartWidget`
3. `LightweightChartWidget` appelle `mapToTwelveDataSymbol("EURUSD")` — **pas de match** dans le mapping (qui a `"EUR/USD"` mais pas `"EURUSD"`)
4. Le fallback retourne `"EURUSD"` tel quel
5. L'edge function `fetch-historical-prices` recoit `"EURUSD"`, le mapping centralise ne le reconnait pas non plus
6. TwelveData API rejette `EURUSD` — il veut `EUR/USD`

**Preuve dans les logs:**
```
No exact mapping for "EURUSD", trying as-is: "EURUSD"
TwelveData error: symbol or figi parameter is missing or invalid
```

## Solution

Ajouter les variantes **sans slash** (`EURUSD`, `GBPUSD`, `USDJPY`, etc.) dans le mapping local de `LightweightChartWidget.tsx` ET dans le mapping centralise `instrument-mappings.ts`.

### Fichiers modifies

**1. `src/components/LightweightChartWidget.tsx`** — Ajouter les variantes TradingView-style au mapping local:
```
'EURUSD': 'EUR/USD',
'GBPUSD': 'GBP/USD',
'USDJPY': 'USD/JPY',
'AUDUSD': 'AUD/USD',
'NZDUSD': 'NZD/USD',
'USDCHF': 'USD/CHF',
'EURGBP': 'EUR/GBP',
'EURJPY': 'EUR/JPY',
'USDCAD': 'USD/CAD',
'XAUUSD': 'XAU/USD',
'XAGUSD': 'XAG/USD',
'BTCUSD': 'BTC/USD',
'ETHUSD': 'ETH/USD',
```

**2. `supabase/functions/_shared/instrument-mappings.ts`** — Ajouter les memes variantes au mapping centralise (pour l'edge function):
```
'EURUSD': 'EUR/USD',
'GBPUSD': 'GBP/USD',
'USDJPY': 'USD/JPY',
... etc
```

### Resultat

- Le chart Macro Lab chargera immediatement pour tous les instruments
- Aucun changement de logique cote page — le fix est dans la couche de mapping
- Benefice colateral: toute autre page passant des symboles sans slash fonctionnera aussi

