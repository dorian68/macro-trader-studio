
Objectif: remettre le chart du /dashboard dans un état propre et proche de la capture de référence: sans grilles visibles, pane réellement étendu, candles visuellement ancrées dans toute la zone utile, et sans fallback TradingView parasite.

Diagnostic exact
- Le dashboard ne devrait pas utiliser TradingView en nominal: `TradingDashboard.tsx` force `CandlestickChart` en `forceMode="light"`, donc la cible normale est `LightweightChartWidget`.
- Si tu vois encore du TradingView ou ses grilles, c’est très probablement un fallback silencieux.
- Cause probable du fallback: `TradingDashboard.tsx` passe `asset={selectedAssetProfile ? selectedAssetProfile.symbol : selectedAsset}`. Quand un asset vient de `asset_profiles`, on peut injecter un symbole brut DB/Yahoo non normalisé, que `LightweightChartWidget` mappe mal pour TwelveData, ce qui déclenche `onFallback()` vers `TradingViewWidget`.
- Le pane n’occupe pas visuellement toute la zone car:
  1. `CandlestickChart` garde encore une zone footer “Powered by…” sous le chart
  2. `CardContent` a encore du padding/bottom spacing
  3. `LightweightChartWidget` fait un `fitContent()` simple, mais n’impose pas de `rightOffset` ni de `scaleMargins` fines
  4. la hauteur utile est donc réduite, et le tracé paraît “flottant” au lieu de remplir le conteneur
- La capture jointe montre un chart noir très compact, sans grille visible, avec candles occupant mieux la hauteur et un rendu beaucoup plus “flush” dans la carte.

Ce que je vais corriger
1. Sécuriser la source de symbole sur `/dashboard`
- Ne plus passer `selectedAssetProfile.symbol` brut au chart principal.
- Toujours passer le symbole normalisé de l’app (`selectedAsset`) au `CandlestickChart`.
- Garder `selectedAssetProfile` uniquement pour la recherche / metadata, pas comme source directe du chart.
- Effet attendu: suppression du fallback TradingView involontaire.

2. Forcer le dashboard à rester sur le moteur lightweight
- Dans `CandlestickChart`, rendre le fallback plus strict:
  - sur le dashboard en `forceMode="light"`, ne pas basculer trop vite vers TradingView
  - n’autoriser le fallback qu’en vrai cas d’échec terminal, pas sur simple mismatch temporaire
- Effet attendu: plus de “grilles TradingView” qui réapparaissent après une erreur data.

3. Étendre réellement le pane au conteneur
- Réduire à zéro l’espace perdu sous le chart dans `CandlestickChart`:
  - supprimer ou repositionner la ligne “Powered by…”
  - resserrer `CardContent`
  - garantir que la zone chart prend 100% de la hauteur restante
- Vérifier que le wrapper interne du chart reste en `min-h-0 h-full`.
- Effet attendu: le pane utilisera toute la hauteur disponible sous l’en-tête.

4. Recaler le rendu du lightweight chart pour ressembler à l’ancienne version
- Dans `LightweightChartWidget`:
  - conserver les grilles totalement transparentes
  - affiner `timeScale` avec un `rightOffset` faible et une densité lisible
  - configurer le price scale / visible range pour éviter l’effet “courbe pas centrée”
  - appliquer des `scaleMargins` plus premium pour que les bougies occupent mieux la hauteur
  - garder un fond très sombre uniforme proche de la capture
- Effet attendu: un rendu plus dense, plus “institutional”, sans vide bizarre.

5. Éliminer toute ambiguïté visuelle avec TradingView
- Si le fallback TradingView reste nécessaire en secours, harmoniser encore plus son rendu:
  - aucun grid visible
  - fond aligné au dashboard
  - container full-bleed
- Mais la vraie correction sera d’éviter qu’il soit utilisé sur le dashboard normal.

Fichiers concernés
- `src/pages/TradingDashboard.tsx`
- `src/components/CandlestickChart.tsx`
- `src/components/LightweightChartWidget.tsx`
- éventuellement `src/components/TradingViewWidget.tsx` pour verrouiller le secours visuel

Résultat attendu
- plus de grilles visibles sur le chart du dashboard
- le pane remplit enfin correctement le conteneur sous “Trading Dashboard”
- le chart ressemble beaucoup plus à la capture jointe
- plus de régression sur sélecteur d’actif, timeframe, badges live, colonne droite
- comportement plus stable et plus prévisible, sans fallback TradingView intempestif
