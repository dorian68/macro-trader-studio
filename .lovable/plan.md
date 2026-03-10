
## Audit et correction du widget chart (LightweightChartWidget)

### Probleme identifie

L'erreur en console est :
```
Cannot update oldest data, last time=[object Object], new time=[object Object]
```

Elle vient de `LightweightChartWidget.tsx` (lignes 595-606). A chaque tick WebSocket, le code remplace le `time` de la derniere bougie par `Math.floor(Date.now() / 1000)`. Cela pose deux problemes :

1. **Temps anterieur** : le nouveau timestamp peut etre anterieur au dernier point historique (ex: la derniere bougie 4h couvre 23:00-03:00 mais le tick arrive a 21:46), ce qui fait que `lightweight-charts` refuse la mise a jour.
2. **Temps en objet** : apres le spread `...lastCandleRef.current`, le champ `time` peut devenir un objet interne de lightweight-charts au lieu d'un nombre, causant `[object Object]`.

### Solution

**Fichier : `src/components/LightweightChartWidget.tsx`**

**Correction 1 -- Garder le time de la derniere bougie lors des updates WebSocket (lignes 595-606)**

Au lieu de remplacer `time` par `Date.now()`, on conserve le `time` de la derniere bougie historique. On ne cree une nouvelle bougie que lorsqu'on passe dans une nouvelle periode temporelle.

```text
AVANT (ligne 597-603):
const updatedCandle = {
  ...lastCandleRef.current,
  time: timestamp,
  close: price,
  high: Math.max(lastCandleRef.current.high, price),
  low: Math.min(lastCandleRef.current.low, price),
};

APRES:
// Conserver le time de la derniere bougie pour eviter "Cannot update oldest data"
const lastTime = lastCandleRef.current.time;
const updatedCandle: CandlestickData = {
  time: lastTime as UTCTimestamp,
  open: lastCandleRef.current.open,
  close: price,
  high: Math.max(lastCandleRef.current.high, price),
  low: Math.min(lastCandleRef.current.low, price),
};
```

Cela corrige les deux bugs : on ne spread plus l'objet (evitant les champs internes de lightweight-charts) et on garde le meme `time`.

**Correction 2 -- Meme fix pour le handler Binance (lignes 494-503)**

Le meme pattern est utilise dans le fallback Binance WebSocket :

```text
AVANT (ligne 495-501):
const updatedCandle: CandlestickData = {
  ...lastCandleRef.current,
  time: Math.floor(Date.now() / 1000) as UTCTimestamp,
  close: price,
  high: Math.max(lastCandleRef.current.high, price),
  low: Math.min(lastCandleRef.current.low, price),
};

APRES:
const updatedCandle: CandlestickData = {
  time: lastCandleRef.current.time as UTCTimestamp,
  open: lastCandleRef.current.open,
  close: price,
  high: Math.max(lastCandleRef.current.high, price),
  low: Math.min(lastCandleRef.current.low, price),
};
```

### Ce qui ne change PAS
- La logique de chargement des donnees historiques
- La connexion/reconnexion WebSocket et le backoff
- Le cache localStorage
- L'initialisation du chart (mount unique)
- Le fallback TradingView
- Les autres composants (MacroAnalysis, TradingViewWidget, etc.)

### Details techniques

Le pattern "update oldest data" est une protection de `lightweight-charts` v5 : on ne peut pas appeler `series.update()` avec un `time` strictement inferieur au dernier point existant. En gardant le `time` de la derniere bougie, chaque `update()` met a jour la bougie courante en place, ce qui est le comportement attendu pour le prix live.
