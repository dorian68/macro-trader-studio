
# Suppression d'instruments du Dashboard

## Changement

Retirer 7 instruments de la liste `ALL_ASSETS` dans `src/pages/TradingDashboard.tsx` :

- **Crypto** : `ADA-USD` (Cardano), `SOL-USD` (Solana), `DOGE-USD` (Dogecoin)
- **Commodites** : `CRUDE` (Crude Oil), `NATGAS` (Natural Gas), `COPPER` (Copper), `PLATINUM` (Platinum)

## Liste resultante

| Categorie | Instruments conserves |
|-----------|----------------------|
| Forex | EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF |
| Crypto | Bitcoin, Ethereum |
| Commodites | Gold, Silver |

## Fichier modifie

**`src/pages/TradingDashboard.tsx`** (lignes 46-56)

Avant (lignes 43-57) :
```
  // Crypto majeures
  { symbol: "Bitcoin", name: "Bitcoin", icon: "₿" },
  { symbol: "Ethereum", name: "Ethereum", icon: "Ξ" },
  { symbol: "ADA-USD", name: "Cardano", icon: "🔷" },
  { symbol: "SOL-USD", name: "Solana", icon: "🌞" },
  { symbol: "DOGE-USD", name: "Dogecoin", icon: "🐕" },

  // Commodités principales
  { symbol: "GOLD", name: "Gold", icon: "🥇" },
  { symbol: "SILVER", name: "Silver", icon: "🥈" },
  { symbol: "CRUDE", name: "Crude Oil", icon: "🛢️" },
  { symbol: "NATGAS", name: "Natural Gas", icon: "🔥" },
  { symbol: "COPPER", name: "Copper", icon: "🟤" },
  { symbol: "PLATINUM", name: "Platinum", icon: "⚪" }
```

Apres :
```
  // Crypto majeures
  { symbol: "Bitcoin", name: "Bitcoin", icon: "₿" },
  { symbol: "Ethereum", name: "Ethereum", icon: "Ξ" },

  // Commodités principales
  { symbol: "GOLD", name: "Gold", icon: "🥇" },
  { symbol: "SILVER", name: "Silver", icon: "🥈" }
```

## Ce qui ne change pas

- Macro Lab, AI Setup, Forecast pages : leurs propres listes restent intactes
- AssetSearchBar, HybridSearchBar : inchanges (listes independantes)
- Services (marketDataService, assetMapping, instrument-mappings) : aucune modification
- Layout, logique de selection, WebSocket, API : zero impact

Ce changement est purement declaratif (suppression d'entrees dans un tableau statique). Aucun code ne depend specifiquement de ces symboles dans le dashboard.
