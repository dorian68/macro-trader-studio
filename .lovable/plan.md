
# Plan: Ajouter le `job_id` aux requêtes API du Forecast Playground Hub

## Contexte

Les 3 outils du hub Forecast Playground (`/forecast-playground`) envoient des requêtes API sans inclure le champ `job_id` dans le payload. Ce champ est essentiel pour le suivi backend et la synchronisation Realtime via Supabase.

## Problèmes Identifiés

| Page | Fichier | État Actuel |
|------|---------|-------------|
| Macro Lab | `ForecastMacroLab.tsx` | `createJob()` appelé mais `job_id` absent du payload |
| Forecast Tool | `ForecastPlaygroundTool.tsx` | Aucun `job_id` dans les requêtes `forecast-proxy` / `surface-proxy` |
| Trade Generator | `ForecastTradeGenerator.tsx` | Aucun `job_id` dans la requête `macro-lab-proxy` |

## Solution Technique

### 1. Macro Lab (`src/pages/ForecastMacroLab.tsx`)

**Ligne 477-514**: Ajouter le `job_id` au payload avant l'envoi.

```text
Avant:
  const payload = {
    type: "RAG",
    question: queryParams.query,
    mode: "run",
    ...
  };

Après:
  const payload = {
    type: "RAG",
    question: queryParams.query,
    mode: "run",
    job_id: responseJobId,  // <-- AJOUT
    ...
  };
```

**Modification**: Réorganiser le code pour créer le `job_id` AVANT de construire le payload.

### 2. Forecast Tool (`src/pages/ForecastPlaygroundTool.tsx`)

**Lignes 1010-1034 (forecast-proxy)** et **1079-1106 (surface-proxy)**:

Ces outils sont des outils internes "Lab" qui n'utilisent pas le système de jobs standard. Cependant, pour la traçabilité, on peut ajouter un `job_id` généré localement via `uuid.v4()` sans créer d'enregistrement dans la table `jobs`.

```text
import { v4 as uuidv4 } from 'uuid';

// Au début de handleSubmit:
const jobId = uuidv4();

// Dans requestBody pour forecast-proxy:
const requestBody = {
  job_id: jobId,  // <-- AJOUT (traçabilité uniquement)
  symbol,
  timeframe,
  ...
};

// Dans surfacePayload pour surface-proxy:
const surfacePayload = {
  job_id: jobId,  // <-- AJOUT (traçabilité uniquement)
  symbol,
  timeframe,
  ...
};
```

### 3. Trade Generator (`src/pages/ForecastTradeGenerator.tsx`)

**Lignes 1497-1526**: Ajouter le `job_id` au payload.

```text
import { v4 as uuidv4 } from 'uuid';

// Au début de handleSubmit:
const jobId = uuidv4();

// Dans macroPayload:
const macroPayload = {
  job_id: jobId,  // <-- AJOUT
  type: "RAG",
  mode: "trade_generation",
  instrument: symbol,
  ...
};
```

## Détails Techniques

### Fichier: `src/pages/ForecastMacroLab.tsx`

**Modifications (lignes 469-514)**:

1. Déplacer `createJob()` AVANT la construction du payload
2. Ajouter `job_id: responseJobId` dans l'objet payload
3. Le payload sera : `{ type: "RAG", job_id: "<uuid>", question: "...", ... }`

### Fichier: `src/pages/ForecastPlaygroundTool.tsx`

**Modifications**:
1. Ajouter `import { v4 as uuidv4 } from 'uuid';` en haut du fichier
2. Générer `const jobId = uuidv4();` au début de `handleSubmit()`
3. Ajouter `job_id: jobId` dans `requestBody` (ligne ~1010)
4. Ajouter `job_id: jobId` dans `surfacePayload` (ligne ~1079)

### Fichier: `src/pages/ForecastTradeGenerator.tsx`

**Modifications**:
1. Ajouter `import { v4 as uuidv4 } from 'uuid';` en haut du fichier (si absent)
2. Générer `const jobId = uuidv4();` au début de `handleSubmit()`
3. Ajouter `job_id: jobId` dans `macroPayload` (ligne ~1497)

## Structure Finale des Payloads

### Macro Lab
```json
{
  "type": "RAG",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "question": "...",
  "mode": "run",
  "instrument": "EUR/USD",
  ...
}
```

### Forecast Tool (forecast-proxy)
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440001",
  "symbol": "EUR/USD",
  "timeframe": "15min",
  "horizons": [24],
  ...
}
```

### Trade Generator
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440002",
  "type": "RAG",
  "mode": "trade_generation",
  "instrument": "EUR/USD",
  ...
}
```

## Garanties Zero Régression

1. **Aucune modification de la logique d'extraction des réponses** - seul le payload d'envoi est modifié
2. **Les outils Lab restent sans engagement de crédits** - uniquement traçabilité ajoutée
3. **Backward compatible** - si le backend ignore `job_id`, aucun impact
4. **Utilisation de uuid v4** - déjà installé et utilisé dans le projet

## Résumé des Fichiers Modifiés

| Fichier | Lignes Modifiées | Nature |
|---------|------------------|--------|
| `src/pages/ForecastMacroLab.tsx` | ~469-514 | Ajouter `job_id` au payload |
| `src/pages/ForecastPlaygroundTool.tsx` | ~1, ~990-1110 | Import uuid + ajouter `job_id` aux 2 payloads |
| `src/pages/ForecastTradeGenerator.tsx` | ~1, ~1495-1525 | Import uuid + ajouter `job_id` au payload |
