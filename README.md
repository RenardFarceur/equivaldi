# EquiValdi · Carnet d'écurie

Application pour téléphone : chevaux, rations, soins, entraînement, prés, foin, concours et tâches partagées.
Elle s'installe depuis le navigateur, fonctionne sans réseau et se partage entre plusieurs personnes.

## Mise en route (une seule fois)

1. **Publier le site** : dans ce dépôt, ouvrir *Settings* › *Pages*. Sous *Build and deployment*, choisir *Deploy from a branch*, la branche `main` et le dossier `/ (root)`, puis *Save*. Après une à deux minutes, l'adresse du carnet s'affiche, du type `https://renardfarceur.github.io/equivaldi/`.
2. **Autoriser cette adresse dans Firebase** : console Firebase › *Authentication* › *Paramètres* › *Domaines autorisés* › *Ajouter un domaine* : `renardfarceur.github.io`.
3. **Coller les règles d'accès** : console Firebase › *Firestore Database* › *Règles*. Remplacer tout le contenu par celui du fichier [`firestore.rules`](firestore.rules), puis *Publier*.
4. **Créer le compte de la gérante** : ouvrir l'adresse du carnet, *Créer un compte* avec **celiacourtois8@gmail.com**, puis cliquer sur le lien de confirmation reçu par e-mail.
5. **Reprendre les données** : dans l'ancien carnet (sur Claude), *Réglages* › *Exporter*. Dans le nouveau, *Réglages* › *Restaurer* et choisir ce fichier.

## Installer sur le téléphone

- **iPhone** : ouvrir l'adresse dans Safari, bouton *Partager*, puis *Sur l'écran d'accueil*.
- **Android** : ouvrir l'adresse dans Chrome, menu ⋮, puis *Installer l'application* (ou *Ajouter à l'écran d'accueil*).

## Inviter l'équipe

*Réglages* › *Gérer l'équipe* : saisir l'adresse e-mail de la personne et choisir ses droits (*Peut modifier* ou *Lecture seule*). Envoyer ensuite le lien du carnet : la personne crée son compte avec cette adresse et confirme son e-mail.

## Fichiers

- `index.html` : l'application (construite à partir des sources du carnet)
- `sw.js` : fonctionnement sans réseau
- `manifest.webmanifest`, `icons/` : installation et icônes Cheval-feuille
- `firestore.rules` : règles d'accès à coller dans Firebase
