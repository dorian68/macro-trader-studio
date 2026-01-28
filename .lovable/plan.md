

# Plan: Améliorer le Styling du Debug HTTP

## Contexte

Actuellement, les deux pages affichent le debug HTTP de manière différente:
- **Trade Generator**: utilise `StyledJsonViewer` avec syntax highlighting coloré et niveaux collapsibles
- **Macro Lab**: affiche le JSON en texte brut (plain text) dans une simple div

L'objectif est d'harmoniser l'affichage avec un styling professionnel sur les deux pages.

---

## Solution Technique

### 1. Créer un Composant Partagé `StyledJsonViewer`

Extraire le composant dans un fichier partagé pour éviter la duplication:

**Fichier:** `src/components/ui/styled-json-viewer.tsx`

```typescript
import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface StyledJsonViewerProps {
  data: unknown;
  depth?: number;
  initialExpanded?: boolean;
}

export function StyledJsonViewer({ 
  data, 
  depth = 0, 
  initialExpanded = true 
}: StyledJsonViewerProps) {
  const [collapsed, setCollapsed] = useState(depth > 1 && !initialExpanded);

  // null
  if (data === null) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  // boolean
  if (typeof data === "boolean") {
    return (
      <span className={data ? "text-emerald-500" : "text-rose-500"}>
        {String(data)}
      </span>
    );
  }

  // number
  if (typeof data === "number") {
    return <span className="text-amber-500">{data}</span>;
  }

  // string
  if (typeof data === "string") {
    // Long strings: truncate with tooltip
    const isLong = data.length > 80;
    const displayText = isLong ? data.slice(0, 80) + "..." : data;
    return (
      <span className="text-emerald-400" title={isLong ? data : undefined}>
        "{displayText}"
      </span>
    );
  }

  // Array
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-muted-foreground">[]</span>;
    }
    return (
      <div className="inline">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-muted-foreground 
                     hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs text-sky-400">
            Array({data.length})
          </span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border/50 pl-3">
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <span className="text-muted-foreground mr-2 text-xs">
                  {index}:
                </span>
                <StyledJsonViewer data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Object
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="text-muted-foreground">{"{}"}</span>;
    }
    return (
      <div className="inline">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-muted-foreground 
                     hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs text-violet-400">
            Object({entries.length})
          </span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border/50 pl-3">
            {entries.map(([key, value]) => (
              <div key={key} className="py-0.5">
                <span className="text-primary font-medium">"{key}"</span>
                <span className="text-muted-foreground">: </span>
                <StyledJsonViewer data={value} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
```

---

### 2. Mise à Jour de Macro Lab (`ForecastMacroLab.tsx`)

Remplacer l'affichage brut par le composant stylé:

**Avant (lignes 659-667):**
```tsx
{"error" in lastHttpDebug ? (
  <div className="whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-foreground">
    {lastHttpDebug.error}
  </div>
) : (
  <div className="max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-foreground">
    {lastHttpDebug.bodyText?.trim() ? lastHttpDebug.bodyText : "(empty body)"}
  </div>
)}
```

**Après:**
```tsx
import { StyledJsonViewer } from "@/components/ui/styled-json-viewer";
import { ScrollArea } from "@/components/ui/scroll-area";

// Dans le JSX:
{"error" in lastHttpDebug ? (
  <div className="whitespace-pre-wrap rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-rose-600">
    {lastHttpDebug.error}
  </div>
) : (
  <ScrollArea className="h-[250px]">
    <div className="font-mono text-xs p-3 bg-muted/30 rounded-lg">
      {(() => {
        try {
          const parsed = JSON.parse(lastHttpDebug.bodyText || "{}");
          return <StyledJsonViewer data={parsed} />;
        } catch {
          // Fallback to raw text if not valid JSON
          return (
            <pre className="whitespace-pre-wrap text-muted-foreground">
              {lastHttpDebug.bodyText?.trim() || "(empty body)"}
            </pre>
          );
        }
      })()}
    </div>
  </ScrollArea>
)}
```

---

### 3. Mise à Jour de Trade Generator (`ForecastTradeGenerator.tsx`)

Remplacer le composant local par l'import du composant partagé:

**Avant (ligne 539-594):**
```tsx
function StyledJsonViewer({ data, depth = 0 }: { data: unknown; depth?: number }) {
  // ... local implementation
}
```

**Après:**
```tsx
import { StyledJsonViewer } from "@/components/ui/styled-json-viewer";

// Supprimer la définition locale du composant
```

---

### 4. Améliorations Visuelles Appliquées

| Element | Style |
|---------|-------|
| Clés JSON | `text-primary` (bleu AlphaLens) |
| Strings | `text-emerald-400` (vert) |
| Numbers | `text-amber-500` (orange) |
| Booleans | `text-emerald-500` / `text-rose-500` |
| Array label | `text-sky-400` + count |
| Object label | `text-violet-400` + count |
| Collapse icons | Chevrons interactifs |
| Nesting | Bordure verticale `border-l` |

---

## Fichiers Modifiés

| Fichier | Changements |
|---------|-------------|
| `src/components/ui/styled-json-viewer.tsx` | **NOUVEAU** - Composant partagé |
| `src/pages/ForecastMacroLab.tsx` | Import + utilisation du StyledJsonViewer |
| `src/pages/ForecastTradeGenerator.tsx` | Suppression du composant local, import du partagé |

---

## Garanties

1. **Zero Régression**: Les fonctionnalités debug existantes restent intactes
2. **Fallback Sécurisé**: Si le JSON est invalide, affichage en texte brut
3. **Performance**: Collapsible nodes pour les gros objets
4. **Cohérence**: Même style sur les deux pages

