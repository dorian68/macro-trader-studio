

## Refonte des cards de la page Features -- Style institutionnel

### Objectif

Aligner le design des cards de `/features` sur celui des cards de la page d'accueil : supprimer les icones Lucide generiques dans des cercles colores et les remplacer par des mini-visuels SVG et des badges professionnels.

### Changements prevus

**1. Cards principales (AI Trade Setups, Macro Commentary, Research Reports)**

Remplacement de la structure actuelle (cercle colore + icone Lucide + titre + description + liste + bouton outline) par la structure institutionnelle de la homepage :

```text
+-----------------------------------------+
| o  SIGNALS ENGINE  (badge uppercase)    |
|                                         |
| +-------------------------------------+|
| |  SVG mini-visual (candlestick etc.) ||
| +-------------------------------------+|
|                                         |
|  AI Trade Setups                        |
|  Description text (2 lines)             |
|                                         |
|  * Detail 1                             |
|  * Detail 2                             |
|  * Detail 3                             |
|  * Detail 4                             |
|                                         |
|  Open module ->                         |
+-----------------------------------------+
```

- Reutilisation des 3 composants SVG existants : `SignalsEngineVisual`, `MacroDeskVisual`, `ResearchLabVisual`
- Badge uppercase avec dot accent (identique a la homepage)
- CTA en lien texte "Open module" au lieu d'un bouton outline pleine largeur
- Bordures subtiles (`border-border/60`), hover leger (`hover:border-accent/40 hover:-translate-y-0.5`)

**2. Cards additionnelles (Multi-Asset, Real-Time, Institutional Grade)**

Meme traitement : suppression des cercles colores avec icones generiques. Remplacement par de petits visuels SVG inline dedies (formes geometriques minimalistes) avec le meme style de badge et la meme esthetique sobre.

3 nouveaux composants SVG legers seront crees :
- `MultiAssetVisual` : 3 petites sparklines paralleles (FX, Crypto, Indices)
- `RealtimeVisual` : signal pulse / heartbeat
- `InstitutionalVisual` : grille de blocs structuree (comme un terminal)

**3. Fichier modifie**

`src/pages/Features.tsx` :
- Suppression des imports Lucide (`Brain, BarChart3, FileText, Globe2, Zap, Shield`)
- Import des 3 visuels homepage existants + 3 nouveaux visuels
- Restructuration du JSX des cards pour suivre la hierarchie badge > visual > titre > description > details > CTA lien

**4. Nouveaux fichiers**

- `src/components/features/MultiAssetVisual.tsx`
- `src/components/features/RealtimeVisual.tsx`
- `src/components/features/InstitutionalVisual.tsx`

### Ce qui ne change PAS

- Textes, traductions i18n, routes, navigation
- Layout general de la page (hero, sections, CTA final, footer)
- PublicNavbar, Footer
- Les 3 composants SVG de la homepage (reutilises tels quels)

