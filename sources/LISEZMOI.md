# Sources du carnet EquiValdi

Ces fichiers servent à reconstruire `index.html` à la racine du dépôt.

- `01-head.html` : charte (couleurs, polices, styles) ; `02-shell.html` : structure de la page
- `10-…` à `99-start.js` : le code de l'appli, assemblé dans l'ordre des numéros (`59-ecuries.js` : Mon écurie, l'équipe et les invitations ; `61-abonnement.js` : essai, abonnement, fonctions réservées, administration ; `64-carte.js` : la carte des prés ; `65-carte-editeur.js` : la créer à partir d'un plan ; `66-rubriques.js` : rubriques au choix ; `67-demarrage.js` : Bien démarrer ; `68-exemple.js` : l'écurie d'exemple ; `69-compte.js` : messages à EquiValdi, conditions, mes données, suppression du compte ; `70-pension.js` : propriétaires en pension, fiches partagées et relevés ; `71-sante.js` : poids et état corporel, documents à échéance, carnet de santé à imprimer ; `72-stocks.js` : aliments, litière et produits, durée du stock ; `73-etiquettes.js` : QR codes, fiches de box et étiquettes des prés à imprimer ; `74-agenda.js` : export des rendez-vous et rappels vers l'agenda du téléphone)
- `legal/` : gabarit et contenu des pages légales, coordonnées dans `identite.json` ; `fonts/` : polices hébergées avec l'appli
- `brand-mark.svg`, `brand-logo.svg` : logo Cheval-feuille
- `pwa/` : connexion Firebase et écuries (`firebase.js`), mode hors ligne, règles d'accès (`firestore.rules`, vérifiées dans `regles-verification.md`)

Données dans Firestore : chaque écurie sous `structures/{id}/…` (ses chevaux, soins, prés, foin, concours, tâches, équipe, réglages, sa carte des prés dans `config/carte` et l'image de son plan dans `config/plan`) ; `utilisateurs/{uid}` liste les écuries de chacun ; `invitations/{code}` garde les invitations par lien, par code ou par e-mail ; `retours/{id}` les messages « Une idée, un souci ? » et leurs réponses. L'écurie porte aussi `vu` (dernière ouverture), et sous elle `partages/{cheval}` (ce que voit un propriétaire) et `releves/{proprio}_{mois}`. Sur le téléphone, l'écurie ouverte est notée dans `equivaldi:ecurie:v1`, et sa copie locale et sa file d'envoi portent son identifiant.

Reconstruire : `python3 sources/build-pwa.py` depuis la racine du dépôt (les icônes de `icons/` restent telles quelles).
