

# Plan: Afficher le champ "content" avec MacroCommentaryDisplay

## Problème Actuel

Dans la page `/forecast-playground/macro-commentary`, quand le `content` est un objet JSON contenant des champs structurés (`executive_summary`, `fundamental_analysis`, `directional_bias`, `key_levels`, etc.), il est actuellement affiché via `StyledJsonViewer` qui montre le JSON brut. Ce n'est pas optimal pour l'expérience utilisateur.

## Solution

Utiliser le composant `MacroCommentaryDisplay` qui existe déjà et qui est conçu spécifiquement pour afficher ces données de manière formatée avec :
- **Executive Summary** : Résumé textuel dans une carte
- **Fundamental Analysis** : Liste à puces des points clés
- **Directional Bias** : Badge avec icône (bullish/bearish) et niveau de confiance
- **Key Levels** : Grille Support/Resistance avec couleurs sémantiques
- **AI Insights Breakdown** : Sections dépliables pour GPT et insights curés

## Modifications

### Fichier: `src/pages/ForecastMacroLab.tsx`

#### 1. Ajouter l'import de MacroCommentaryDisplay (ligne ~37)

```typescript
import { MacroCommentaryDisplay } from "@/components/MacroCommentaryDisplay";
```

#### 2. Modifier le rendu conditionnel des sections (lignes 785-793)

Actuellement :
```typescript
<div className="bg-muted/20 p-4 rounded-lg border">
  {typeof section.content === "object" ? (
    <StyledJsonViewer data={section.content} initialExpanded={true} maxDepth={4} />
  ) : (
    <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
      {section.content}
    </div>
  )}
</div>
```

Nouveau code :
```typescript
<div className="bg-muted/20 p-4 rounded-lg border">
  {typeof section.content === "object" ? (
    <MacroCommentaryDisplay data={section.content} originalQuery={analysis.query} />
  ) : (
    <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
      {section.content}
    </div>
  )}
</div>
```

## Résumé des Changements

| Ligne | Changement |
|-------|------------|
| ~37 | Ajouter `import { MacroCommentaryDisplay }` |
| ~788 | Remplacer `StyledJsonViewer` par `MacroCommentaryDisplay` |

## Garanties Zero Régression

1. **Fallback texte** : Si le contenu est une string, l'affichage texte actuel est conservé
2. **Composant existant** : `MacroCommentaryDisplay` est déjà testé et fonctionnel
3. **Autres pages** : Aucun autre fichier modifié
4. **HTTP Debug** : Le panneau debug continue d'utiliser `StyledJsonViewer` pour le JSON brut complet

## Résultat Attendu

Au lieu d'un arbre JSON brut, l'utilisateur verra :
- Une carte "Executive Summary" avec le résumé
- Une carte "Fundamental Analysis" avec des bullet points
- Une carte "Directional Bias" avec badge bullish/bearish et confiance %
- Une carte "Key Levels" avec Support (vert) et Resistance (rouge)
- Des sections dépliables pour les insights AI

