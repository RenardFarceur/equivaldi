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

## Abonnement

- **Essai gratuit de 2 mois, sans carte bancaire**, dès la création d'une écurie. Pendant l'essai : tout le carnet, avec 2 chevaux au plus ; la carte des prés et les points crottins sont réservés aux écuries abonnées (aperçu et bouton *S'abonner*).
- **Après l'essai sans abonnement** : lecture seule. Tout reste consultable et exportable ; la gérante voit *S'abonner*, les autres membres un message.
- **Formules** (depuis le 12 novembre 2026) : « À la maison » 5 € par mois ou 50 € par an ; « Pro » 20 € par mois ou 200 € par an, avec les propriétaires en pension et leurs relevés (2 mois offerts à l'année). Changer de formule prend effet tout de suite, les jours restants convertis au prix de la nouvelle. L'essai comprend la pension. Payées par la gérante dans *Réglages* › *Mon écurie* › *S'abonner*. Payer pendant l'essai ne fait rien perdre : tout se débloque tout de suite, et la période payée commence à la fin de l'essai (de même, un nouveau paiement s'ajoute à la suite de l'abonnement en cours).
- **Paiement fictif pour l'instant** (« Payer 5 € (démo) », rien n'est débité). Pour brancher Shine ou Tebex : remplacer l'étape *Paiement* (`feuillePaiement` dans `sources/61-abonnement.js`) par le lien de paiement du prestataire ; faire enregistrer l'abonnement par un serveur qui reçoit la confirmation du paiement, ou par l'administration (*Paiement reçu*) ; puis retirer des règles la ligne du paiement de démonstration (`paiementFictif`).
- **À vie** (formule Pro) : l'écurie fondatrice et toutes celles créées avant le 6 novembre 2026 à 12 h.

## Administration

Le compte **bennizdu03@gmail.com** est l'administration EquiValdi : *Réglages* › *Administration* › *Toutes les écuries* (ou, s'il n'a pas d'écurie à lui, le bouton sur l'écran d'accueil). Pour chaque écurie : l'état de l'abonnement, la gérante, l'équipe, le dernier paiement, et *Ouvrir l'écurie*, *Prolonger l'essai d'un mois*, *Paiement reçu* (1 mois ou 1 an), *Passer à vie*, *Arrêter l'abonnement*.

Les cartes des prés demandées par les gérantes apparaissent en tête (*Cartes des prés à dessiner*, avec leur note) : *Dessiner la carte* ouvre l'écurie directement sur l'outil de tracé, avec le plan envoyé ; une fois la carte publiée, la demande passe à « faite ».

Une écurie ouverte par l'administration affiche « Admin » en haut et un bandeau. L'administration n'apparaît dans aucune équipe, aucun classement, aucune liste de personnes ; ce qu'elle note est signé « EquiValdi » dans le fil de l'équipe. Pour changer de compte d'administration : modifier l'adresse dans `firestore.rules` (fonction `admin`) et dans `sources/pwa/firebase.js` (`ADMIN_MAIL`), reconstruire, puis recoller les règles.

## Carte des prés

Onglet *Prés* › *Carte* : la maquette des prés de l'écurie, en 3D isométrique ou en vue de dessus (bouton 3D / 2D, gardé sur chaque téléphone). La couleur de chaque parcelle dit où en est la rotation ; les chevaux y sont posés et changent de pré quand on les fait glisser (ou vont au box). Une parcelle se relie à un pré du carnet en la touchant (ou dans la fiche du pré, *Sur la carte*). La piste et la carrière sont des espaces sans temps de repos ni de pâture. La carte est réservée aux écuries abonnées (ou à vie).

**Créer la carte de son écurie** (la gérante : *Créer ma carte*, puis *Modifier la carte* sous la carte) :

1. **Le plan** : une vue du dessus de tous les prés (capture de Géoportail conseillée, vue satellite ou plan à l'échelle), avec une échelle visible, le nord en haut si possible. L'image est réduite (2 000 px au plus) et rangée dans l'écurie.
2. **L'échelle** : toucher les deux bouts de la barre d'échelle (ou d'une longueur connue), indiquer sa longueur, *Valider l'échelle*.
3. **Les espaces** : *Pré* (numéroté ; *Pré suivant* pour enchaîner), *Carrière*, *Piste* (le milieu, de point en point ; une boucle se ferme sur le premier point ; largeur réglable), *Verger*, *Abri* (deux coins opposés), *Abreuvoir*. On touche les coins ; ceux des prés voisins s'attrapent tout seuls. Toucher un espace le choisit : coins à faire glisser, points du milieu pour en ajouter, numéro, *Supprimer*.
4. **La maquette** : l'appli remet le parcellaire d'équerre et ajoute le socle, les pommiers du verger et les obstacles de la carrière ; *Tourner* change l'angle de vue, la vue de dessus reste orientée comme le plan. *Publier la carte* la montre à toute l'équipe, et peut ajouter au carnet les espaces qui n'y sont pas encore (Pré 1, Pré 2…).

Le tracé s'enregistre au fil de l'eau : on peut s'arrêter et reprendre plus tard. L'écurie fondatrice garde sa carte d'origine (elle peut la refaire à partir d'un plan).

**Ou EquiValdi la dessine** : une fois le plan envoyé, *EquiValdi la dessine pour moi*, avec une note (numéros des prés, où sont la piste, la carrière, les abris et les abreuvoirs ; le plus sûr est d'annoter la capture avant de l'envoyer). L'onglet *Prés* affiche « Ta carte est en préparation » jusqu'à ce qu'elle soit publiée.


**Depuis une adresse (12 novembre 2026)** : à la première étape, la gérante cherche l'adresse de l'écurie (géocodage de la Géoplateforme de l'IGN) ou prend sa position. La vue aérienne de l'IGN (photographies aériennes, 4 × 4 tuiles, ≈ 420 m de côté au niveau 18) s'affiche nord en haut ; on la décale d'une tuile avec les flèches, *Plus large* / *Plus près*, puis *Utiliser cette vue* : l'échelle est posée toute seule (barre de 50 m) et on passe directement au tracé des prés. Le plan enregistré (`config/plan`, `source: 'ign'`) ne garde que les coordonnées des tuiles, relues chez l'IGN. L'envoi d'une image reste possible.

## Démarrer, exemple, rubriques (11 novembre 2026)

- **Bien démarrer** : sur l'accueil d'une écurie de moins de 2 mois, une liste de premiers pas qui se cochent toute seule (rubriques, chevaux, prés, tâches, soins, équipe). *Masquer* la range sur ce téléphone.
- **Écurie d'exemple** : *Visiter l'écurie d'exemple* sur l'écran de connexion (sans compte), dans *Bien démarrer*, ou par le lien `https://renardfarceur.github.io/equivaldi/?exemple` (site, QR code). Cinq chevaux, la carte des prés, une rotation, des soins, des concours et une équipe inventés. On visite en tant que Camille, la gérante ; tout se touche, rien ne part en ligne, tout repart à zéro en sortant (*Créer mon compte*, *Quitter l'exemple* ou *Revenir à mon écurie*). Le contenu est fabriqué par `sources/68-exemple.js`.
- **Rubriques** : la gérante masque Prés, Foin, Concours ou Entraînement pour toute l'écurie (*Réglages* › *Rubriques*). Onglets, actions rapides, alertes, agenda, fiches et barème des crottins suivent. Rien n'est effacé.

## Messages, conditions et compte

- **Une idée, un souci ?** (*Réglages*) : le message part chez EquiValdi avec le prénom, l'adresse, l'écurie, le rôle et le modèle du téléphone. L'administration le lit en tête de son écran (ou de la console) et répond ; la réponse apparaît dans les réglages de la personne, avec une notification à l'ouverture.
- **Dernière activité** : l'appli note sur l'écurie la date de la dernière ouverture (une fois par 12 h au plus). La console d'administration affiche « ouverte il y a N j », le nombre d'écuries ouvertes sur 7 jours et un filtre *Calmes* (rien depuis 14 jours).
- **Pages légales** : `legal/mentions-legales.html`, `legal/conditions.html` (utilisation et vente), `legal/confidentialite.html`, liées depuis la connexion, la création de compte, le paiement et *Réglages* › À propos. Les coordonnées viennent de `sources/legal/identite.json` : un champ vide s'affiche en jaune « à compléter ». À faire relire par un juriste avant le vrai paiement.
- **Acceptation** : case obligatoire à la création du compte, et une fois pour les comptes d'avant (bandeau sur l'accueil) ; notée dans `utilisateurs/{uid}.conditions`. Case des conditions de vente avant de payer.
- **Mes données, supprimer mon compte** (*Réglages* › *Ton compte*) : téléchargement JSON (compte, fiches, messages) ; suppression avec le mot de passe. Une gérante seule dans son écurie la supprime avec tout son carnet ; avec une équipe, elle passe d'abord la gérance.
- **Polices** : Outfit et Barlow Condensed sont hébergées avec l'appli (`fonts/`, licence SIL OFL) : plus rien n'est chargé chez Google Fonts.

## Propriétaires en pension (formule Pro)

- **Rôle « Propriétaire »** : à choisir en invitant quelqu'un (lien, code ou e-mail) ou en changeant son rôle dans *L'équipe*. La personne voit seulement ses chevaux (fiche, ration, soins, séances, concours, pré du moment) et ses relevés : trois onglets, *Accueil*, *Chevaux*, *Relevés*. Rien d'autre de l'écurie (autres chevaux, tâches, dépenses, équipe) n'est lisible, même en interrogeant la base directement.
- **Fiches partagées** : pour chaque cheval dont le propriétaire a ce rôle, l'appli de l'équipe tient à jour `structures/{id}/partages/{cheval}` dès que le carnet change ; le propriétaire ne lit que ces fiches-là.
- **Pension** : montant par mois dans la fiche du cheval (*Propriété* › propriétaire). *Équipe* › *Pension* liste chaque propriétaire avec le total du mois : la pension, plus les soins, cours et engagements avancés par l'écurie (payés par quelqu'un d'autre que le propriétaire). La gérante écarte une ligne, en ajoute une, puis *Envoyer à …* (le propriétaire le voit dans *Relevés*), *Copier le texte* (pour un propriétaire sans compte) et *Marquer réglé*. Relevés dans `structures/{id}/releves/{proprio}_{mois}`.

## Santé du cheval

- **Poids et état** (onglet Soins de chaque cheval) : une pesée note le poids, le tour de poitrine et l'état corporel (0 à 5, grille de l'IFCE). Sans balance, le tour de poitrine suffit : le poids est estimé avec les formules de l'INRA (chevaux de selle, poneys, traits ; à 25 kg près, il faut la taille dans la fiche). Une courbe montre l'évolution, et le poids de la fiche suit la dernière pesée.
- **Documents** (onglet Fiche) : assurance, livret, carte d'immatriculation, certificat sanitaire, contrat… avec numéro et échéance. L'accueil prévient un mois avant, puis signale le document échu.
- **Carnet de santé** (onglet Soins) : identité, rappels, vaccins, vermifuges, soins et visites, poids, ration, documents, sur une page à montrer au vétérinaire, à imprimer ou à enregistrer en PDF.
- **Surface par cheval** : chaque pré occupé affiche la surface par cheval. Dans les réglages (Alertes et prés), un minimum par cheval (par exemple 0,5 ha) fait signaler un pré trop chargé ; vide, pas d'alerte.
- Tout est rangé dans la fiche du cheval : la propriétaire en pension le voit, la sauvegarde l'emporte.

## Points crottins

Chaque coup de main rapporte des crottins (compteur en haut de l'écran, qui ouvre la boutique) : tâches cochées (une tâche rare rapporte plus qu'une quotidienne), rendez-vous gérés, concours et podiums, séances, entretien des prés, foin. Annuler une action retire ses crottins. Les récompenses s'échangent dans la boutique ; la gérante marque le bon *offert* une fois la récompense donnée.

Chaque écurie a ses crottins : ils comptent à partir de sa création, et la gérante règle sa boutique dans *Réglages* › *Crottins* › *Modifier les récompenses* (nom, prix, icône et couleur ; ajouter, retirer, ou *Remettre la liste de départ*). L'interrupteur *Points crottins dans cette écurie* les coupe (plus de compteur, de boutique, d'animations ni de classement). Les bons déjà pris gardent leur nom et leur prix.

## Fichiers

- `index.html` : l'application (construite à partir des sources du carnet, dossier `sources/`)
- `sw.js` : fonctionnement sans réseau
- `manifest.webmanifest`, `icons/` : installation et icônes Cheval-feuille
- `firestore.rules` : règles d'accès à coller dans Firebase
- `legal/` : mentions légales, conditions d'utilisation et de vente, confidentialité ; `fonts/` : polices
