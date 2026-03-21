

## Maximiser les chances d'obtenir des Sitelinks Google

### Contexte

Google génère les sitelinks automatiquement en se basant sur : la structure du site, la clarté de la navigation, les liens internes, les structured data, et la qualité du contenu. On ne peut pas les "forcer", mais on peut maximiser les signaux.

### Audit rapide — ce qui est déjà en place

- Organization + WebSite + SiteNavigationElement JSON-LD sur la homepage
- BreadcrumbList sur les pages secondaires
- Navbar avec liens `<Link>` crawlables (About, Features, Pricing, Blog, Contact)
- Footer avec liens `<Link>` crawlables vers toutes les sections

### Ce qui manque pour maximiser les sitelinks

#### 1. Ajouter `sameAs` à l'Organization schema
Google utilise `sameAs` pour confirmer l'identité de la marque. Ajouter les profils sociaux (LinkedIn, Twitter/X, GitHub si applicable).

#### 2. Ajouter "Blog" au SiteNavigationElement schema
Le `siteNavigationSchema` liste Features, Pricing, Docs, About, Contact, Help, API — mais **pas Blog**. Blog est le levier SEO principal et doit être dans la navigation structurée.

#### 3. Ajouter un `name` explicite à chaque page publique via JSON-LD WebPage
Chaque page secondaire devrait avoir un `WebPage` schema avec `name` et `url` pour aider Google à comprendre la hiérarchie. Actuellement seul `BreadcrumbList` est présent.

#### 4. Améliorer le `<title>` de index.html
Le `<title>` statique dans `index.html` est le fallback avant que React monte. Il doit être concis et contenir le nom de marque en premier : `AlphaLens AI — AI-Powered Trading Intelligence`.

#### 5. Ajouter des ancres descriptives dans le footer
Les liens footer utilisent des labels génériques via i18n. Vérifier que les traductions sont descriptives (ex: "Features" pas "En savoir plus").

#### 6. Assurer un sitemap propre avec uniquement les pages sitelink-candidates
Le sitemap doit prioriser les pages principales avec `priority: 0.9-1.0` (Homepage, Features, Pricing, Blog, About) et les articles en `0.7`.

### Fichiers modifiés

1. **`src/seo/structuredData.ts`**
   - Ajouter `sameAs: [...]` à `organizationSchema`
   - Ajouter `{ name: 'Blog', url: '/blog' }` à `siteNavigationSchema`
   - Créer un helper `webPageSchema(name, path, description)` pour pages secondaires

2. **`src/pages/Features.tsx`**, **`Pricing.tsx`**, **`About.tsx`**, **`Contact.tsx`**, **`Blog.tsx`**, **`HelpCenter.tsx`**, **`Documentation.tsx`**, **`API.tsx`**
   - Ajouter `webPageSchema` au JSON-LD de chaque page

3. **`index.html`**
   - Modifier le `<title>` fallback : `AlphaLens AI | AI-Powered Trading Intelligence`

### Impact attendu

Ces changements envoient des signaux structurés clairs à Google sur la hiérarchie du site. Combinés avec la navigation crawlable déjà en place, ils maximisent les chances d'obtenir des sitelinks dès que le domaine aura suffisamment d'autorité et d'indexation.

