

# Audit SEO — AlphaLens AI (Mars 2026)

## Note globale : 85/100 — Bon, en progression depuis 78/100

---

## Scorecard detaille

| Critere | Note | Detail |
|---------|------|--------|
| **Structured Data (JSON-LD)** | 9.5/10 | Organization, WebSite, SearchAction, Article, FAQ, BreadcrumbList (3 niveaux), WebPage, SiteNavigation |
| **Meta tags dynamiques** | 9/10 | react-helmet-async, titre/description par page, hreflang, OG/Twitter, canonical |
| **Sitemap** | 9/10 | 98 URLs, categories incluses, bien structure |
| **robots.txt** | 9/10 | Bloque auth-gated, autorise blog + categories |
| **Contenu blog** | 9.5/10 | 86 articles experts, ~1500 mots, 4 categories, Related Reading + CTA, maillage interne |
| **Routes crawlables** | 9/10 | `/blog/category/:cat` + `/blog/page/:num` + rel prev/next |
| **Internal linking** | 9/10 | RelatedPages, footer, nav, Related Reading dans chaque article, breadcrumbs |
| **Accessibilite SEO** | 8/10 | Logo sr-only, alt text sur images, breadcrumb aria-label |
| **Performance** | 8/10 | Code splitting, font preload/preconnect, lazy loading images, hero preload |
| **Google Analytics** | 8/10 | GA4 avec suivi SPA |
| **SPA Indexation** | 5/10 | Meta fragment "!" present, mais pas de prerendering actif |
| **Images blog** | 3/10 | Pas de cover_image sur les articles, pas d'OG images dynamiques |

---

## Ce qui a ete ameliore depuis le dernier audit (78 → 85)

- Routes de categories crawlables (`/blog/category/quant-backtesting`, etc.)
- Pagination crawlable avec `rel="prev/next"`
- Font preload pour Inter 400/600
- Logo sr-only pour accessibilite
- Title standardise "Titre | AlphaLens AI" sur toutes les pages
- 28 articles enrichis avec Related Reading + CTA
- Breadcrumb 3 niveaux (Home > Blog > Article)
- Temps de lecture estime sur chaque article
- Categories harmonisees en 4 clusters

---

## Problemes restants par priorite

### Critique (score perdu : ~8 points)

| # | Probleme | Impact | Solution |
|---|----------|--------|----------|
| 1 | **Pas de prerendering** — Google voit `<div id="root"></div>` vide | 86 articles potentiellement non indexes, perte de 80% du trafic organique | Configurer **prerender.io** (~$15/mois) ou Rendertron en reverse proxy |
| 2 | **Pas de cover images** sur les articles | Pas d'images dans Google Images, pas de rich snippets visuels, OG image generique | Ajouter des images par categorie ou generer des OG dynamiques |

### Important (score perdu : ~4 points)

| # | Probleme | Solution |
|---|----------|----------|
| 3 | **Google Search Console** non soumis | Soumettre le sitemap dans GSC — action externe, 5 min |
| 4 | **lastmod statique** dans le sitemap | Utiliser `updated_at` de la DB au build time |
| 5 | **Pas de FAQPage schema auto** | Parser les sections FAQ dans le content Markdown et injecter le schema JSON-LD |

### Mineur (score perdu : ~3 points)

| # | Probleme | Solution |
|---|----------|----------|
| 6 | Pas de backlinks externes | Guest posts, PR, mentions LinkedIn |
| 7 | OG image identique pour tous les articles | Generer des images dynamiques par article |
| 8 | `rel="prev/next"` dans le JSX au lieu de `<Helmet>` (ligne 267-268 de Blog.tsx) | Deplacer dans `<Helmet>` pour que ce soit dans le `<head>` |

---

## Estimation de trafic

```text
SITUATION ACTUELLE (SPA sans prerendering) :
  → 50-200 visites/jour
  Raison : Google indexe mal le JS-only, 86 articles invisibles

AVEC PRERENDERING (correction #1) :
  → 500-1,500 visites/jour en 3-6 mois
  86 articles × 5-15 visites/jour chacun en long-tail

AVEC PRERENDERING + IMAGES + GSC + BACKLINKS :
  → 2,000-5,000 visites/jour en 6-12 mois
  Conditions : DA > 25, 10-20 backlinks, articles actualises

POTENTIEL MAX (12-18 mois, tout optimise) :
  → 5,000-10,000 visites/jour
  Conditions : 150+ articles, DA > 35, PR fintech, featured snippets
```

---

## Plan d'action pour passer de 85 → 92+

### Ce que je peux faire maintenant (dans Lovable)

1. **Deplacer les `rel="prev/next"`** dans `<Helmet>` au lieu du JSX (Blog.tsx ligne 267-268)
2. **Ajouter un schema FAQPage automatique** quand un article contient une section "## FAQ" ou "## Frequently Asked Questions"
3. **Generer des placeholder cover images** par categorie (couleur + titre en SVG)

### Ce que tu dois faire toi (actions externes)

1. **Configurer prerender.io** — c'est la correction SEO #1, elle vaut ~5-10x plus de trafic
2. **Soumettre le sitemap dans Google Search Console** — `https://alphalensai.com/sitemap.xml`
3. **Obtenir des backlinks** — guest posts sur des blogs fintech, mentions LinkedIn, PR
4. **Ajouter des vraies cover images** aux articles (via Midjourney, Canva, ou stock photos)

