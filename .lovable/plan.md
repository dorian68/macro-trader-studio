
# Plan: Corriger l'extraction du champ "content" pour le Macro Lab

## Diagnostic Final

La réponse API a cette structure exacte (confirmée par les network logs) :

```
body.message.message.content.content = "{\"content\": \"## Executive Summary...\\n...\", \"request\": {...}}"
```

Le champ `content.content` est une **string JSON** qui doit être parsée. Une fois parsée, elle contient :
```json
{
  "content": "## Executive Summary\nThe current macroeconomic...",
  "request": { "user_query": "...", ... }
}
```

Le vrai contenu textuel à afficher est dans `parsedObject.content` (le texte Markdown).

## Problème Actuel

Le code actuel (lignes 560-566) détecte que `content2` est une string, mais au lieu de parser cette string JSON pour extraire le champ `content` interne, il la passe telle quelle à `handleRealtimeResponse`. Le résultat : tout le JSON est affiché au lieu du contenu formaté.

## Solution

Modifier le code d'extraction (lignes 560-566) pour :
1. Parser la string JSON quand `content2` est une string
2. Extraire le champ `.content` de l'objet parsé
3. Passer uniquement ce contenu textuel à `handleRealtimeResponse`

### Fichier: `src/pages/ForecastMacroLab.tsx`

#### Modification des lignes 560-567

**Code actuel :**
```typescript
if (content2 != null) {
  if (typeof content2 === "string") {
    extractedContent = content2;
  } else if (typeof content2 === "object") {
    extractedContent = JSON.stringify(content2, null, 2);
  }
  console.log("✅ [HTTP] Extracted content via path: body.message.message.content.content");
}
```

**Nouveau code :**
```typescript
if (content2 != null) {
  if (typeof content2 === "string") {
    // content2 is a JSON string that contains { "content": "...", "request": {...} }
    // Parse it and extract the inner "content" field
    try {
      const innerParsed = JSON.parse(content2);
      if (innerParsed && typeof innerParsed === "object" && innerParsed.content) {
        extractedContent = innerParsed.content;
        console.log("✅ [HTTP] Extracted inner content field from JSON string");
      } else {
        extractedContent = content2;
      }
    } catch {
      // Not valid JSON, use as-is
      extractedContent = content2;
    }
  } else if (typeof content2 === "object") {
    // Already an object, extract the content field if present
    const contentObj = content2 as Record<string, unknown>;
    if (contentObj.content && typeof contentObj.content === "string") {
      extractedContent = contentObj.content;
    } else {
      extractedContent = JSON.stringify(content2, null, 2);
    }
  }
  console.log("✅ [HTTP] Extracted content via path: body.message.message.content.content");
}
```

#### Appliquer la même logique aux Paths 2 et 3

Les mêmes modifications doivent être appliquées :
- **Path 2** (lignes 577-584) : `message.content.content`
- **Path 3** (lignes 597-604) : `[0].message.message.content.content`

## Résumé des Modifications

| Lignes | Changement |
|--------|------------|
| 560-567 | Parser la string JSON et extraire le champ `.content` interne (Path 1) |
| 577-584 | Même logique pour Path 2 |
| 597-604 | Même logique pour Path 3 |

## Garanties Zero Régression

1. **Try/catch** : Si le parsing échoue, le contenu brut est conservé
2. **Vérification de structure** : Ne modifie que si le champ `content` existe dans l'objet parsé
3. **HTTP Debug** : Le panneau debug continue d'afficher le JSON brut complet (non impacté)
4. **Autres pages** : Aucune modification

## Résultat Attendu

Au lieu de voir le JSON complet avec `content`, `request`, etc., l'utilisateur verra les cartes formatées :
- **Executive Summary** avec le résumé textuel
- **Fundamental Analysis** avec les bullet points
- **Directional Bias** avec badge Bullish/Bearish + confiance %
- **Key Levels** avec Support (vert) et Resistance (rouge)
