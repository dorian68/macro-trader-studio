

# Fix : Bouton "View Result" invisible en single view

## Cause racine

Le composant `Button` (ligne 444 de PersistentToast.tsx) n'a pas de prop `variant`, donc il utilise le variant **default** qui applique :
- `gradient-primary` (fond gradient custom qui ecrase `bg-white`)
- `text-white` (ecrase `text-black`)
- `shadow-soft`, `border border-white/10`, etc.

Le `className="bg-white text-black"` passe en argument est ecrase par les styles du variant default car `gradient-primary` est une classe CSS custom plus specifique que les utilitaires Tailwind.

## Correctif

**Fichier** : `src/components/PersistentToast.tsx`, ligne 444

Ajouter `variant="ghost"` au bouton "View Result". Le variant ghost applique uniquement `hover:bg-accent hover:text-white border-transparent shadow-none`, ce qui permet aux classes explicites `bg-white text-black` de s'appliquer correctement sans conflit.

```tsx
<Button 
  size="sm"
  variant="ghost"
  onClick={(e) => { e.stopPropagation(); navigateToResult(currentJob as any); }}
  className="text-[11px] h-7 flex-1 bg-white text-black hover:bg-white/90 font-medium border-0 shadow-none"
>
```

## Ce qui ne change pas

- Aucune autre ligne modifiee
- Meme apparence visuelle cible (fond blanc, texte noir)
- Meme comportement au clic

