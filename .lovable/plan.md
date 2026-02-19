

# Refonte Full Screen AURA -- Match Screenshot Exactly

## Apercu

Refactoring UI uniquement du mode fullscreen d'AURA pour passer d'un "chat app classique" a un "terminal d'analyse quant moderne". Aucune modification de la logique metier, des appels API, du routing, du streaming ou des widgets.

## Changements detailles

### 1. Background et Layout global (lignes 1047-1052)

- Background fullscreen passe de `#0f1117` a `#0e1116` (plus sombre)
- Suppression du `border-l border-border` en fullscreen (effet "boxed")
- Le container principal reste centre via `max-w-5xl mx-auto`

### 2. Header fullscreen (lignes 1054-1111)

- Suppression du `border-b` visible en fullscreen -- remplace par un separateur ultra-subtil `border-white/[0.03]`
- Background header aligne sur le meme `#0e1116` (pas de gradient)
- Boutons header : seul le bouton Minimize2 reste visible, positionne en haut a droite, style ghost discret

### 3. Messages -- Suppression du style "bulles" en fullscreen (lignes 1160-1179)

C'est le changement principal selon le screenshot :

- **Assistant messages** : suppression du fond `bg-[#212121]` et du `rounded-2xl` en fullscreen. Le texte est pose directement sur le background, sans conteneur. Couleur texte `text-[#c8c8c8]` (gris clair doux).
- **User messages** : conserve un fond subtil `bg-[#1a1f1e]` avec `rounded-2xl` pour differencier, texte `text-white`. Plus discret que l'actuel `#2f3e36`.
- Suppression du `max-w-[90%]` pour les messages assistant en fullscreen -- le texte prend toute la largeur du conteneur `max-w-5xl`.
- Les messages user restent alignes a droite avec `max-w-[70%]`.

### 4. Typographie (renderMarkdown, lignes 274-334)

En fullscreen, adaptation de la hierarchie :
- `h2` : `text-lg font-semibold` (pas bold brut)
- `h3` : `text-base font-semibold`
- `h4` : `text-[15px] font-semibold`
- Paragraphes : `text-[15px] leading-relaxed text-[#c8c8c8]`
- Bullet points : `list-none` avec un `before:content-['•']` minimal, espacement genereux `space-y-2`
- Spacing vertical entre blocs : `space-y-1.5` (plus aere)
- Suppression de tout conteneur/carte autour des blocs texte

### 5. Input Bar fullscreen (lignes 1252-1291)

Refonte complete pour matcher le screenshot :
- Forme pill : `rounded-full` (deja en place, confirme)
- Fond : passe de `#1a1d27` a `#161b22` (plus subtil)
- Ombre : `shadow-[0_2px_12px_rgba(0,0,0,0.4)]`
- Icone Search a gauche (deja present)
- Ajout d'un badge "model selector" a cote de l'icone (ex: badge "AURA v2" en `text-xs text-muted-foreground`)
- Bouton Send : `rounded-full` avec gradient orange-primary
- Placeholder plus subtil : `placeholder:text-white/30`
- Hauteur input : `h-14` (deja en place)
- Suppression du `border-t` en fullscreen, remplace par rien (floating)
- Padding bottom plus genereux `pb-8` pour que l'input "flotte"

### 6. Loading indicator en fullscreen (lignes 1222-1231)

- Suppression du fond `bg-muted rounded-lg` en fullscreen
- Simple texte avec spinner, directement sur le background
- Style : `text-[#888] text-sm` avec `Loader2` anime

### 7. Empty state en fullscreen (lignes 1116-1157)

- Quick actions : style `ghost` au lieu de `outline`, sans bordure visible
- Texte d'accueil centre, taille plus grande `text-base`
- Suppression des boutons encadres

### 8. Animations

- Messages : `animate-in fade-in-50 duration-300` (deja en place, augmente a `duration-300`)
- Scroll auto smooth : deja implemente via `behavior: 'smooth'`

## Fichier modifie

`src/components/AURA.tsx` uniquement

## Ce qui ne change PAS

- Routing / intents / feature-mapper
- Appels API (supabase.functions.invoke, n8n webhooks)
- Widgets mini (AuraMiniTradeSetup, AuraMiniMacro, AuraMiniReport)
- MarketChartWidget / chart attachments
- Logique de streaming / job badges / realtime subscriptions
- Mode sidebar (non-fullscreen) -- inchange
- Raccourci ESC pour fermer le fullscreen
- Sauvegarde localStorage des conversations

