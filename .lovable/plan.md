

## Ajouter 1 nouvelle image pour splitter le dernier groupe a 4

### Etat actuel

Le plus gros groupe est `cover-frankfurt.jpg` avec 4 articles. Tous les autres sont a 3 ou moins. Total: 30 images pour 86 articles.

### Mapping

| Image | Fichier cible | Articles reassignes |
|-------|--------------|---------------------|
| Coins jar (pieces + bocal) | `cover-coin-jar.jpg` | 2 du groupe frankfurt: `ai-model-governance-finance`, `research-automation-buy-side` |

### Resultat

- `cover-frankfurt.jpg`: 4 → 2 articles
- `cover-coin-jar.jpg`: 2 articles
- Total: **31 images uniques**, max **3** par image partout

### Execution

1. Copier l'image dans `public/images/blog/cover-coin-jar.jpg`
2. 1 migration SQL UPDATE 2 articles
3. Aucun changement de code

