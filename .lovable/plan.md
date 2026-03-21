

## Redistribuer les dates de publication des 68 articles

### Problème actuel
- 8 articles ont des dates **dans le futur** (22 mars → 5 avril 2026) — mauvais pour le SEO
- Les 10 articles quant (les derniers ajoutés) sont datés de nov-déc 2025, loin du haut de page
- Il y a un trou de 3 mois entre commodities (août 2025) et quant (nov 2025)
- 18 articles supplémentaires arrivent bientôt

### Nouvelle stratégie de dates
- **86 articles au total** (68 actuels + 18 à venir)
- Espacement : **4 jours** entre chaque article
- Date max : **21 mars 2026** (aujourd'hui)
- Les 18 prochains articles occuperont les dates les plus récentes (proches de mars 2026)
- Les 10 articles quant seront les plus récents parmi les 68 actuels

### Calcul
- Réserver 18 slots pour les futurs articles : dates du ~8 janv → 21 mars 2026
- Article actuel le plus récent (quant #10) : **~5 janvier 2026**
- Article actuel le plus ancien (Wave 1 #1) : **~25 avril 2025**
- 68 articles × 4 jours = 272 jours en arrière depuis le 5 janv 2026 → ~8 avril 2025

### Ordre des articles (du plus récent au plus ancien)
1. **Quant** (10 articles) — jan 2026 → nov 2025 — les derniers ajoutés = les plus récents
2. **Commodities** (7 articles) — nov 2025 → oct 2025
3. **Crypto** (5 articles) — oct 2025 → sept 2025
4. **FX Wave 2** (5 articles) — sept → août 2025
5. **FX Wave 1** (5 articles) — août → juil 2025
6. **Macro** (10 articles) — juil → juin 2025
7. **Signals/Research** (10 articles) — juin → mai 2025
8. **Wave 3 Research** (8 articles) — mai 2025
9. **Wave 1 foundational** (8 articles) — mai → avr 2025

### Exécution
1. **UPDATE `published_at`** pour les 68 articles via SQL (outil insert)
   - Date de départ : 25 avril 2025 (article le plus ancien)
   - Incrément : +4 jours par article
   - Dernière date : ~5 janvier 2026 (quant #10)
   - Variation ±1 jour pour paraître naturel

2. Pas de changement au sitemap ni au code — seules les dates changent

### Impact
- Les 10 articles quant apparaissent en premier sur `/blog`
- Aucune date dans le futur
- Rythme éditorial crédible (~1 article / 4 jours)
- 18 slots réservés pour les prochains batchs (janv-mars 2026)

