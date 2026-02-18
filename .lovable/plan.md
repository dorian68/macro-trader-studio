
# 3 Corrections : PersistentToast visible, AURA dans le theme, Ergonomie mobile dashboard

## 1. PersistentToast minimise : eliminer le noir-sur-noir

**Probleme** : La bulle minimisee utilise `bg-card/98` qui equivaut a `hsl(0 0% 5%)` avec 98% opacite, soit quasi-noir sur fond noir (#0a0a0a). Le `backdrop-blur-md` n'aide pas car le fond derriere est egalement noir.

**Solution** : Remplacer le fond de la bulle minimisee par un style cristal visible avec un fond semi-transparent plus clair et une bordure lumineuse :

**Fichier** : `src/components/PersistentToast.tsx`

- Bulle minimisee (mobile et desktop, lignes 230-232) :
  - Remplacer `bg-card/98 backdrop-blur-md border border-border/50` par :
  - `bg-white/[0.12] backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.08)]`
  - Cela cree un effet glassmorphism visible : fond legerement translucide clair, bordure blanche subtile, reflet interne

- Spinner / icone : remplacer `border-primary` (blanc) par `border-orange-400` pour un contraste supplementaire avec l'orange de la DA

## 2. Bouton AURA : alignement avec la DA AlphaLens

**Probleme** : Le bouton AURA utilise `from-blue-600 to-cyan-600` (gradient bleu/cyan) qui ne correspond pas a l'identite visuelle d'AlphaLens (orange #f97316, noir glossy, blanc).

**Solution** : Aligner le bouton sur la DA en utilisant le gradient orange de la marque.

**Fichier** : `src/components/AURA.tsx` (ligne 951)

- Remplacer `bg-gradient-to-br from-blue-600 to-cyan-600` par :
  - `bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.3)]`
- Remplacer `animate-pulse-glow` par `hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]` (glow orange au hover)
- Le teaser dans `AURATeaser.tsx` (ligne 40) : remplacer `from-blue-600 to-cyan-600` par `from-orange-500 to-orange-600` et le hover `from-blue-700 to-cyan-700` par `from-orange-600 to-orange-700`

## 3. Ergonomie mobile du dashboard

**Probleme** : Sur mobile, le dashboard presente plusieurs soucis d'ergonomie professionnelle :
- Le branding header prend de la place verticale pour un texte redondant (le logo est deja dans le navbar)
- Les 3 cartes de feature (AI Trade Setup, Macro Commentary, Reports) sont trop hautes avec des icones peu exploitees
- L'espace entre le graphique et les cartes pourrait etre mieux utilise
- Le graphique n'occupe pas assez de l'ecran

**Solutions dans** `src/pages/TradingDashboard.tsx` :

a) **Supprimer le branding header mobile** (lignes 260-263) : Ce bloc affiche un titre et sous-titre qui repetent le logo deja present dans le navbar. Le supprimer libere ~50px d'espace vertical pour le graphique.

b) **Compacter les cartes de feature mobile** (lignes 304-345) :
   - Reduire le padding de `p-2` a `p-1.5`
   - Reduire le padding de l'icone de `p-1.5` a `p-1`
   - Icones de `h-4 w-4` a `h-3.5 w-3.5`
   - Texte de `text-[11px]` a `text-[10px]`
   - Gap entre icone et texte de `gap-1` a `gap-0.5`

c) **Reduire le gap global** : `gap-1` entre les sections mobiles devient `gap-0.5` pour maximiser le graphique

d) **Ajuster le container principal** : Remplacer `h-[calc(100dvh-3.5rem)]` par `h-[calc(100dvh-3.5rem)]` (deja correct) mais s'assurer que flex-1 sur le graphique prend tout l'espace restant

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/PersistentToast.tsx` | Style glassmorphism visible sur bulle minimisee |
| `src/components/AURA.tsx` | Bouton gradient orange AlphaLens |
| `src/components/aura/AURATeaser.tsx` | CTA gradient orange AlphaLens |
| `src/pages/TradingDashboard.tsx` | Suppression branding mobile, cartes compactees, gap reduit |

## Ce qui ne change pas

- Logique du PersistentToast (jobs, drag, navigation, auto-minimize)
- Logique AURA (messages, tool calls, edge function)
- Layout desktop du dashboard (grid 2fr/1fr, carousel, chart height sync)
- Tous les autres composants et pages
