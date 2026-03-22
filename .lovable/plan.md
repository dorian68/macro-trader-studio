

# Audit SEO complet — alphaLensAI.com

## Note globale : 82/100

Un site tres bien structure pour du SEO technique, avec des lacunes concentrees sur le rendu SPA et quelques optimisations on-page manquantes.

---

## Ce qui est deja excellent (les points forts)

| Domaine | Detail | Impact |
|---------|--------|--------|
| Contenu | 86 articles experts ~1500 mots, 4 clusters thematiques | Fort |
| Structured Data | Organization, WebSite, Article, FAQ, BreadcrumbList, SiteNavigation | Fort |
| Sitemap | 111 URLs, priorities differenciees, lastmod dynamique | Fort |
| robots.txt | Propre, bloque les routes privees, reference le sitemap | Bon |
| Meta tags | SEOHead avec OG, Twitter Card, canonical, hreflang | Bon |
| Images blog | 50 images WebP optimisees, width/height explicites | Bon |
| Internal linking | Footer, RelatedPages, Related Reading dans chaque article | Bon |
| Pagination | Routes crawlables /blog/page/:n avec rel prev/next | Bon |
| Performance | Code splitting, preconnect, preload hero, font-display swap | Bon |

---

## Les problemes identifies (par priorite)

### 1. CRITIQUE — Pas de prerendering/SSR (impact: -15 pts)
**Le site est une SPA React pure.** Google peut indexer du JS mais avec des delais et des echecs frequents. Les bots de Bing, LinkedIn, Facebook, Twitter recoivent une page quasi vide (`<div id="root"></div>`).

**Solution**: Deployer un service de prerendering (prerender.io, rendertron, ou Cloudflare Workers) devant le site. Le `<meta name="fragment" content="!">` est present mais inutile sans service derriere.

### 2. IMPORTANT — Pas de balises `<h1>` semantiques sur certaines pages
La Homepage a un bon H1 mais les visuels des features cards n'ont pas de structure heading hierarchique claire.

### 3. IMPORTANT — Images above-the-fold en lazy loading
Le logo Homepage (`alphalens_logo_new.png`) et le hero n'ont pas `loading="eager"` ni `fetchpriority="high"`. Le hero background est preloade mais le logo LCP non.

### 4. MOYEN — Article cover images en `loading="lazy"` meme au-dessus du fold
Sur `BlogPost.tsx`, la cover image principale de l'article est en `loading="lazy"` — elle devrait etre `loading="eager"` car c'est le LCP element.

### 5. MOYEN — Pas de `alt` descriptif contextuel sur les images blog
Toutes les images blog ont `alt={post.title}` ce qui est correct mais peu varie. Google Image Search beneficierait d'alt texts plus descriptifs.

### 6. MOYEN — Google Analytics bloque le rendu
Le script GA dans `index.html` utilise `async defer` mais le second `<script>` inline (gtag config) est bloquant dans le `<head>`.

### 7. MINEUR — Pas de schema `SoftwareApplication` ou `Product`
Pour le produit alphaLens lui-meme (page Features/Pricing), un schema Product/SoftwareApplication avec reviews et pricing aiderait les rich snippets.

### 8. MINEUR — Fonts Google en render-blocking
5 font weights sont charges alors que seulement 2 sont preloades. Les 3 extras (300, 500, 700) bloquent potentiellement le FCP.

### 9. MINEUR — Pas de `aria-current="page"` sur la navigation
Aide l'accessibilite et indirectement le SEO.

---

## Plan d'ameliorations recommande

### Phase 1 — Impact maximum (a faire maintenant)

1. **Mettre en place le prerendering** via prerender.io ou Cloudflare Workers pour servir du HTML statique aux bots. C'est le single most impactful change.

2. **Blog cover image: `loading="eager"`** sur BlogPost.tsx pour la cover image (element LCP de la page article).

3. **Logo Homepage: ajouter `fetchpriority="high"`** pour ameliorer LCP.

4. **Deplacer le script GA inline** en bas du `<body>` ou le rendre async pour ne pas bloquer le parsing.

### Phase 2 — Enrichissement schemas

5. **Ajouter un schema `SoftwareApplication`** sur /features et /pricing avec nom, description, prix, et reviews.

6. **Ajouter des `alt` descriptifs** sur les blog covers en combinant titre + categorie (ex: "AI portfolio allocation chart - Portfolio & Risk").

### Phase 3 — Performance fine-tuning

7. **Reduire les font weights** a 3 max (400, 600, 700) et supprimer 300 et 500.

8. **Ajouter un Service Worker** pour le cache des assets statiques (images blog, fonts).

---

## Estimation de trafic

### Potentiel dans l'etat actuel (sans prerendering)

Avec 86 articles bien cibles mais un rendu client-side pur :
- **Google indexe ~60-70% des pages SPA** en moyenne
- Beaucoup d'articles risquent de ne pas etre indexes du tout
- **Estimation: 50-150 visites/jour** organiques apres 3-6 mois

### Potentiel avec prerendering active

- 86 articles × keywords longue traine = ~200-400 mots-cles indexes
- Niche finance/AI trading = CPC eleve ($5-15) donc moins de competition organique
- Structured data (FAQ, Article) = rich snippets potentiels
- **Estimation: 300-800 visites/jour** apres 6-9 mois
- **Objectif 12 mois avec contenu continu**: 1000-2000 visites/jour

### Facteurs cles pour atteindre 1000+/jour

1. Prerendering (x3-x5 sur l'indexation)
2. Backlinks externes (guest posts, mentions presse finance)
3. 20-30 articles supplementaires sur des keywords a fort volume
4. Google Search Console monitoring + resubmission sitemap
5. Core Web Vitals dans le vert (LCP < 2.5s, CLS < 0.1)

---

## Resume

| Categorie | Note |
|-----------|------|
| Contenu & strategie | 95/100 |
| SEO technique on-page | 85/100 |
| Structured data | 90/100 |
| Performance (CWV) | 75/100 |
| Rendu & indexabilite | 50/100 |
| **Global** | **82/100** |

Le point faible majeur est clair : **le prerendering**. Sans lui, Google voit une page blanche pendant 3-5 secondes avant que React charge. Avec lui, vous passez facilement a 90+/100 et le trafic potentiel est multiplie par 3-5.

