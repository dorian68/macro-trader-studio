
Je vais corriger la régression en revenant au comportement “anciennement fiable” que le code conserve encore sur d’autres pages.

Constat confirmé dans le code et les logs :
- `TWELVE_DATA_API_KEY` existe bien, mais l’abonnement TwelveData est expiré. Le bug n’est donc pas “secret manquant”, mais une dépendance cassée.
- `/dashboard` et `/macro-lab` forcent aujourd’hui `forceMode="light"` (`TradingDashboard.tsx`, `ForecastMacroLab.tsx`), donc ils passent d’abord par `LightweightChartWidget` même si la config globale en base est déjà `provider = 'tradingview'`.
- `CandlestickChart.tsx` bascule bien en fallback maintenant, mais `LightweightChartWidget.tsx` attend encore 15 secondes avant d’appeler `onFallback()`. Pendant ce délai, l’utilisateur voit l’état cassé (“Failed to load chart data” / chart blanc).
- Le fallback actuel envoie à `TradingViewWidget` un `binanceSymbol`, ce qui n’est pas le bon contrat pour tous les actifs. C’est une source de régression silencieuse.
- `TradingViewWidget.tsx` essaie encore de lire `prices_tv` / `indicators_tv`, alors que ces tables ne contiennent pas les données attendues pour les symboles principaux. Ce préchargement est devenu du bruit et dégrade l’UX, alors que les anciennes pages qui “marchent” utilisent surtout le widget TradingView lui-même.

Plan de correction :
1. Réparer l’orchestrateur du chart dans `src/components/CandlestickChart.tsx`
   - Ne plus imposer TwelveData quand l’app doit afficher TradingView.
   - Faire en sorte que `forceMode="light"` signifie “préférer le lightweight chart”, mais pas “bloquer l’UX si TwelveData est KO”.
   - Réintroduire un comportement cohérent avec la config/provider actif et le fallback réel.

2. Supprimer la latence de fallback dans `src/components/LightweightChartWidget.tsx`
   - Remplacer le `setTimeout(onFallback, 15000)` par un basculement immédiat pour les erreurs fatales TwelveData (abonnement expiré, 401, unsupported/error payload).
   - Éviter l’écran d’erreur bloquant quand une alternative fiable existe.
   - Garder seulement un état de chargement court pour les vrais cas transitoires.

3. Corriger le mapping de symboles
   - Séparer clairement :
     - symbole pour TradingView,
     - symbole pour Binance realtime,
     - symbole pour TwelveData.
   - Ne plus passer `getSymbolForAsset(asset)` au widget TradingView quand ce helper est pensé pour Binance.
   - Mettre le mapping dans un helper central pour éviter de futures divergences.

4. Simplifier `src/components/TradingViewWidget.tsx`
   - Retirer le préfetch bloquant via `prices_tv` / `indicators_tv` du chemin de rendu principal.
   - Charger le widget TradingView immédiatement, comme sur les pages qui conservent encore l’UX stable.
   - Garder au besoin les données Supabase en enrichissement optionnel, mais jamais comme prérequis d’affichage.

5. Harmoniser les pages impactées
   - `src/pages/TradingDashboard.tsx`
   - `src/pages/ForecastMacroLab.tsx`
   - Vérifier que ces pages retrouvent le rendu chart “direct et propre”, sans flash blanc, sans message d’erreur intermédiaire, et avec le bon symbole affiché.

Fichiers à modifier :
- `src/components/CandlestickChart.tsx`
- `src/components/LightweightChartWidget.tsx`
- `src/components/TradingViewWidget.tsx`
- `src/lib/assetMapping.ts` ou un nouveau helper de mapping chart
- possiblement `src/pages/TradingDashboard.tsx`
- possiblement `src/pages/ForecastMacroLab.tsx`

Résultat attendu après correction :
- le graphique s’affiche immédiatement au lieu de passer par un état cassé,
- l’UX redevient proche des anciennes versions stables,
- l’expiration TwelveData ne casse plus le dashboard ni Macro Lab,
- le fallback TradingView devient le comportement propre et invisible pour l’utilisateur,
- les symboles restent justes sur FX, métaux et crypto.

Note importante :
- Je peux corriger la régression UX côté code sans attendre.
- Si vous voulez réactiver ensuite le lightweight chart TwelveData “comme avant”, il faudra quand même renouveler TwelveData, mais cela ne doit plus jamais casser l’interface.
