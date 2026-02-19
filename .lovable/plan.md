

# Correction Alignement + Couleurs + Rounded Bubbles AURA

## Resume des problemes identifies

1. **Fullscreen assistant messages** : `w-full` sans fond = texte flottant plein ecran, pas aligne a gauche avec limite de largeur
2. **Couleurs differentes** entre modes : reduced = `bg-background` container, `bg-[#2f3e36]` user, `bg-[#212121]` assistant / fullscreen = `bg-[#0e1116]` container, `bg-[#1a1f1e]` user, transparent assistant
3. **Input bar** : styling completement different entre les deux modes (pill en fullscreen, standard en reduced)
4. **Rounded** : assistant fullscreen n'a aucun arrondi (pas de bulle)

## Palette unifiee AURA (source unique de verite)

| Element | Valeur unique |
|---------|---------------|
| Container background | `bg-[#0e1116]` |
| Assistant bubble bg | `bg-[#161b22]` |
| Assistant text | `text-[#c8c8c8]` |
| User bubble bg | `bg-[#1a2e23]` |
| User text | `text-white` |
| Input bg | `bg-[#161b22]` |
| Border | `border-white/[0.06]` |

## Changements detailles

### 1. Container principal (ligne 1095-1099)

Mode reduit : remplacer `bg-background border-l border-border` par `bg-[#0e1116] border-l border-white/[0.06]` pour matcher le fullscreen.

### 2. Header (ligne 1102-1105)

Mode reduit : remplacer `border-b border-border` par `border-b border-white/[0.03]` et ajouter `bg-[#0e1116]` comme en fullscreen.

### 3. Bulles messages (lignes 1226-1238) -- changement principal

Remplacer toute la logique conditionnelle par une palette unique :

```
// Pour les DEUX modes (fullscreen ET reduced) :
msg.role === 'user'
  ? 'max-w-[75%] rounded-2xl px-5 py-3 bg-[#1a2e23] text-white'
  : 'max-w-[75%] rounded-xl px-5 py-3 bg-[#161b22] text-[#c8c8c8]'
```

- Assistant : `max-w-[75%]`, `rounded-xl`, `bg-[#161b22]`, aligne a gauche via `justify-start`
- User : `max-w-[75%]`, `rounded-2xl`, `bg-[#1a2e23]`, aligne a droite via `justify-end`
- Plus aucun `w-full` ni fond transparent pour l'assistant
- Plus aucun `isFullscreen` ternaire dans cette zone

### 4. Input bar (lignes 1322-1366)

Unifier le style input pour les deux modes :
- Container : `bg-[#0e1116]` + padding genereux dans les deux modes
- Input wrapper : `rounded-full bg-[#161b22] shadow-[0_2px_12px_rgba(0,0,0,0.4)] px-4 h-14` dans les deux modes
- Suppression du `border-t border-border` en reduced, remplace par `border-t border-white/[0.03]`
- Bouton send : `rounded-full` dans les deux modes
- Badge "AURA v2" et icone Search visibles dans les deux modes

### 5. Loading indicator (lignes 1285-1300)

Unifier : suppression du `bg-muted rounded-lg` en reduced. Utiliser le meme style leger (texte + spinner) dans les deux modes avec `text-[#888]`.

### 6. Empty state / Quick actions (lignes 1164-1213)

Unifier : utiliser `variant="ghost"` et couleurs `text-[#888]` dans les deux modes. Suppression des ternaires `isFullscreen ?`.

## Fichier modifie

`src/components/AURA.tsx` uniquement

## Ce qui ne change PAS

- Tool routing / intents / feature-mapper
- API calls / webhooks / streaming
- Widgets (MarketChartWidget, mini widgets)
- Job badges
- Scroll behavior
- Teaser / collapsed button
- localStorage conversations
- Fullscreen backdrop et animation d'ouverture

