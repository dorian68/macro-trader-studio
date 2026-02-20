

## Forcer le mode "Dashboard Light" partout sauf dans AURA

### Contexte actuel

- La page Admin contient 3 sections de configuration de charts :
  1. **ChartProviderSettings** : choix global `twelvedata` vs `tradingview`
  2. **ChartDisplaySettings** : options d'affichage (grid, volume, etc.)
  3. **Dashboard Chart Mode (Testing)** : toggle session `tradingview` / `light`
- Le `TradingDashboard` lit `sessionStorage('dashboard_chart_mode')` et passe ca en `forceMode` au `CandlestickChart`
- Le `CandlestickChart` lit aussi le provider global depuis `chart_provider_settings` en base
- La page `ForecastMacroLab` force `darkTheme` manuellement

### Ce qui va changer

1. **Supprimer les 3 sections chart de la page Admin** : `ChartProviderSettings`, `ChartDisplaySettings`, et le toggle "Dashboard Chart Mode (Testing)"

2. **Forcer `forceMode="light"` en dur dans `TradingDashboard`** au lieu de lire `sessionStorage`

3. **Forcer `forceMode="light"` dans `ForecastMacroLab`** (qui utilise actuellement `forceMode="tradingview"` + `darkTheme`)

4. **Ne pas toucher a AURA** : AURA utilise son propre `MarketChartWidget` base sur `lightweight-charts`, pas TradingView. Aucune modification necessaire.

5. **Supprimer la lecture de `chart_provider_settings` dans `CandlestickChart`** : plus besoin de consulter la base puisque le mode est toujours `light`

### Details techniques

**`src/pages/TradingDashboard.tsx`**
- Supprimer le state `sessionChartMode` et la lecture de `sessionStorage`
- Remplacer `forceMode={sessionChartMode}` par `forceMode="light"` aux 2 endroits

**`src/pages/ForecastMacroLab.tsx`**
- Changer `forceMode="tradingview"` en `forceMode="light"`
- Retirer `darkTheme` (le mode light n'utilise pas de theme sombre)

**`src/components/CandlestickChart.tsx`**
- Supprimer le `useEffect` qui fetch `chart_provider_settings` (lignes 134-143)
- Supprimer les states `globalProvider` et le fallback logic associe
- Simplifier : quand `forceMode="light"`, toujours utiliser `LightweightChartWidget`

**`src/pages/Admin.tsx`**
- Retirer l'import et le rendu de `ChartProviderSettings`
- Retirer l'import et le rendu de `ChartDisplaySettings`
- Retirer le bloc "Dashboard Chart Mode (Testing)" et le state `sessionDashboardMode`
- Retirer l'onglet "chart-provider" du TabsList si c'est le seul contenu

### Ce qui ne change pas

- AURA conserve son theme sombre Bloomberg-style avec `MarketChartWidget`
- Les `DisplayOptions` (grid, volume, etc.) restent fonctionnelles via les props, simplement plus configurables depuis l'admin
- Le composant `TradingViewWidget` reste disponible dans le code (pourrait servir de fallback) mais ne sera plus utilise par defaut
- Aucune modification de base de donnees requise

