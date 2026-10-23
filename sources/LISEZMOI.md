# Sources du carnet EquiValdi

Ces fichiers servent à reconstruire `index.html` à la racine du dépôt.

- `01-head.html` : charte (couleurs, polices, styles) ; `02-shell.html` : structure de la page
- `10-…` à `99-start.js` : le code de l'appli, assemblé dans l'ordre des numéros
- `brand-mark.svg`, `brand-logo.svg` : logo Cheval-feuille
- `pwa/` : connexion Firebase, mode hors ligne, règles d'accès

Reconstruire : `python3 sources/build-pwa.py` depuis la racine du dépôt (les icônes de `icons/` restent telles quelles).
