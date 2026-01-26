

# Plan : Correction du parsing des données Trade Setup

## Probleme identifie
Les donnees AI Setup (onglet "Trade Setup") se trouvent dans le champ `result["output"]["final_answer"]` de la reponse brute, et non a la racine du JSON.

La fonction `normalizeN8n` actuelle cherche les donnees a la racine, ce qui explique pourquoi l'onglet reste vide.

## Solution

### Modification de la fonction `normalizeN8n` (lignes 129-158)
Ajouter un nouveau chemin de recherche pour extraire les donnees depuis `output.final_answer` :

```text
function normalizeN8n(raw: unknown): N8nTradeResult | null {
  try {
    let maybeContent: unknown;
    
    // NOUVEAU PATH : result.output.final_answer
    const rawObj = raw as Record<string, unknown>;
    if (rawObj?.output && typeof rawObj.output === "object") {
      const output = rawObj.output as Record<string, unknown>;
      if (output?.final_answer) {
        maybeContent = output.final_answer;
      }
    }
    
    // Paths existants (fallback)
    if (!maybeContent) {
      if (Array.isArray(raw) && raw[0]?.message?.content) {
        maybeContent = raw[0].message.content;
      } else if (Array.isArray(raw) && raw[0]?.content) {
        maybeContent = raw[0].content;
      } else if (rawObj?.content) {
        maybeContent = rawObj.content;
      } else {
        maybeContent = raw;
      }
    }
    
    // ... reste du parsing inchange
  }
}
```

### Ordre de priorite des chemins
1. `data.output.final_answer` (nouveau - prioritaire pour Trade Generator)
2. `data[0].message.content` (format n8n standard)
3. `data[0].content` (format alternatif)
4. `data.content` (format direct)
5. `data` (racine brute)

## Fichier a modifier
- `src/pages/ForecastTradeGenerator.tsx` : Mise a jour de la fonction `normalizeN8n` (lignes 129-158)

## Impact
- **Zero regression** : Les paths existants restent en fallback
- **Onglet Trade Setup** : Affichera les setups depuis `output.final_answer`
- **Onglet Forecast Data** : Inchange (utilise `getPayloadHorizons`)

