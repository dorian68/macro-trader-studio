

# Refonte ergonomique de la page History -- Affichage client-ready

## Probleme actuel

Chaque item de l'historique affiche des informations techniques inutiles pour un client :
- Badge "Job: d537baf4..." visible
- Label "Query:" dans un bloc gris avec style developpeur
- Label "Response Preview:" en texte minuscule
- Boutons "Expand" / "Collapse" avec texte (au lieu d'un simple chevron)
- En mode expanse : bloc "Complete Query" redondant + label "AI Response" au-dessus du contenu
- Les composants `TradeSetupDisplay` et `MacroCommentaryDisplay` affichent chacun un bloc "Original Query" qui fait doublon avec le header

## Solution

Nettoyer l'affichage pour un rendu professionnel en un seul fichier : `src/components/AIInteractionHistory.tsx`.

## Fichier modifie : `src/components/AIInteractionHistory.tsx`

### 1. Item collapsed (lignes 996-1058)

**Avant :**
```
[icone] [Badge Feature] [Calendar date] [Job: d537baf4...]
        Query:
        texte de la requete...
        Response Preview:
        resume de la reponse...                    [Expand v]
```

**Apres :**
```
[icone] [Badge Feature]  date relative             [v]
        Texte de la requete (1 ligne, sans label)
        Resume de la reponse (1 ligne, muted)
```

Changements concrets :
- Supprimer le badge `Job: {interaction.job_id.slice(0, 8)}...` (lignes 1013-1016)
- Supprimer le bloc `bg-muted/30` "Query:" (lignes 1021-1026) et le remplacer par un simple `<p>` avec le texte de la query, `line-clamp-1`, sans label
- Supprimer le label "Response Preview:" (ligne 1031) et garder juste le texte du resume en `line-clamp-1 text-muted-foreground`
- Remplacer le bouton "Expand/Collapse" avec texte par un simple chevron sans texte (supprimer les `<span>` "Expand" et "Collapse")

### 2. Item expanded (lignes 1062-1082)

**Avant :**
```
--- border-t ---
Complete Query
texte mono dans bg gris...
AI Response
[TradeSetupDisplay avec Original Query card]
```

**Apres :**
```
--- border-t ---
[TradeSetupDisplay SANS Original Query card]
```

Changements concrets :
- Supprimer le bloc "Complete Query" (lignes 1066-1073) -- la query est deja visible dans le header
- Supprimer le label `<h4>AI Response</h4>` (ligne 1077) -- le contenu parle de lui-meme
- Passer `originalQuery={undefined}` aux composants `TradeSetupDisplay` et `MacroCommentaryDisplay` pour empecher l'affichage de leur carte "Original Query" interne (car deja dans le header de l'item)

### 3. Amelioration du resume (extractSummary)

- Pour Macro Commentary en texte brut : extraire l'instrument du texte (ex: "EUR/USD") et le bias ("Bearish 70%") au lieu de la premiere ligne brute
- Pour AI Trade Setup : format "EUR/USD - Long - Entry 1.1784" au lieu du texte technique actuel

### 4. Extraction intelligente du titre (extractItemTitle)

Nouvelle fonction pour extraire un titre lisible :
- Macro Commentary : chercher l'instrument dans le texte (regex sur paires forex, indices, etc.) puis afficher "EUR/USD Macro Analysis"
- AI Trade Setup : extraire `instrument` + `direction` du payload
- Report : extraire le H1/H2 du HTML
- Affiche ce titre comme ligne principale au lieu du user_query brut

### 5. Code mort a supprimer

- `renderStructuredFallback` (lignes 818-839) -- plus utilise, les fallbacks sont geres par les composants existants
- `renderStructuredResponse` (lignes 842-914) -- plus utilise
- `renderTradeSetupFallback` (lignes 665-815) -- remplace par `TradeSetupDisplay` directement

### Ce qui ne change PAS

- Les composants `TradeSetupDisplay`, `MacroCommentaryDisplay`, `DecisionSummaryCard` restent intacts
- La logique de pagination, filtrage, refresh
- Le deep extraction (`deepExtractContent`, `deepExtractUserQuery`)
- La structure de la page `History.tsx`

