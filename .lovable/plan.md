

## Prerendering pour les bots SEO — Strategie recommandee

### Contexte

Le site est heberge uniquement sur Lovable (pas de serveur, pas de Cloudflare). Les outils de prerendering build-time (react-snap) necessitent un navigateur headless pendant le build, ce qui n'est pas disponible dans l'environnement Lovable. Il faut donc une solution externe.

### Approche recommandee : Cloudflare (gratuit) + Worker

C'est la seule approche viable sans changer d'hebergeur. Cout : 0 a 5$/mois.

**Etape 1 — Mettre Cloudflare devant alphalensai.com (manuelle, hors Lovable)**
- Creer un compte Cloudflare gratuit
- Ajouter le domaine `alphalensai.com`
- Changer les nameservers du registrar vers ceux de Cloudflare
- Configurer un CNAME vers l'URL Lovable actuelle
- Activer le proxy orange (obligatoire pour les Workers)

**Etape 2 — Creer un Worker Cloudflare (code fourni)**
- Le Worker intercepte les requetes des bots (Googlebot, Bingbot, LinkedInBot, Twitterbot, FacebookBot)
- Pour les bots : redirige vers prerender.io (gratuit jusqu'a 250 pages/mois, parfait pour 111 URLs)
- Pour les humains : laisse passer normalement vers Lovable

**Etape 3 — Code-side : ajouter du contenu `<noscript>` dans index.html**
- Fallback SEO avec texte descriptif du site, liens vers les pages cles
- Benefice immediat meme sans Cloudflare : les bots qui ne rendent pas le JS voient du contenu

### Ce que je peux faire maintenant dans Lovable

1. **Ajouter un bloc `<noscript>` riche** dans `index.html` avec description du site, liens principaux, et texte SEO
2. **Fournir le code du Cloudflare Worker** pret a deployer (fichier de reference dans le projet)
3. **Fournir un guide pas-a-pas** pour la configuration Cloudflare + prerender.io

### Ce qui necessite une action manuelle de votre part

- Creation du compte Cloudflare + changement DNS (10 min)
- Creation du compte prerender.io gratuit (2 min)
- Deploiement du Worker via le dashboard Cloudflare (5 min)

### Impact attendu

- Indexation Google : 60-70% → 95-100% des pages
- Score SEO : 88/100 → 93+/100
- Trafic organique potentiel : x3 a x5

