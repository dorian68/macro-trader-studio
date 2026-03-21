

## Maximiser le SEO des 28 articles (Batches 1-14)

### Ce qui change

**1. UPDATE metadata SEO pour 28 articles** (SQL UPDATE via insert tool)

Pour chaque article, mettre à jour :
- `meta_title` — format "Titre | AlphaLens AI" (conforme aux fiches)
- `meta_description` — nouvelles descriptions optimisées (130-155 chars)
- `excerpt` — nouveaux excerpts plus orientés action
- `category` — harmoniser en 4 catégories : `Quant & Backtesting`, `Portfolio & Risk`, `Institutional & Governance`, `Commodities & Macro`
- `tags` — nouveaux tags optimisés par article

**2. Ajouter un bloc "Related Reading" au contenu Markdown de chaque article**

Appender à la fin du `content` de chaque article (avant le FAQ ou en fin d'article) un bloc Markdown :
```
## Related Reading

- [Titre article 1](/blog/slug-1)
- [Titre article 2](/blog/slug-2)
- [Titre article 3](/blog/slug-3)

---

**[Try AlphaLens AI →](/auth)** — Get AI-powered trade setups, macro commentary, and portfolio analytics.
```

Les 3 liens internes par article suivent exactement les recommandations des fiches SEO.

**3. Mettre à jour le composant BlogPost.tsx**

Ajouter le support des listes ordonnées (`1. ...`) dans le `renderMarkdown` pour que les articles avec des listes numérotées s'affichent correctement.

### Exécution technique

- **28 UPDATE statements** via l'outil insert (pas de migration, ce sont des données)
- Regroupés en 3-4 batchs SQL pour efficacité
- **1 edit** sur `BlogPost.tsx` : améliorer le regex markdown pour les ordered lists

### Pas de changement

- Pas de modification du sitemap (slugs inchangés)
- Pas de modification de la structure DB
- Le contenu original des articles reste intact, seul le bloc "Related Reading" est ajouté en fin

