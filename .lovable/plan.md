

# Enrichissement AI Trade Setup dans History + Mode Fullscreen

## 1. Template riche pour AI Trade Setup (dans History)

### Probleme
Actuellement, `deepExtractContent` extrait le champ `trade_setup` du payload mais ignore le `final_answer` qui contient toutes les donnees riches (instrument, setups avec context/riskNotes, decision_summary, market_commentary_anchor, data_fresheners). Le rendu se limite a `TradeSetupDisplay` avec des champs basiques.

### Solution
Ajouter un nouveau chemin d'extraction dans `deepExtractContent` pour parser le `final_answer` (chaine JSON) et retourner un objet type `_type: 'full_trade_setup'`. Puis creer une fonction `renderFullTradeSetup` qui affiche :

```text
Card (border-l-4 yellow)
  Header: "XAU/USD" + Badge direction (SHORT/LONG) + Badge timeframe
  Sous-titre: strategy + horizon

Card "Trade Levels"
  Grid: Entry | Stop Loss | Take Profits (colores)
  Risk:Reward + Confidence badges

Card "Decision Summary" (via DecisionSummaryCard existant)
  Alignment, verdict, narrative, key_risks, next_step

Card "Market Commentary" (si disponible)
  Summary du market_commentary_anchor
  Key drivers en liste

Card "Data Fresheners" (si disponible)
  Tabs ou sections: Macro Recent | Upcoming | CB Signals | Positioning

Card "Risk Management Calculator" (collapsible, via PNLCalculator existant)
```

### Fichier : `src/components/AIInteractionHistory.tsx`

**Modifications :**

1. **`deepExtractContent`** : Ajouter un chemin avant le trade_setup actuel pour extraire `final_answer` :
   - Lire `payload.body.message.message.content.content.final_answer`
   - Si c'est une string, `JSON.parse()` et retourner `{ _type: 'full_trade_setup', ...parsed }`
   - Sinon fallback au chemin trade_setup existant

2. **Nouvel import** : `DecisionSummaryCard` depuis `@/components/DecisionSummaryCard`

3. **Nouvelle fonction `renderFullTradeSetup(data)`** : ~120 lignes, affiche le template structure ci-dessus avec :
   - Header avec instrument, direction badge, timeframe, strategy
   - Trade levels (entry, SL, TPs) dans une grille coloree
   - `DecisionSummaryCard` si `decision_summary` presente
   - Market commentary card si `market_commentary_anchor` presente
   - Data fresheners sections si presentes
   - PNLCalculator en collapsible

4. **`renderFormattedResponse`** bloc AI Trade Setup : ajouter `if (response?._type === 'full_trade_setup')` avant le chemin `trade_setup_parsed` existant

5. **`extractItemTitle`** : ajouter extraction depuis `response?.instrument` + `response?.setups?.[0]?.direction` pour le type `full_trade_setup`

6. **`extractSummary`** : ajouter extraction depuis `response?.setups?.[0]` pour le type `full_trade_setup`

---

## 2. Mode Fullscreen

### Fonctionnalite
Un bouton sur chaque carte de l'historique permet d'ouvrir le contenu en plein ecran dans un overlay avec fond floute.

### Implementation

**Dans `AIInteractionHistory.tsx` :**

1. **Nouvel etat** : `const [fullscreenItem, setFullscreenItem] = useState<AIInteraction | null>(null)`

2. **Bouton fullscreen** : icone `Maximize2` positionnee en haut a droite de chaque carte (a cote du chevron), avec `onClick={(e) => { e.stopPropagation(); setFullscreenItem(interaction); }}`

3. **Overlay fullscreen** : un `Dialog` Radix (deja importe dans le projet) utilise en mode plein ecran :
   - Overlay avec `backdrop-blur-md bg-black/60` (fond floute)
   - Contenu positionne en `fixed inset-4 sm:inset-8` avec `z-[10004]` (au-dessus du dialog standard a `z-[10003]`)
   - ScrollArea pour le contenu scrollable
   - Header avec titre + badge feature + bouton fermer (X)
   - Corps : appel a `renderFormattedResponse(fullscreenItem)` -- reutilise exactement le meme rendu

4. **Fermeture** : clic sur overlay, bouton X, touche Escape

### Ce qui ne change PAS
- `TradeSetupDisplay`, `MacroCommentaryDisplay`, `DecisionSummaryCard` restent intacts
- Le rendu Macro Commentary et Report existants
- La pagination, filtres, refresh
- La structure de `History.tsx`

