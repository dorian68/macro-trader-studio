

# Plan : Correction du parsing `normalizeN8n` pour gérer les chaînes JSON

## Problème identifié

Le champ `output.final_answer` dans la réponse backend peut être :
1. **Un objet JavaScript** (cas idéal) → fonctionne actuellement
2. **Une chaîne JSON** (cas réel probable) → **ne fonctionne pas**

La ligne 155 du code actuel :
```typescript
if (!maybeContent || typeof maybeContent !== "object") return null;
```

Cette condition rejette les chaînes JSON car `typeof "..." === "string"`, et la fonction retourne `null`.

---

## Solution

### Ajouter une étape de parsing JSON avant la vérification de type

Modifier la fonction `normalizeN8n` pour :
1. Extraire `output.final_answer` (déjà fait)
2. **Si c'est une chaîne, tenter un `JSON.parse()`** (nouveau)
3. Ensuite vérifier si c'est un objet valide

### Code corrigé (lignes 129-173)

```text
function normalizeN8n(raw: unknown): N8nTradeResult | null {
  try {
    let maybeContent: unknown;
    const rawObj = raw as Record<string, unknown>;
    
    // Priority 1: output.final_answer (Trade Generator response format)
    if (rawObj?.output && typeof rawObj.output === "object") {
      const output = rawObj.output as Record<string, unknown>;
      if (output?.final_answer) {
        maybeContent = output.final_answer;
      }
    }
    
    // Fallback paths for other formats
    if (!maybeContent) {
      if (Array.isArray(raw) && (raw[0] as { message?: { content?: unknown } })?.message?.content) {
        maybeContent = (raw[0] as { message: { content: unknown } }).message.content;
      } else if (Array.isArray(raw) && (raw[0] as { content?: unknown })?.content) {
        maybeContent = (raw[0] as { content: unknown }).content;
      } else if (rawObj?.content) {
        maybeContent = rawObj.content;
      } else {
        maybeContent = raw;
      }
    }
    
    // === NOUVEAU : Parser les chaînes JSON ===
    if (typeof maybeContent === "string") {
      try {
        maybeContent = JSON.parse(maybeContent);
      } catch {
        // Si le parsing échoue, ce n'est pas du JSON valide
        return null;
      }
    }
    
    if (!maybeContent || typeof maybeContent !== "object") return null;
    
    const c = maybeContent as Record<string, unknown>;
    const r: N8nTradeResult = {
      instrument: c.instrument as string | undefined,
      asOf: c.asOf as string | undefined,
      market_commentary_anchor: c.market_commentary_anchor as N8nTradeResult["market_commentary_anchor"],
      setups: Array.isArray(c.setups) ? (c.setups as N8nSetup[]) : [],
      disclaimer: (c.disclaimer as string) || "Illustrative ideas, not investment advice.",
    };
    r.setups?.forEach((s) => {
      if (s?.strategyMeta?.confidence != null) {
        s.strategyMeta.confidence = Math.max(0, Math.min(1, Number(s.strategyMeta.confidence)));
      }
    });
    return r;
  } catch {
    return null;
  }
}
```

---

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/ForecastTradeGenerator.tsx` | Ajouter le parsing JSON pour les chaînes (lignes 155-160) |

---

## Flux de données corrigé

```text
Réponse HTTP
    │
    ▼
raw.output.final_answer  ──► string ?
    │                            │
    │                      JSON.parse()
    ▼                            ▼
maybeContent (object)  ◄────────────
    │
    ▼
Extract: instrument, setups, market_commentary_anchor, etc.
    │
    ▼
Afficher dans l'onglet "Trade Setup"
```

---

## Impact

- **Onglet Trade Setup** : affichera correctement les données même si `final_answer` est une chaîne JSON
- **Aucune régression** : le parsing JSON échoue silencieusement si le contenu n'est pas une chaîne
- **Compatibilité maintenue** : les autres formats (objet direct, array n8n) continuent de fonctionner

