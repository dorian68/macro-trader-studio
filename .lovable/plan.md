

# Ajouter le logo "alphaLens AI" sur la card Login / Sign Up

## Changement

Remplacer le logo actuel (`/logo_v2.png`) par le nouveau logo texte "alphaLens AI" uploade, au-dessus du titre "Welcome to Alphalens".

## Etapes

1. **Copier le fichier** : `user-uploads://Only_text_no_BG_LOGO.png` vers `public/logos/alphalens-ai-text.png`

2. **Modifier `src/pages/Auth.tsx`** (lignes 854-858) :
   - Remplacer `src="/logo_v2.png"` par `src="/logos/alphalens-ai-text.png"`
   - Ajuster la hauteur si necessaire (`h-24` actuel, potentiellement `h-16` ou `h-20` selon le rendu du logo texte)
   - Conserver le `alt`, le centrage, et le `mb-1`

## Ce qui ne change PAS

- La structure de la Card (CardHeader, CardContent, Tabs)
- Les textes traduits (welcomeToAlphalens, connectToDashboard)
- La logique auth (signin, signup, forgot password, OAuth)
- Les z-index et overlays corriges precedemment
- Le comportement mobile/desktop

## Detail technique

```text
Avant :  [logo_v2.png]  →  "Welcome to Alphalens"  →  "Connect to your..."
Apres :  [alphaLens AI]  →  "Welcome to Alphalens"  →  "Connect to your..."
```

