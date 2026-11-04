# EquiValdi · Carnet d'écurie

Application pour téléphone : chevaux, rations, soins, entraînement, prés, foin, concours, tâches partagées, équipe (qui fait quoi, dépenses, propriétaires et demi-pensions) et points crottins à échanger contre des récompenses.
Elle s'installe depuis le navigateur, fonctionne sans réseau et se partage entre plusieurs personnes. Chaque écurie a son propre espace ; une même personne peut appartenir à plusieurs écuries, avec un rôle différent dans chacune.

## Mise en route (une seule fois)

1. **Publier le site** : dans ce dépôt, ouvrir *Settings* › *Pages*. Sous *Build and deployment*, choisir *Deploy from a branch*, la branche `main` et le dossier `/ (root)`, puis *Save*. Après une à deux minutes, l'adresse du carnet s'affiche, du type `https://renardfarceur.github.io/equivaldi/`.
2. **Autoriser cette adresse dans Firebase** : console Firebase › *Authentication* › *Paramètres* › *Domaines autorisés* › *Ajouter un domaine* : `renardfarceur.github.io`.
3. **Coller les règles d'accès** : console Firebase › *Firestore Database* › *Règles*. Remplacer tout le contenu par celui du fichier [`firestore.rules`](firestore.rules), puis *Publier*. Ce sont elles qui empêchent quiconque de lire ou d'écrire dans une écurie dont il n'est pas membre (vérification cas par cas : [`sources/pwa/regles-verification.md`](sources/pwa/regles-verification.md)).
4. **Créer son compte** : ouvrir l'adresse du carnet, *Créer un compte* (prénom, adresse e-mail, mot de passe), puis cliquer sur le lien de confirmation reçu par e-mail. Aucune gérante n'est inscrite d'avance : la personne qui crée une écurie en devient la gérante.
5. **Créer son écurie** : à la première connexion, *Créer mon écurie* (nom, commune facultative). Pour reprendre un carnet sauvegardé : *Réglages* › *Restaurer* et choisir le fichier.

## Installer sur le téléphone

- **iPhone** : ouvrir l'adresse dans Safari, bouton *Partager*, puis *Sur l'écran d'accueil*.
- **Android** : ouvrir l'adresse dans Chrome, menu ⋮, puis *Installer l'application* (ou *Ajouter à l'écran d'accueil*).

## Inviter l'équipe

La gérante ouvre *Réglages* › *L'équipe et les invitations* (ou l'onglet *Équipe* › *Inviter, gérer les accès*) et choisit les droits : *Peut modifier* ou *Lecture seule*. Puis, au choix :

- **Partager un lien d'invitation** : l'appli prépare un lien valable 7 jours, pour une seule personne, et ouvre le partage du téléphone (sinon, le lien est copié). La personne ouvre le lien, crée son compte, confirme son adresse et rejoint l'écurie.
- **Le code du lien** (8 lettres et chiffres, affiché `ABCD-EF23`) se tape aussi à la main : *J'ai un code d'invitation* à la connexion, ou *Réglages* › *Rejoindre avec un code*. Utile sur iPhone, où l'appli installée ne voit pas un lien ouvert dans Safari.
- **Par adresse e-mail** : l'invitation attend la personne ; quand elle se connecte avec cette adresse, l'appli lui propose de rejoindre l'écurie.

Les invitations en attente s'affichent dans la même feuille (« Lien · expire le 10 nov. » ou l'adresse), avec *Annuler*. Dans l'onglet *Équipe*, chacun tient sa fiche (téléphone, jours de présence, matériel) et voit qui a fait quoi. Le propriétaire et les demi-pensions se notent dans la fiche de chaque cheval, rubrique *Propriété*.

## Plusieurs écuries

*Réglages* commence par **Mon écurie** : son nom, sa commune et ton rôle. La gérante peut *Modifier le nom* et *Passer la gérance* à une personne qui a le droit *Peut modifier* (une écurie a toujours une seule gérante). Les autres peuvent *Quitter cette écurie*. Dessous : tes autres écuries avec *Ouvrir*, puis *Créer une autre écurie* et *Rejoindre avec un code*.

Quand tu as au moins deux écuries, le nom court de celle qui est ouverte s'affiche en haut, à côté de la date : un repère pour ne pas noter dans la mauvaise écurie (le toucher ouvre *Mon écurie*). Changer d'écurie recharge l'appli. Une modification faite sans réseau reste rangée avec son écurie et ne part jamais vers une autre.

## Carte des prés

Onglet *Prés* › *Carte* : le plan des prés (13 parcelles, la carrière, le verger, la piste, les abris et les abreuvoirs), en 3D isométrique ou en vue de dessus (bouton 3D / 2D, gardé sur chaque téléphone). La couleur de chaque parcelle dit où en est la rotation ; les chevaux y sont posés et changent de pré quand on les fait glisser (ou vont au box). Une parcelle se relie à un pré du carnet en la touchant (ou dans la fiche du pré, *Sur la carte*). La piste et la carrière sont des espaces sans temps de repos ni de pâture.

## Points crottins

Chaque coup de main rapporte des crottins (compteur en haut de l'écran, qui ouvre la boutique) : tâches cochées (une tâche rare rapporte plus qu'une quotidienne), rendez-vous gérés, concours et podiums, séances, entretien des prés, foin. Annuler une action retire ses crottins. Les récompenses s'échangent dans la boutique ; la gérante marque le bon *offert* une fois la récompense donnée.

Chaque écurie a ses crottins : ils comptent à partir de sa création, et la gérante règle sa boutique dans *Réglages* › *Crottins* › *Modifier les récompenses* (nom, prix, icône et couleur ; ajouter, retirer, ou *Remettre la liste de départ*). L'interrupteur *Points crottins dans cette écurie* les coupe (plus de compteur, de boutique, d'animations ni de classement). Les bons déjà pris gardent leur nom et leur prix.

## Fichiers

- `index.html` : l'application (construite à partir des sources du carnet, dossier `sources/`)
- `sw.js` : fonctionnement sans réseau
- `manifest.webmanifest`, `icons/` : installation et icônes Cheval-feuille
- `firestore.rules` : règles d'accès à coller dans Firebase
