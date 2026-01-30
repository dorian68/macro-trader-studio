
# Plan : Instrumentation robuste du job_id pour Macro Lab

## Contexte de l'audit

L'audit a confirmé que :
- **Le code actuel est CORRECT** : `job_id` est inclus dans le payload (ligne 487)
- **La production est désynchronisée** : alphalensai.com exécute une ancienne version sans `job_id`
- **Le preview Lovable fonctionne** : les requêtes contiennent bien le `job_id`

## Objectif du plan

Ajouter une instrumentation robuste pour :
1. Garantir que `job_id` est toujours présent et valide
2. Fournir des logs de diagnostic clairs
3. Améliorer le debug panel avec les données du payload envoyé
4. Prévenir toute régression future

## Modifications proposées

### 1. Validation et logs avant le fetch (`src/pages/ForecastMacroLab.tsx`)

**Localisation** : Après la construction du payload (ligne ~501), avant le fetch (ligne ~580)

```text
Ajouter entre les lignes 501-507 :

// ══════════════════════════════════════════════════════════════
// CRITICAL: Validate job_id before sending request
// ══════════════════════════════════════════════════════════════
if (!responseJobId || typeof responseJobId !== "string") {
  console.error("[MacroLabs] ❌ CRITICAL: job_id is missing or invalid", {
    responseJobId,
    typeofResponseJobId: typeof responseJobId,
  });
  toast({
    title: "Error",
    description: "Job ID missing - cannot send request",
    variant: "destructive",
  });
  setIsGenerating(false);
  setJobStatus("");
  return;
}

// Structured debug log for payload verification
console.debug("[MacroLabs] 📤 Payload before POST", {
  responseJobId,
  payloadJobId: payload.job_id,
  payloadKeys: Object.keys(payload),
  payloadStringified: JSON.stringify(payload).substring(0, 500) + "...",
  timestamp: new Date().toISOString(),
});
```

### 2. Extension du type `lastHttpDebug` pour inclure le payload

**Localisation** : Lignes 102-119

```text
Modifier le type pour ajouter payloadPreview et payloadJobId :

const [lastHttpDebug, setLastHttpDebug] = useState<
  | {
      at: string;
      url: string;
      jobId: string;
      payloadJobId: string;        // ← AJOUT
      payloadPreview: string;      // ← AJOUT
      ok: boolean;
      status: number;
      statusText: string;
      bodyText: string;
    }
  | {
      at: string;
      url: string;
      jobId: string | null;
      payloadJobId: string | null;  // ← AJOUT
      payloadPreview: string | null; // ← AJOUT
      error: string;
    }
  | null
>(null);
```

### 3. Mise à jour de setLastHttpDebug pour inclure le payload

**Localisation** : Lignes 595-603

```text
Modifier le setLastHttpDebug pour inclure les nouvelles données :

setLastHttpDebug({
  at: new Date().toISOString(),
  url: FORECAST_PLAYGROUND_MACRO_WEBHOOK_URL,
  jobId: responseJobId,
  payloadJobId: payload.job_id,                    // ← AJOUT
  payloadPreview: JSON.stringify(payload),         // ← AJOUT
  ok: response.ok,
  status: response.status,
  statusText: response.statusText,
  bodyText,
});
```

### 4. Mise à jour du cas d'erreur setLastHttpDebug

**Localisation** : Lignes 772-780 (dans le catch)

```text
Ajouter les nouveaux champs dans le cas d'erreur aussi :

setLastHttpDebug({
  at: new Date().toISOString(),
  url: FORECAST_PLAYGROUND_MACRO_WEBHOOK_URL,
  jobId: responseJobId,
  payloadJobId: payload?.job_id || null,           // ← AJOUT
  payloadPreview: payload ? JSON.stringify(payload) : null, // ← AJOUT
  error: error instanceof Error ? error.message : String(error),
});
```

### 5. Amélioration du debug panel UI

**Localisation** : Lignes 940-950 (affichage du debug)

```text
Ajouter l'affichage du payload envoyé dans le debug panel :

<div className="flex flex-wrap gap-x-4 gap-y-1">
  <span>at: {lastHttpDebug.at}</span>
  <span>url: {lastHttpDebug.url}</span>
  {lastHttpDebug.jobId ? <span>jobId: {lastHttpDebug.jobId}</span> : null}
  {lastHttpDebug.payloadJobId ? (                   // ← AJOUT BLOC
    <span className="text-green-400">
      payloadJobId: {lastHttpDebug.payloadJobId}
    </span>
  ) : (
    <span className="text-red-400">payloadJobId: MISSING</span>
  )}
  {"status" in lastHttpDebug ? (
    <span>
      status: {lastHttpDebug.status} {lastHttpDebug.statusText}
    </span>
  ) : null}
</div>

{/* Section Payload envoyé */}
{"payloadPreview" in lastHttpDebug && lastHttpDebug.payloadPreview && (
  <Collapsible>
    <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
      <ChevronDown className="h-3 w-3" />
      <span>Payload sent</span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="max-h-[300px] overflow-auto rounded-lg border bg-muted/30 p-3">
        {(() => {
          try {
            const parsed = JSON.parse(lastHttpDebug.payloadPreview);
            return <StyledJsonViewer data={parsed} />;
          } catch {
            return (
              <pre className="whitespace-pre-wrap text-muted-foreground text-xs">
                {lastHttpDebug.payloadPreview}
              </pre>
            );
          }
        })()}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

## Résumé des fichiers modifiés

| Fichier | Modifications |
|---------|--------------|
| `src/pages/ForecastMacroLab.tsx` | Validation job_id, logs debug, extension type lastHttpDebug, affichage payload dans debug panel |

## Garanties

- ✅ **Aucune régression** : la logique métier reste identique
- ✅ **Realtime fallback préservé** : aucun changement sur la mécanique hybride
- ✅ **Validation défensive** : arrêt propre si job_id manquant
- ✅ **Debug visible** : le payload est désormais visible dans le debug panel
- ✅ **Logs structurés** : traçabilité complète avant chaque POST

## Action complémentaire requise

**IMPORTANT** : Après approbation de ce plan, il faudra **publier le code en production** pour que alphalensai.com utilise la version avec le `job_id`. Le code actuel fonctionne déjà correctement dans le preview Lovable.
