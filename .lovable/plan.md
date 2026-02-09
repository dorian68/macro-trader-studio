
# Audit UX/Product AlphaLens — Recommandations priorisees

---

## 1. Tour d'horizon produit (vue macro)

### Ce qui fonctionne bien
- **Proposition de valeur claire** : "Intelligent Financial Research Powered by AI" est immediatement comprehensible
- **Architecture produit coherente** : Forecast -> Trade Generator -> Macro Lab -> Reports forme un pipeline logique
- **Identite visuelle** : esthetique sombre, professionnelle, adaptee a la cible
- **Systeme de credits** : modele SaaS bien structure avec 3 tiers clairs

### Frictions cognitives identifiees

| Friction | Localisation | Severite |
|----------|-------------|----------|
| Le footer redirige presque tout vers /contact au lieu des vraies pages | Footer (Homepage + Footer.tsx) | Haute |
| Les 3 cards du dashboard utilisent la meme icone (Activity) pour Macro et Reports | TradingDashboard.tsx L324, L345 | Moyenne |
| Navigation hamburger melange pages publiques et app privee sans separation | Layout.tsx mobile menu | Moyenne |
| "AI Setup" dans le menu mobile ne mene nulle part (appelle onModuleChange) | Layout.tsx L254 | Haute |
| Pas de breadcrumb dans le flow Trade Generator / Macro Lab | Pages profondes | Moyenne |
| Le copyright affiche "2025" alors que nous sommes en 2026 | common.json L54 | Faible |

---

## 2. UX & Design — Recommandations concretes

### 2.1 Footer : liens morts (Quick Win critique)

**Probleme** : Le Footer.tsx et le footer du Homepage.tsx redirigent "Privacy", "Documentation", "Help Center", "Terms of Service" et "API" vers `/contact`. Les vraies pages existent (`/privacy`, `/terms`, `/documentation`, `/help-center`, `/api`).

**Solution** : Corriger les `navigate()` pour pointer vers les bonnes routes.

**Impact** : Credibilite, SEO, confiance utilisateur.

### 2.2 Icones de navigation Dashboard

**Probleme** : Les 3 cards cote droit du dashboard (Trade Setup, Macro, Reports) utilisent la meme icone `Activity` pour Macro et Reports. Cela nuit a la differenciation visuelle.

**Solution** :
- Trade Setup : `Zap` (deja correct)
- Macro Commentary : `BarChart3` ou `Globe` (analyse macro)
- Reports : `FileText` (document/rapport)

**Impact** : Differenciation visuelle, navigation intuitive.

### 2.3 Menu mobile : separation claire des zones

**Probleme** : Le menu mobile melange les pages publiques (About, Features, Pricing) et les outils app (Dashboard, History, Macro) sans separation visuelle.

**Solution** : Ajouter un separateur visuel et des labels de section ("Platform" / "Resources") pour delimiter les zones.

**Impact** : Clarte de navigation, reduction de la charge cognitive.

### 2.4 "AI Setup" dans le menu mobile

**Probleme** : Le bouton "AI Setup" dans le menu mobile appelle `onModuleChange?.("ai-setup")` qui ne fait rien car le callback est vide (`() => {}`) dans TradingDashboard. L'utilisateur clique et rien ne se passe.

**Solution** : Remplacer par `navigate('/trade-generator')` qui est le vrai point d'entree fonctionnel.

**Impact** : Elimination d'un dead-end UX.

### 2.5 Copyright 2025 -> 2026

**Probleme** : `common.json` affiche "2025" alors que nous sommes en 2026.

**Solution** : Mettre a jour en "2025-2026" ou dynamiser avec `new Date().getFullYear()`.

---

## 3. Focus critique : le champ "Articles" / "Market News"

### Analyse du naming actuel

Le systeme de news est actuellement nomme :
- `"Market News"` dans le code (common.json, MarketNewsCollapsible, NewsFeedPanel)
- `"News"` dans certains labels mobiles

**Diagnostic** :
- "Market News" est acceptable mais generique
- Ce n'est pas un flux d'articles redactionnels crees par AlphaLens, c'est un **aggregateur de news externes** (flux RSS/API avec source, URL externe, categories forex/crypto/M&A)
- Le composant ouvre les articles dans un nouvel onglet vers la source externe

### Ce que le naming devrait refleter

Pour un produit de recherche quantitative, le flux de news devrait etre positionne comme un **outil de veille** et non un blog. Voici les alternatives :

| Proposition | Positionnement | Adequation AlphaLens |
|-------------|---------------|---------------------|
| **Market Intelligence** | Veille strategique, signal | Excellent — institutionnel |
| **Market Pulse** | Monitoring temps reel | Tres bon — dynamique |
| **Market Wire** | Fil d'actualite professionnel (Bloomberg-like) | Tres bon — familier pour les pros |
| **Research Wire** | Fil de veille research-grade | Bon mais implique du contenu interne |
| **News & Signals** | Mixte news + signal | Bon mais trop generique |

**Recommandation** : **"Market Intelligence"** pour le titre principal, avec le sous-titre "Real-time market signals and analysis".

### Repositionnement UX de la section

**Actuellement** : Section collapsible en bas du dashboard, deconnectee du flux de travail.

**Proposition** :
- Renommer le titre en "Market Intelligence"
- Ajouter un badge de comptage "12 new" plutot qu'un simple indicateur pulse
- Relier visuellement a la section Trade Generator : quand l'utilisateur lit une news sur EUR/USD, proposer un CTA discret "Analyze with Trade Generator"
- Utiliser un ton plus "signal" : afficher un badge de sentiment (Bullish/Bearish/Neutral) sur chaque item s'il est disponible

---

## 4. Synthese actionnable priorisee

### Quick Wins (effort faible, impact immediat)

| # | Probleme | Solution | Impact |
|---|----------|----------|--------|
| 1 | Footer : 6 liens pointent vers /contact | Corriger vers /privacy, /terms, /documentation, /help-center, /api | Credibilite + SEO |
| 2 | Copyright "2025" | Mettre "2025-2026" ou dynamique | Professionnalisme |
| 3 | Icones identiques (Activity x2) sur Dashboard | Differencier avec BarChart3/Globe + FileText | Navigation visuelle |
| 4 | "AI Setup" mobile = dead-end | Remplacer par navigate('/trade-generator') | UX fonctionnelle |

### Ameliorations structurantes (effort moyen)

| # | Probleme | Solution | Impact |
|---|----------|----------|--------|
| 5 | "Market News" naming generique | Renommer en "Market Intelligence" (tous locales) | Positionnement premium |
| 6 | Menu mobile sans hierarchie | Ajouter separateurs et labels de section | Clarte navigation |
| 7 | Pas de breadcrumb dans les outils profonds | Ajouter un breadcrumb contextuel (Dashboard > Trade Generator) | Orientation utilisateur |

### Evolutions long terme

| # | Probleme | Solution | Impact |
|---|----------|----------|--------|
| 8 | News deconnectees du workflow | Relier news -> Trade Generator via CTA contextuel | Engagement + retention |
| 9 | Pas de sentiment badge sur les news | Ajouter Bullish/Bearish/Neutral par item | Valeur ajoutee data |
| 10 | Homepage trop simple (3 cards + CTA) | Ajouter une section "How it works" (3 etapes) + social proof | Conversion |

---

### Fichiers impactes par les Quick Wins

| Fichier | Modifications |
|---------|--------------|
| `src/components/Footer.tsx` | 6 liens a corriger |
| `src/pages/Homepage.tsx` | Footer inline : memes corrections |
| `src/pages/TradingDashboard.tsx` | Icones des cards (L324, L345) |
| `src/components/Layout.tsx` | Menu mobile : AI Setup -> navigate, separateurs |
| `src/locales/en/common.json` | Copyright, "Market News" -> "Market Intelligence" |
| `src/locales/es/common.json` | Idem en espagnol |
| `src/locales/fa/common.json` | Idem en farsi |
