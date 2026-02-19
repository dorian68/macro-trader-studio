

## Probleme identifie : AURA route toutes les requetes vers Macro Commentary

### Diagnostic

En analysant les logs du edge function AURA, le probleme est clair :

- L'utilisateur demande : *"could you generate a trade idea on EUR/USD 15min timeframe?"*
- Le LLM (Gemini 2.5 Flash) appelle : `launch_macro_lab` au lieu de `launch_trade_generator`

Cela se produit systematiquement parce que le LLM ne distingue pas correctement les deux outils.

### Causes racines

1. **Pas d'intercepteur client pour les trades** : Il existe un intercepteur regex cote client (`tryInterceptMacroLab`) qui capture les intentions "macro" avant meme d'appeler le LLM, mais il n'y a PAS d'equivalent pour les requetes de trade. Donc toutes les requetes passent par le LLM, qui se trompe.

2. **Descriptions d'outils trop similaires** : Les descriptions des deux outils sont ambigues pour le LLM — "trade setup" vs "macro commentary" ne sont pas suffisamment differencies.

3. **Le LLM (Gemini Flash) est biaise** : Il choisit systematiquement `launch_macro_lab` comme outil "par defaut" pour toute requete liee aux marches.

### Plan de correction

**1. Ajouter un intercepteur client pour Trade Generator (`src/components/AURA.tsx`)**

Creer une fonction `tryInterceptTradeGenerator` identique en structure a `tryInterceptMacroLab`, mais capturant les intentions de trade :
- Patterns : "trade idea", "trade setup", "generate a trade", "setup for", "AI trade", "idee de trade", "trade sur", "run trade generator", etc.
- Extraction de l'instrument via le meme regex existant
- Extraction optionnelle du timeframe (15min, H1, H4, D1)
- Appel direct de `handleToolLaunch` avec `launch_trade_generator` sans passer par le LLM

Ce fast-path sera place AVANT l'intercepteur macro dans `sendMessage` pour garantir la priorite.

**2. Renforcer les descriptions d'outils dans le edge function (`supabase/functions/aura/index.ts`)**

- `launch_trade_generator` : Ajouter dans la description "Use for: trade idea, trade setup, entry/SL/TP, trade signal. Do NOT use launch_macro_lab for trade requests."
- `launch_macro_lab` : Clarifier "Use ONLY for macro commentary/outlook. NOT for trade setups or entry levels."

**3. Renforcer le system prompt avec des regles de decision explicites**

Ajouter dans la section "DETECT INTENT" une regle de decision plus forte :
- Si le mot "trade" apparait dans la requete (trade idea, trade setup, trade signal) → TOUJOURS utiliser `launch_trade_generator`, JAMAIS `launch_macro_lab`
- `launch_macro_lab` est reserve UNIQUEMENT aux questions de type "what's happening", "macro outlook", "market commentary"

### Section technique

Fichiers modifies :
- `src/components/AURA.tsx` : Nouvelle fonction `tryInterceptTradeGenerator` (~50 lignes), ajout dans `sendMessage` avant `tryInterceptMacroLab`
- `supabase/functions/aura/index.ts` : Descriptions d'outils et system prompt renforces (~15 lignes modifiees)

Aucune regression attendue — les flux existants (macro, report, plot, technical analysis) ne sont pas affectes.

