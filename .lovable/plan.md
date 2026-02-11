

# Mise a jour Privacy Policy et Terms of Service -- Standards 2026

## Contexte

Les pages actuelles datent de janvier 2025. Les fichiers de traduction EN utilisent des cles plates (`terms.section1Title`) tandis que les TSX attendent des cles imbriquees (`terms.acceptance.title`), ce qui cause deja des textes manquants. La mise a jour corrigera cette incoherence et ajoutera les sections requises par les reglementations 2026.

## Sections a ajouter (conformite 2026)

### Terms of Service -- nouvelles sections
- **Transparence IA (EU AI Act)** : divulgation que le contenu est genere par IA, pas de conseil financier personnalise
- **Traitement automatise des decisions** : explication des algorithmes utilises et droit de contestation
- **Conservation des donnees** : durees de retention par categorie
- **Loi applicable et juridiction** : clause de droit applicable
- **Restriction d'age** : 18 ans minimum pour utiliser le service
- **Modifications des conditions** : processus de notification des changements

### Privacy Policy -- nouvelles sections
- **Base legale du traitement (GDPR Art. 6)** : consentement, execution du contrat, interet legitime
- **Transferts internationaux de donnees** : mecanismes de transfert (clauses contractuelles types)
- **Durees de conservation** : tableau par type de donnee
- **Profilage et decisions automatisees** : droit de s'y opposer
- **Droit a la portabilite** : export des donnees en format standard
- **Delegue a la Protection des Donnees (DPO)** : contact dedie
- **Droits specifiques EU AI Act** : transparence sur l'utilisation de l'IA

## Fichiers impactes

### 1. `src/locales/en/legal.json` -- Reecriture complete
- Restructurer les cles pour correspondre au format attendu par les TSX (cles imbriquees)
- Ajouter toutes les nouvelles sections
- Mettre a jour la date a "February 2026"
- Copyright 2026

### 2. `src/locales/es/legal.json` -- Reecriture complete
- Traduire tout le contenu mis a jour en espagnol
- Meme structure de cles que EN

### 3. `src/locales/fa/legal.json` -- Reecriture complete
- Traduire tout le contenu mis a jour en farsi
- Meme structure de cles que FA actuel (deja au bon format)

### 4. `src/pages/Terms.tsx` -- Mise a jour du composant
- Ajouter les Cards pour les nouvelles sections (IA, age, conservation, juridiction, modifications)
- Harmoniser les cles de traduction avec le nouveau JSON
- Utiliser le composant `Footer` importe au lieu du footer inline

### 5. `src/pages/Privacy.tsx` -- Mise a jour du composant
- Ajouter les Cards pour les nouvelles sections (base legale, transferts, retention, profilage, DPO, AI Act)
- Harmoniser les cles de traduction
- Utiliser le composant `Footer` importe au lieu du footer inline

## Structure des cles (standardisee)

```text
terms.title
terms.lastUpdated
terms.acceptance.title / .description
terms.service.title / .description / .feature1-4
terms.responsibilities.title / .intro / .item1-5
terms.disclaimer.title / .warning / .description / .advice
terms.ai.title / .description / .item1-4          <-- NOUVEAU
terms.subscription.title / .item1-5
terms.intellectual.title / .description
terms.liability.title / .description
terms.dataRetention.title / .description / .item1-4  <-- NOUVEAU
terms.age.title / .description                       <-- NOUVEAU
terms.availability.title / .description
terms.governing.title / .description                 <-- NOUVEAU
terms.changes.title / .description                   <-- NOUVEAU
terms.contact.title / .description / .email

privacy.title
privacy.lastUpdated
privacy.collection.title / .description / .item1-4
privacy.legalBasis.title / .description / .item1-4    <-- NOUVEAU
privacy.usage.title / .intro / .item1-5
privacy.security.title / .description / .item1-4
privacy.sharing.title / .description / .item1-4
privacy.transfers.title / .description / .item1-3     <-- NOUVEAU
privacy.retention.title / .description / .item1-4     <-- NOUVEAU
privacy.profiling.title / .description                 <-- NOUVEAU
privacy.aiTransparency.title / .description / .item1-3 <-- NOUVEAU
privacy.rights.title / .intro / .item1-6
privacy.cookies.title / .description
privacy.dpo.title / .description / .email              <-- NOUVEAU
privacy.contact.title / .description / .email
```

## Ce qui ne change pas

- Le routing (`/terms`, `/privacy`)
- Le layout general (PublicNavbar + Cards + Footer)
- Les autres pages et composants
- La logique i18n existante
- L'identite visuelle (bleu #002244, orange #f97316)

