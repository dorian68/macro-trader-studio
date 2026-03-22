# Guide : Configurer Cloudflare + Prerender.io pour alphaLensAI.com

## Pourquoi ?

Le site est une SPA React. Les bots de recherche (Google, Bing) et les crawlers sociaux (Facebook, Twitter, LinkedIn) reçoivent une page quasi vide (`<div id="root"></div>`) car ils n'exécutent pas toujours le JavaScript. Un service de prerendering sert du HTML statique pré-rendu aux bots, ce qui améliore drastiquement l'indexation.

**Impact attendu** : indexation 60-70% → 95-100%, trafic organique ×3 à ×5.

---

## Étape 1 — Créer un compte Prerender.io (2 min)

1. Aller sur [prerender.io](https://prerender.io)
2. Créer un compte gratuit (250 pages/mois — suffisant pour ~111 URLs)
3. Copier votre **Prerender Token** depuis le dashboard

---

## Étape 2 — Configurer Cloudflare (10 min)

### 2.1 Créer un compte Cloudflare
1. Aller sur [cloudflare.com](https://cloudflare.com)
2. Créer un compte gratuit
3. Cliquer **"Add a site"** et entrer `alphalensai.com`
4. Choisir le plan **Free**

### 2.2 Changer les nameservers
1. Cloudflare affiche 2 nameservers (ex: `alice.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
2. Aller dans le panneau de contrôle de votre registrar (là où vous avez acheté le domaine)
3. Remplacer les nameservers actuels par ceux de Cloudflare
4. Attendre la propagation DNS (5 min à 24h, généralement < 1h)

### 2.3 Configurer le DNS
1. Dans Cloudflare > DNS, ajouter un enregistrement :
   - **Type** : CNAME
   - **Name** : `@` (ou `alphalensai.com`)
   - **Target** : l'URL Lovable actuelle (ex: `macro-trader-studio.lovable.app`)
   - **Proxy status** : ☁️ Orange (Proxied) — **OBLIGATOIRE**
2. Ajouter aussi un CNAME pour `www` :
   - **Type** : CNAME
   - **Name** : `www`
   - **Target** : `alphalensai.com`
   - **Proxy status** : ☁️ Orange (Proxied)

### 2.4 SSL/TLS
1. Aller dans SSL/TLS > Overview
2. Sélectionner **Full** (ou Full Strict si Lovable le supporte)

---

## Étape 3 — Déployer le Cloudflare Worker (5 min)

### 3.1 Créer le Worker
1. Dans Cloudflare, aller dans **Workers & Pages**
2. Cliquer **"Create Worker"**
3. Nommer le worker (ex: `alphalens-prerender`)
4. Copier-coller le contenu de `docs/cloudflare-prerender-worker.js`
5. Cliquer **"Deploy"**

### 3.2 Configurer le token Prerender
1. Dans le Worker, aller dans **Settings > Variables**
2. Ajouter une variable d'environnement :
   - **Name** : `PRERENDER_TOKEN`
   - **Value** : votre token prerender.io
   - Cocher **"Encrypt"**

### 3.3 Associer le Worker au domaine
1. Dans le Worker, aller dans **Triggers > Routes**
2. Ajouter une route :
   - **Route** : `alphalensai.com/*`
   - **Zone** : `alphalensai.com`
3. Ajouter aussi : `www.alphalensai.com/*`

---

## Étape 4 — Vérifier que ça marche

### Test rapide avec curl
```bash
# Simuler Googlebot
curl -A "Googlebot" https://alphalensai.com/ -I

# Vérifier le header X-Prerendered
# Vous devriez voir : X-Prerendered: true
```

### Test dans le navigateur
1. Ouvrir https://alphalensai.com normalement → SPA React (comportement normal)
2. Changer le User-Agent du navigateur en "Googlebot" → HTML pré-rendu

### Prerender.io Dashboard
1. Aller sur prerender.io > Dashboard
2. Vérifier que les pages apparaissent dans le cache
3. Vérifier les statuts (200, pas de 404/500)

---

## Étape 5 — Optimisations supplémentaires (optionnel)

### Recrawl automatique
Dans Prerender.io > Settings :
- Activer le recrawl automatique (toutes les 24-48h)
- Soumettre le sitemap : `https://alphalensai.com/sitemap.xml`

### Page Rules Cloudflare
Ajouter une règle de cache pour les assets statiques :
- **URL** : `alphalensai.com/images/*`
- **Cache Level** : Cache Everything
- **Edge Cache TTL** : 1 month

---

## Coûts

| Service | Plan | Coût |
|---------|------|------|
| Cloudflare | Free | 0 $/mois |
| Prerender.io | Free (250 pages) | 0 $/mois |
| **Total** | | **0 $/mois** |

Si le trafic bot dépasse 250 recrawls/mois, le plan Prerender.io Basic est à ~15$/mois (10 000 pages).

---

## Troubleshooting

| Problème | Solution |
|----------|----------|
| Pages non pré-rendues | Vérifier que le proxy Cloudflare est orange (pas gris) |
| Erreur 522/524 | Vérifier le CNAME vers Lovable et le mode SSL |
| Token invalide | Vérifier la variable `PRERENDER_TOKEN` dans les settings du Worker |
| Certaines pages manquantes | Soumettre le sitemap dans Prerender.io pour forcer le crawl |
| Cache périmé | Purger le cache dans Prerender.io ou ajuster le TTL |

---

## Résumé

1. ✅ Prerender.io → compte gratuit + copier le token
2. ✅ Cloudflare → DNS + proxy orange
3. ✅ Worker → copier le code, ajouter le token, associer la route
4. ✅ Tester avec `curl -A "Googlebot"`
5. 🎉 Les bots reçoivent du HTML complet, l'indexation explose
