

# Audit SEO — AlphaLens AI

## Note globale : 78/100 — Bon, avec des axes d'amélioration clairs

---

## Ce qui est bien fait (les forces)

| Critère | Note | Commentaire |
|---------|------|-------------|
| **Structured Data (JSON-LD)** | 9/10 | Organization, WebSite, SearchAction, Article, FAQ, BreadcrumbList — excellent |
| **Meta tags dynamiques** | 9/10 | react-helmet-async avec titre/description par page, hreflang, OG/Twitter |
| **Sitemap** | 9/10 | 98 URLs, bien structuré, couvre tous les articles |
| **robots.txt** | 9/10 | Bien configuré, bloque les pages auth-gated, autorise le blog |
| **Contenu blog** | 9/10 | 86 articles experts, ~1500 mots, 4 catégories, maillage interne, CTA |
| **Internal linking** | 8/10 | RelatedPages, footer links, Related Reading dans chaque article, nav sémantique |
| **Google Analytics** | 8/10 | GA4 configuré avec suivi SPA (page_view sur changement de route) |
| **Code splitting** | 8/10 | React.lazy pour toutes les pages secondaires — bon pour Core Web Vitals |
| **Font optimization** | 7/10 | Preconnect + display=swap pour Google Fonts |

---

## Problèmes identifiés et recommandations

### Critiques (impact fort)

| # | Problème | Impact | Solution |
|---|----------|--------|----------|
| 1 | **SPA non pré-rendu** — Google peut mal indexer le contenu JS-only | Le contenu blog n'est visible qu'après hydratation React. Googlebot gère le JS mais avec délai et risque de timeout | Ajouter un service de prerendering (prerender.io, Rendertron) ou SSG pour les pages publiques |
| 2 | **Pas de balise `<h1>` visible dans le HTML statique** — Le H1 de la homepage est dans le JS bundle | Google voit un `<div id="root"></div>` vide avant hydratation | Le prerendering résout ce problème |
| 3 | **Aucune image `alt` optimisée pour le SEO sur le blog** — Les articles n'ont pas de `cover_image` | Pas d'images dans les résultats Google Images, pas de rich snippets visuels | Ajouter des cover images avec alt text descriptif pour chaque article |

### Importants (impact moyen)

| # | Problème | Impact | Solution |
|---|----------|--------|----------|
| 4 | **Pas de `lastmod` dynamique dans le sitemap** — Toutes les dates sont `2026-03-21` | Google ne sait pas quels contenus sont frais | Générer lastmod depuis `updated_at` de la DB |
| 5 | **Pas de page `/blog` catégorisée avec URL** — ex: `/blog/category/quant` | Les pages catégorie sont des filtres JS, pas des URLs indexables | Créer des routes `/blog/category/:cat` crawlables |
| 6 | **Pas de pagination SEO-friendly** — Le "Load More" est JS-only | Google ne voit que les 12 premiers articles | Ajouter `rel="next"` ou des pages `/blog/page/2` |
| 7 | **Title format inconsistant** — Homepage = "AlphaLens — ..." mais articles = "Title \| AlphaLens AI" | Confusion de marque pour Google | Standardiser : "Titre \| AlphaLens AI" partout |
| 8 | **Pas de Google Search Console soumis** | Impossible de savoir si Google indexe correctement | Soumettre le sitemap dans GSC |

### Mineurs (nice-to-have)

| # | Problème | Solution |
|---|----------|----------|
| 9 | Pas de schema `FAQPage` automatique sur les articles qui contiennent un FAQ | Parser les sections FAQ dans le content et injecter le schema |
| 10 | Pas de `<link rel="preload">` pour les fonts critiques | Ajouter preload pour Inter 400/600 |
| 11 | Logo dans le header n'a pas de texte caché pour le SEO | Ajouter un `<span class="sr-only">AlphaLens AI</span>` |
| 12 | Open Graph image générique (`og-image.png`) pour tous les articles | Générer des OG images dynamiques par article |

---

## Estimation de trafic

### Avec la config actuelle (SPA sans prerendering)

```text
Trafic estimé : 50-200 visites/jour

Pourquoi si bas :
- Google indexe mal les SPA pures (délai de rendering JS)
- 86 articles de qualité mais potentiellement non indexés
- Pas de backlinks externes (autorité de domaine faible)
- Niche compétitive (AI trading) dominée par des sites à forte DA
```

### Avec les corrections critiques (#1-3)

```text
Trafic estimé : 500-1500 visites/jour (en 3-6 mois)

Hypothèse :
- 86 articles × 5-15 visites/jour/article en moyenne
- Long-tail keywords sur chaque article (~30% du trafic)
- Pages produit (features, pricing) = ~10% du trafic
- Blog hub page = ~5% du trafic
```

### Avec toutes les corrections (#1-12) + backlinks

```text
Trafic estimé : 2000-5000 visites/jour (en 6-12 mois)

Conditions :
- Prerendering actif
- 10-20 backlinks de qualité (guest posts, PR)
- DA > 25
- GSC soumis et surveillé
- Articles actualisés tous les 2-3 mois
```

---

## Priorités d'action (par ordre d'impact)

1. **Configurer un service de prerendering** (prerender.io) — multipliera l'indexation par 5-10x
2. **Soumettre le sitemap dans Google Search Console** — visibilité immédiate
3. **Ajouter des cover images** aux articles blog avec alt text optimisé
4. **Créer des routes de catégorie crawlables** (`/blog/category/quant-backtesting`)
5. **Rendre la pagination crawlable** (pages `/blog/page/2`, `/blog/page/3`)
6. **Obtenir des backlinks** — guest posts sur des sites fintech, mentions LinkedIn
7. **Générer des OG images dynamiques** par article pour le partage social

