

# Fix: Affichage JSON dans History + Query dans Macro Lab

## Diagnostic

Le probleme vient de la chaine d'extraction des donnees. Voici ce qui se passe :

1. `deepExtractContent` extrait correctement le contenu profondement imbrique de `response_payload`, mais retourne une **chaine JSON** (ex: `{"content": "Executive Summary\n...", "fundamentals": [...], "citations_news": [...]}`)
2. Dans `renderFormattedResponse`, le check `typeof response === 'string'` est vrai, donc `renderPlainTextMacro(response)` est appele avec la **chaine JSON brute** au lieu du texte
3. Le resultat : le JSON s'affiche comme du texte brut dans les cartes

De plus, les donnees contiennent des champs riches (`fundamentals`, `citations_news`, `market_data`) qui ne sont jamais exploites.

## Plan de correction

### Fichier : `src/components/AIInteractionHistory.tsx`

### 1. Corriger `renderFormattedResponse` pour Macro Commentary

Dans le bloc `feature === 'Macro Commentary'` (lignes 531-554), ajouter un parsing de la chaine JSON **avant** de decider quel rendu utiliser :

```
if (typeof response === 'string') {
  // Tenter de parser comme JSON (cas macro_lab)
  try {
    const parsed = JSON.parse(response);
    if (parsed.content && typeof parsed.content === 'string') {
      // C'est le format macro_lab : {content, fundamentals, citations_news, ...}
      return renderMacroLabResult(parsed);
    }
  } catch {}
  // Sinon c'est du texte brut
  return renderPlainTextMacro(response);
}
```

### 2. Creer `renderMacroLabResult(parsed)` -- template structure

Nouveau rendu qui exploite le JSON complet :

- **Contenu principal** : parser `parsed.content` en sections via `parseMacroTextSections` et les afficher dans des cartes avec bordures colorees (identique a `renderPlainTextMacro` actuel)
- **Fundamentals** (si `parsed.fundamentals` existe et non vide) : tableau compact avec colonnes Indicator / Actual / Consensus / Previous, badges colores pour les surprises (vert si actual > consensus, rouge sinon)
- **News / Citations** (si `parsed.citations_news` existe) : liste avec publisher en badge + titre en texte, max 5 items dans un conteneur scrollable
- **Query d'origine** (si `parsed.request?.query` existe) : affichee discretement sous le titre en italique muted

### 3. Corriger `extractItemTitle` pour le cas macro string-JSON

Actuellement l'extraction du titre echoue car elle fait un regex sur la chaine JSON au lieu du contenu textuel. Ajouter un parsing JSON :

```
if (typeof response === 'string') {
  try {
    const parsed = JSON.parse(response);
    if (parsed.content) {
      const match = parsed.content.match(INSTRUMENT_REGEX);
      if (match) return `${match[1]} Macro Analysis`;
    }
    if (parsed.request?.query) {
      const match = parsed.request.query.match(INSTRUMENT_REGEX);
      if (match) return `${match[1]} Macro Analysis`;
    }
  } catch {}
  // Fallback regex sur string brute
  const match = response.match(INSTRUMENT_REGEX);
  if (match) return `${match[1]} Macro Analysis`;
}
```

### 4. Corriger `extractSummary` pour le cas macro string-JSON

Meme logique : parser le JSON pour extraire un resume depuis `parsed.content` au lieu de montrer le debut du JSON brut.

### Ce qui ne change PAS

- Le rendu des Reports (HTML) fonctionne correctement
- Le rendu des AI Trade Setup fonctionne correctement
- La page Macro Lab (deja corrigee au message precedent)
- La pagination, les filtres, le refresh
- Les composants `TradeSetupDisplay`, `MacroCommentaryDisplay`
- La structure de la page `History.tsx`

### Template visuel du rendu Macro Lab dans History (expanded)

```text
Card (border-l-4 primary)
  "Executive Summary"
  Texte du resume...

Card
  "Fundamental Analysis" 
  Points en liste...

Card
  "AI Insights Breakdown"
  Texte...

Card (si fundamentals disponibles)
  "Key Economic Data"
  Tableau : Indicator | Actual | Consensus | Previous
  (avec badges colores pour surprises)

Card (si citations_news disponibles)  
  "Market News"
  Liste : [Publisher badge] Titre de l'article
```

