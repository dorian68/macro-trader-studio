

# Mise a jour de l'affichage des resultats du Trade Generator

## Changement 1 : Step 2 "Quant Validation" plie par defaut avec toggle

### Approche

Modifier le composant `NarrativeSection` pour accepter une prop optionnelle `defaultCollapsed`. Quand cette prop est `true`, le contenu (`children`) sera enveloppe dans un `Collapsible` avec un bouton fleche dans le header.

### Fichier : `src/pages/ForecastTradeGenerator.tsx`

**Interface `NarrativeSectionProps` (ligne 1519)**
- Ajouter `defaultCollapsed?: boolean`

**Composant `NarrativeSection` (lignes 1528-1566)**
- Ajouter un state local `const [open, setOpen] = useState(!defaultCollapsed)`
- Ajouter un bouton `ChevronDown` dans le header (a cote du tagline badge) qui toggle `open`
- Envelopper `{children}` dans un `Collapsible` controle par `open`
- Animation de rotation de la fleche : `rotate-180` quand ouvert

**Utilisation (ligne 2451)**
- Passer `defaultCollapsed={true}` uniquement au `NarrativeSection` du Step 2
- Steps 1 et 3 restent inchanges (pas de prop = toujours ouvert)

---

## Changement 2 : Tooltips visibles dans le tableau Risk Profiles

### Cause racine

Le conteneur du tableau a `overflow-x-auto` (ligne 1247) et la Card NarrativeSection a `overflow-hidden` (ligne 1537). Bien que les Tooltips Radix utilisent un portal vers `document.body`, le conteneur `overflow-x-auto` peut causer des problemes de positionnement sur certains navigateurs.

### Correction

**Ligne 1247** : Remplacer `overflow-x-auto` par `overflow-x-visible` ou supprimer le overflow sur le conteneur de la table Risk Profiles.

**Ligne 1537 (NarrativeSection Card)** : Retirer `overflow-hidden` de la Card pour ne pas creer de contexte de clipping.

**Verification z-index** : Le `TooltipContent` dans `tooltip.tsx` utilise deja `z-[10002]`, ce qui est suffisant. Aucune modification necessaire sur ce fichier.

---

## Ce qui ne change PAS

- Tout le contenu des sections (Market Thesis, Forecast Table, Risk Surface, Decision Layer)
- La logique de calcul des Risk Profiles
- Le composant `EnhancedForecastTable` et ses expandable rows
- Le payload API et les parametres hardcodes
- Le comportement du `PersistentToast`
- Les steps 1 et 3 restent toujours depliees par defaut

