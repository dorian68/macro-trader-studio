
# Plan : Instrumentation du macro-lab-proxy pour auditer le job_id

## Contexte

Le frontend `ForecastMacroLab.tsx` injecte correctement le `job_id` dans le payload avant l'envoi HTTP. Pour confirmer que ce dernier traverse bien l'Edge Function `macro-lab-proxy` jusqu'au backend, nous devons ajouter des logs détaillés du contenu du body reçu.

## Problème

Le proxy actuel ne log que la **taille** du body (`bodyBytes`), mais pas son **contenu**. Cela empêche de vérifier si le `job_id` est présent dans la requête.

## Solution proposée

Ajouter un parsing JSON du body dans le proxy pour extraire et logger spécifiquement :
1. Le `job_id` reçu
2. Le `type` de requête
3. L'`instrument` demandé

Cela permettra de tracer dans les logs Supabase Edge Functions si le `job_id` est bien transmis par le frontend.

## Modifications

### Fichier : `supabase/functions/macro-lab-proxy/index.ts`

**Localisation** : Après la ligne 43 (`const body = await req.text();`)

**Ajout** :
```typescript
// Parse body to extract and log critical fields for debugging
let parsedBody: any = null;
let jobIdFromPayload: string | null = null;
let requestType: string | null = null;
let instrument: string | null = null;

try {
  parsedBody = JSON.parse(body);
  jobIdFromPayload = parsedBody?.job_id || null;
  requestType = parsedBody?.type || null;
  instrument = parsedBody?.instrument || null;
} catch (parseError) {
  console.log(`[macro-lab-proxy] body parse failed`, {
    reqId,
    error: parseError instanceof Error ? parseError.message : String(parseError),
    bodyPreview: body.substring(0, 200),
  });
}

console.log(`[macro-lab-proxy] payload inspection`, {
  reqId,
  job_id: jobIdFromPayload,
  job_id_present: !!jobIdFromPayload,
  type: requestType,
  instrument: instrument,
  bodyBytes: body.length,
});
```

**Modification du log existant (ligne 45-49)** :

```typescript
// De:
console.log(`[macro-lab-proxy] forwarding`, {
  reqId,
  target: TARGET_URL,
  bodyBytes: body.length,
});

// À:
console.log(`[macro-lab-proxy] forwarding to backend`, {
  reqId,
  target: TARGET_URL,
  job_id: jobIdFromPayload,
  bodyBytes: body.length,
});
```

**Ajout après réponse upstream (ligne 58-65)** :

```typescript
// Parse upstream response to verify job_id echo
let upstreamJobId: string | null = null;
try {
  const upstreamParsed = JSON.parse(upstreamText);
  // Backend may return job_id at different paths
  upstreamJobId = upstreamParsed?.job_id 
    || upstreamParsed?.message?.job_id 
    || upstreamParsed?.body?.message?.job_id 
    || null;
} catch {
  // Ignore parse errors for response logging
}

console.log(`[macro-lab-proxy] upstream response`, {
  reqId,
  status: upstream.status,
  ms: Date.now() - startedAt,
  upstreamBodyBytes: upstreamText.length,
  job_id_in_response: upstreamJobId,
  job_id_roundtrip: jobIdFromPayload === upstreamJobId ? 'MATCH' : 'MISMATCH',
});
```

## Résumé des logs ajoutés

| Log | Contenu | Objectif |
|-----|---------|----------|
| `payload inspection` | `job_id`, `type`, `instrument` | Vérifier ce que le proxy reçoit |
| `forwarding to backend` | `job_id` + target URL | Confirmer avant transmission |
| `upstream response` | `job_id_in_response`, `job_id_roundtrip` | Vérifier l'écho du backend |

## Utilisation post-déploiement

Après déploiement, consulter les logs via :
1. **Supabase Dashboard** > Edge Functions > `macro-lab-proxy` > Logs
2. Ou via l'outil `supabase--edge-function-logs` avec `function_name: "macro-lab-proxy"`

Rechercher les logs contenant `job_id` pour confirmer la présence ou l'absence du champ dans les requêtes.

## Section technique

### Sécurité
- Les logs n'exposent pas de données sensibles (seulement `job_id`, `type`, `instrument`)
- Le `bodyPreview` en cas d'erreur de parsing est limité à 200 caractères

### Impact performance
- Négligeable : un seul `JSON.parse()` supplémentaire sur le body déjà en mémoire
- Le parsing de la réponse upstream est optionnel (try/catch silencieux)

### Déploiement
- Le fichier sera automatiquement déployé lors du build
- Aucune modification de `config.toml` requise
