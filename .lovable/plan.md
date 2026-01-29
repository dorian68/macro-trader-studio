
# Plan: Parser le contenu textuel en structure pour MacroCommentaryDisplay

## Diagnostic Complet

L'API retourne un champ `content` qui est une **chaîne de texte** contenant les informations (pas un objet JSON structuré):

```
"content": "Executive Summary: The current market outlook... \n\nFundamental Analysis: \n- The U.S. trade deficit... \n\nDirectional Bias: Bullish, Confidence: \"60%\" \n\nKey Levels: \nSupport: \n1.1600 ..."
```

Le composant `MacroCommentaryDisplay` attend un **objet** avec des clés comme:
```json
{
  "executive_summary": "...",
  "fundamental_analysis": ["...", "..."],
  "directional_bias": "Bullish",
  "confidence": 60,
  "key_levels": { "support": [...], "resistance": [...] }
}
```

**Il faut donc parser le texte pour extraire ces sections et construire l'objet attendu.**

---

## Solution Technique

### Fichier: `src/pages/ForecastMacroLab.tsx`

#### 1. Créer une fonction de parsing du texte vers un objet structuré

Ajouter une nouvelle fonction `parseMacroContentToStructured` qui:
- Détecte les sections par leurs titres ("Executive Summary:", "Fundamental Analysis:", etc.)
- Extrait le contenu de chaque section
- Retourne un objet structuré compatible avec `MacroCommentaryDisplay`

```typescript
const parseMacroContentToStructured = (textContent: string): object | null => {
  if (!textContent || typeof textContent !== 'string') return null;
  
  const result: any = {};
  
  // Extract Executive Summary
  const execMatch = textContent.match(/Executive Summary:\s*([^]*?)(?=\n\n|\nFundamental Analysis:|$)/i);
  if (execMatch) {
    result.executive_summary = execMatch[1].trim();
  }
  
  // Extract Fundamental Analysis (bullet points)
  const fundMatch = textContent.match(/Fundamental Analysis:\s*([^]*?)(?=\n\nDirectional Bias:|$)/i);
  if (fundMatch) {
    const points = fundMatch[1].split(/\n-\s*/).filter(p => p.trim());
    result.fundamental_analysis = points.map(p => p.trim().replace(/^-\s*/, ''));
  }
  
  // Extract Directional Bias and Confidence
  const biasMatch = textContent.match(/Directional Bias:\s*(\w+),?\s*Confidence:\s*"?(\d+)%?"?/i);
  if (biasMatch) {
    result.directional_bias = biasMatch[1];
    result.confidence = parseInt(biasMatch[2], 10);
  }
  
  // Extract Key Levels
  const supportMatch = textContent.match(/Support:\s*\n([\d.\s\n]+?)(?=Resistance:|$)/i);
  const resistanceMatch = textContent.match(/Resistance:\s*\n([\d.\s\n]+?)(?=\n\n|AI Insights|$)/i);
  if (supportMatch || resistanceMatch) {
    result.key_levels = {
      support: supportMatch ? supportMatch[1].trim().split('\n').filter(l => l.trim()) : [],
      resistance: resistanceMatch ? resistanceMatch[1].trim().split('\n').filter(l => l.trim()) : []
    };
  }
  
  // Extract AI Insights
  const gptMatch = textContent.match(/Toggle GPT:\s*([^]*?)(?=Toggle Curated:|Fundamentals:|$)/i);
  const curatedMatch = textContent.match(/Toggle Curated:\s*([^]*?)(?=\n\nFundamentals:|$)/i);
  if (gptMatch || curatedMatch) {
    result.ai_insights_breakdown = {
      toggle_gpt: gptMatch ? gptMatch[1].trim() : null,
      toggle_curated: curatedMatch ? curatedMatch[1].trim() : null
    };
  }
  
  return Object.keys(result).length > 0 ? result : null;
};
```

#### 2. Modifier `handleRealtimeResponse` pour utiliser ce parser

Après avoir extrait `parsedContent`, vérifier si le champ `content` est une string textuelle et la parser:

```typescript
// Si parsedContent.content est une string (texte brut), la parser en structure
if (parsedContent && typeof parsedContent === "object" && typeof parsedContent.content === "string") {
  const structuredData = parseMacroContentToStructured(parsedContent.content);
  if (structuredData) {
    analysisContent = structuredData;
    console.log("✅ [Realtime] Parsed text content to structured object:", structuredData);
  } else {
    // Fallback: garder la string brute
    analysisContent = parsedContent.content;
  }
} else if (parsedContent && typeof parsedContent === "object") {
  analysisContent = parsedContent;
} else {
  analysisContent = extractStringContent(rawContent);
}
```

---

## Résumé des Modifications

| Localisation | Changement |
|--------------|------------|
| Après ligne ~145 | Ajouter fonction `parseMacroContentToStructured()` |
| Lignes 203-212 | Modifier la logique pour détecter et parser les strings textuelles |

---

## Garanties Zero Régression

1. **Fallback robuste** : Si le parsing échoue, le contenu textuel brut est affiché
2. **Détection intelligente** : Ne parse que si `content` est une string (pas un objet déjà structuré)
3. **Composant inchangé** : `MacroCommentaryDisplay` reste identique
4. **Autres pages** : Aucune modification

---

## Résultat Attendu

Au lieu d'afficher le JSON brut:
```json
{
  "content": "Executive Summary: The current market...",
  "request": {...},
  ...
}
```

L'utilisateur verra des cartes formatées:
- **Executive Summary** : Résumé textuel
- **Fundamental Analysis** : Liste à puces
- **Directional Bias** : Badge Bullish/Bearish + Confidence 60%
- **Key Levels** : Grille Support (vert) / Resistance (rouge)
- **AI Insights** : Sections dépliables GPT et Curated
