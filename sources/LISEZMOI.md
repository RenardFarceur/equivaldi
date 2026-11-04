# Sources du carnet EquiValdi

Ces fichiers servent à reconstruire `index.html` à la racine du dépôt.

- `01-head.html` : charte (couleurs, polices, styles) ; `02-shell.html` : structure de la page
- `10-…` à `99-start.js` : le code de l'appli, assemblé dans l'ordre des numéros (`59-ecuries.js` : Mon écurie, l'équipe et les invitations)
- `brand-mark.svg`, `brand-logo.svg` : logo Cheval-feuille
- `pwa/` : connexion Firebase et écuries (`firebase.js`), mode hors ligne, règles d'accès (`firestore.rules`, vérifiées dans `regles-verification.md`)

Données dans Firestore : chaque écurie sous `structures/{id}/…` (ses chevaux, soins, prés, foin, concours, tâches, équipe, réglages) ; `utilisateurs/{uid}` liste les écuries de chacun ; `invitations/{code}` garde les invitations par lien, par code ou par e-mail. Sur le téléphone, l'écurie ouverte est notée dans `equivaldi:ecurie:v1`, et sa copie locale et sa file d'envoi portent son identifiant.

Reconstruire : `python3 sources/build-pwa.py` depuis la racine du dépôt (les icônes de `icons/` restent telles quelles).
