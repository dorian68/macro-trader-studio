

# Remplir la page Documentation -- Corriger les cles i18n et enrichir le contenu

## Probleme actuel

La page Documentation affiche des cles de traduction manquantes partout. Le composant TSX attend des cles comme `gettingStarted.quickStart.title`, `faq.question1`, `features.aiSetup.title`, mais les fichiers JSON utilisent des cles differentes (`gettingStarted.quickStart` en string plate, `faq.q1Title`, `features.aiTradeSetup.title`).

Resultat : la page est quasiment vide avec des cles brutes affichees.

## Modifications

### 1. `src/locales/en/documentation.json` -- Restructuration complete

Adapter toutes les cles pour correspondre exactement a ce que le TSX attend :

```text
Avant (JSON)                    -> Apres (pour matcher le TSX)
gettingStarted.quickStart       -> gettingStarted.quickStart.title
gettingStarted.step1Title       -> gettingStarted.quickStart.step1
gettingStarted.step1Desc        -> gettingStarted.quickStart.step1Description
gettingStarted.creditsTitle     -> gettingStarted.credits.title
gettingStarted.creditsIntro     -> gettingStarted.credits.description
gettingStarted.creditsTradeSetup-> gettingStarted.credits.tradeSetup
gettingStarted.creditsNote      -> gettingStarted.credits.resetInfo
features.aiTradeSetup.*         -> features.aiSetup.*
aiSetup.step1Title              -> aiSetup.step1
aiSetup.step1Desc               -> aiSetup.step1Description
faq.q1Title                     -> faq.question1
faq.q1Answer                    -> faq.answer1
```

### 2. `src/locales/es/documentation.json` -- Meme restructuration en espagnol

### 3. `src/locales/fa/documentation.json` -- Meme restructuration en farsi

### 4. `src/pages/Documentation.tsx` -- Ajout du Footer

- Remplacer le footer inline par le composant `Footer` importe (coherence avec Terms/Privacy)
- Mettre a jour le copyright a 2026

## Ce qui ne change pas

- La structure du composant (Tabs, Cards, layout)
- Les routes
- Les autres pages
- Le contenu metier reste le meme, seules les cles sont reorganisees

