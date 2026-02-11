Patch UX: PersistentToast — Ergonomie améliorée, contrôle total utilisateur (sans régression)
Contexte / Intention

Je ne veux pas introduire de logique qui “décide à la place de l’utilisateur” (auto-dismiss, timers, fermeture automatique, suppression en masse par défaut).
Un utilisateur peut vouloir conserver certains jobs terminés pour les consulter plus tard.

➡️ L’objectif est uniquement d’améliorer l’ergonomie et la fluidité, en laissant le contrôle total à l’utilisateur, et sans régression.

Diagnostic (problèmes UX actuels)

Fermeture/gestion laborieuse quand plusieurs jobs sont présents : trop de micro-actions, pas assez clair.

Manque de contrôle fin : l’utilisateur doit pouvoir gérer facilement job par job.

Lisibilité : quand il y a plusieurs jobs (actifs + terminés), l’utilisateur doit comprendre rapidement :

ce qui est en cours

ce qui est terminé

ce qui demande une action (voir résultat)

Scrollbars et bruit visuel : certains comportements/éléments nuisent à l’esthétique et à la sensation “produit premium”.

Principes UX à respecter (non négociables)

✅ Zéro auto-dismiss / zéro timer : rien ne disparaît tout seul.

✅ Pas de “Dismiss All” automatique ou agressif.
(Optionnel : un bouton de gestion globale peut exister uniquement si c’est explicite, non destructif, et jamais déclenché par défaut.)

✅ L’utilisateur garde la main : il peut minimiser, fermer, archiver ou marquer comme vu individuellement.

✅ Sans régression : ne pas casser la logique jobs/realtime/session/toasters/navigation.

Solution demandée (UX seulement)
1) Gestion claire “job par job”

Le bouton X doit fermer uniquement le job actuellement affiché (ou l’item visé), jamais les autres.

Les jobs terminés restent disponibles tant que l’utilisateur ne les ferme/mark pas explicitement.

2) Navigation multi-jobs plus ergonomique

Quand plusieurs jobs existent, afficher une navigation claire (ex. compteur “Job 2/5”, chips, tabs, ou liste compacte) pour passer d’un job à l’autre sans friction.

Les jobs actifs et terminés doivent être clairement distingués (icône/status + label).

3) Minimisation plus intelligente mais non destructive

Minimiser doit seulement réduire l’encombrement visuel, sans supprimer d’info.

La bulle minimisée doit être plus informative :

afficher un compteur (ex. actifs/terminés)

indiquer visuellement si un résultat attend d’être consulté

Un clic sur la bulle réouvre le toast (comportement simple, prévisible).
Pas de fermeture implicite.

4) Esthétique premium (réduction des scrollbars et du bruit)

Réduire au maximum les scrollbars visibles et les comportements “bruyants”.

Si overflow nécessaire, privilégier :

layout compact

pagination / navigation interne propre

hauteurs maîtrisées
au lieu d’un gros scroll interne qui casse l’UI.

Changements attendus (fichiers)

src/components/PersistentToast.tsx : ajustements UX (navigation, contrôles job par job, minimisation plus informative, pas de timer)

src/components/PersistentNotificationProvider.tsx : uniquement si nécessaire pour supporter une meilleure UX (mais sans logique auto)

Ce qui ne doit pas changer (zéro régression)

Création jobs (realtime INSERT)

Completion jobs (realtime UPDATE)

Système de crédits

Navigation, sessionStorage injection, redirections existantes

Composants existants (MiniProgressBubble, DiscreetJobStatus, etc.) sauf retouches UI strictement nécessaires

Résultat attendu

UX plus fluide, plus claire, plus “premium”

Multi-jobs gérable sans effort

Contrôle total utilisateur : rien ne se ferme/se supprime tout seul

Aucune régression fonctionnelle