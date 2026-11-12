# Règles d'accès : vérification cas par cas

L'émulateur Firebase n'a pas pu tourner ici (Java est présent, mais le téléchargement de l'émulateur est bloqué par le réseau de l'environnement de travail). Les règles de `firestore.rules` ont donc été déroulées à la main, cas par cas. Le même raisonnement est reproduit dans la fausse base des essais automatiques (modèle des règles en JavaScript), et l'appli a été essayée de bout en bout contre ce modèle.

Rappel : chaque cas autorisé est une ligne `allow` à part. Si une ligne échoue (document absent, champ manquant), elle refuse sans empêcher les autres lignes d'autoriser.

## 1. Un membre de l'écurie A ne lit rien de l'écurie B

| Demande | Règle | Résultat |
|---|---|---|
| lire `structures/B` | `membre(B)` : `structures/B/membres/{moi}` n'existe pas | refusé |
| lire `structures/B/chevaux` (et les 8 autres collections, `config`) | `coll in donnees() && membre(B)` | refusé |
| lire `structures/B/membres` | `membre(B)` | refusé |
| écrire dans `structures/B/…` | `editeur(B)` : pas de fiche, `get()` vide | refusé |
| lister `invitations` où `structure == B` | `gerante(B)` faux ; le filtre ne porte ni sur son adresse ni sur `par` | refusé |
| lire `utilisateurs/{quelqu'un d'autre}` | `uid == moi()` faux | refusé |
| lire `invitations/{code}` d'une invitation de B | autorisé seulement à qui connaît le code (8 caractères parmi 32, plus de 1 000 milliards de combinaisons) ; on n'y lit que le nom de l'écurie et le rôle proposé | voulu |

## 2. « Lecture seule » n'écrit rien

| Demande | Règle | Résultat |
|---|---|---|
| créer, modifier ou supprimer une fiche du carnet | `editeur(sid)` : rôle `lecture` absent de `['gerante', 'equipe']` | refusé |
| modifier les réglages (`config/reglages`) | même règle (`config` fait partie des données) | refusé |
| modifier l'écurie, inviter, annuler une invitation | `gerante(sid)` faux | refusé |
| modifier la fiche de quelqu'un d'autre | règle de la gérante seulement | refusé |
| modifier sa propre fiche (prénom, téléphone, bons de la boutique) | `uid == moi()` sans toucher à `role` ni `email` | autorisé, comme avant |

## 3. Un code n'ouvre que son écurie, avec son rôle, une seule fois, pas après expiration

Entrer avec un code = un seul lot : sa fiche de membre (`via` = code), l'invitation marquée, l'index.

| Tentative | Règle | Résultat |
|---|---|---|
| fiche dans une autre écurie que celle du code | `inv.structure == sid` | refusé |
| rôle plus élevé que celui de l'invitation | `inv.role == role demandé`, et seulement `equipe` ou `lecture` | refusé (jamais gérante par un code) |
| deuxième utilisation du code | `utiliseePar` doit être vide avant | refusé |
| créer sa fiche sans marquer l'invitation | `getAfter(invitation).utiliseePar == moi()` | refusé |
| marquer l'invitation sans créer sa fiche | `existsAfter(sa fiche)` et `!exists(sa fiche)` avant | refusé |
| code expiré (lien de plus de 7 jours) | `expire > request.time`, pour la fiche comme pour l'invitation | refusé |
| invitation par e-mail utilisée avec une autre adresse | `email == adresse du compte` | refusé |
| créer une invitation | gérante de l'écurie visée, rôle `equipe` ou `lecture`, `utiliseePar` vide, adresse e-mail ou expiration de 8 jours au plus | seule la gérante |

## 4. Personne ne change son propre rôle ni l'abonnement

| Tentative | Règle | Résultat |
|---|---|---|
| un membre change son rôle | sa propre fiche : `!touche(['role', 'email'])` | refusé |
| quelqu'un se met `gerante` | il faut que `structures.gerante` le désigne dans le même lot, et seule la gérante modifie `structures` | refusé |
| la gérante se retire le rôle de gérante sans passer la gérance | `structures.gerante` doit ne plus la désigner après le lot | refusé |
| passer la gérance | `structures.gerante` change vers un membre existant + nouveau rôle `gerante` + ancienne gérante en `equipe`, dans un lot | autorisé (gérante seulement) |
| changer `abonnement` (ou `creePar`, `creeLe`) | `!touche(['abonnement', 'creePar', 'creeLe'])`, même pour la gérante | refusé |
| créer une écurie « fondatrice » | `mail() == 'celiacourtois8@gmail.com'` seulement | refusé aux autres |
| créer une écurie en essai trop long | `finEssai <= maintenant + 62 jours` | refusé |
| supprimer une écurie | `allow delete: if false` | refusé |

## 5. Les anciens chemins refusent l'écriture

| Demande | Règle | Résultat |
|---|---|---|
| écrire `chevaux/…`, `soins/…`, `config/reglages`… à la racine | `match /{coll}/{id}` racine : aucune écriture, sauf `config/migration` | refusé |
| écrire `membres/{uid}` à la racine | aucune règle d'écriture | refusé |
| modifier ou supprimer une ancienne invitation (`invitations/{adresse}`) | il faut un champ `structure`, absent des anciennes | refusé |
| lire l'ancien carnet | anciens membres seulement (`membres/{moi}` racine existe), pendant le mois de transition | autorisé |
| écrire `config/migration` | l'ancienne gérante seulement, et vers une écurie dont elle est gérante | seule exception |

## 6. Abonnement : essai, paiement, lecture seule après l'essai

Une écurie est **active** si son essai court encore, si son abonnement est payé (fin à venir), ou si elle est à vie (fondatrice, ou créée avant la mise en ligne de l'abonnement, le 6 novembre 2026 à 12 h). Écrire dans le carnet demande une écurie active.

| Tentative | Règle | Résultat |
|---|---|---|
| écrire dans le carnet après l'essai, sans abonnement | `editeur(sid) && actif(sid)` | refusé (tout reste lisible) |
| créer une écurie avec un essai trop long | `finEssai <= maintenant + 63 jours`, et rien d'autre dans `abonnement` | refusé |
| créer une écurie avec une ancienne date pour passer « à vie » | `creeLe` à un jour près de maintenant | refusé |
| la gérante se met « à vie » | paiement : seulement `statut: 'abonnee'` | refusé |
| la gérante allonge son essai en payant | `finEssai` et `debut` inchangés | refusé |
| la gérante paie (démonstration) | `abonnee`, formule `mois` ou `an`, `paiement.fournisseur == 'fictif'`, fin à moins de 800 jours, rien d'autre ne change dans l'écurie | autorisé |
| un membre ou un inconnu abonne l'écurie | `gerante(sid)` faux | refusé |

**Paiement de démonstration** : tant qu'il est autorisé (fonction `paiementFictif`), une gérante peut abonner son écurie sans payer. Quand Shine ou Tebex sera branché, retirer cette ligne `allow update` : l'abonnement ne sera plus écrit que par le serveur du paiement ou par l'administration.

## 7. Administration EquiValdi

Le compte `bennizdu03@gmail.com` (adresse confirmée) lit et écrit toutes les écuries : leur fiche (dont l'abonnement), leur équipe, leur carnet, leurs invitations, et la liste de toutes les écuries. Il n'a de fiche de membre dans aucune écurie : personne ne le voit dans son équipe. Un autre compte qui lit la liste de toutes les écuries est refusé.

## 8. Carte des prés (sans nouvelle règle)

La carte d'une écurie est une donnée de l'écurie : `config/carte` (la carte publiée et le tracé en cours) et `config/plan` (l'image du plan envoyé). Elles passent par les règles déjà en place.

| Demande | Règle | Résultat |
|---|---|---|
| lire la carte ou le plan | `coll in donnees() && membre(sid)` | les membres de l'écurie (et l'administration) |
| lire le plan d'une autre écurie | `membre(B)` faux | refusé |
| enregistrer le tracé, publier la carte, envoyer le plan | `editeur(sid) && actif(sid)`, comme les réglages ; l'appli ne propose l'outil qu'à la gérante | refusé en lecture seule, après l'essai, depuis une autre écurie |
| demander la carte à EquiValdi (`carteDemande` sur l'écurie) | mise à jour de l'écurie par la gérante, sans toucher à l'abonnement | seule la gérante ; l'administration la passe à « faite » |
| un membre touche à la demande | `gerante(sid)` faux | refusé |
| un plan trop lourd | 1 Mio au plus par document dans Firestore ; l'appli réduit l'image à 880 000 caractères au plus | jamais atteint |

Une carte lue dans la base est remise au propre avant d'être dessinée (identifiants simples, nombres, textes sans balises ni guillemets), et l'image du plan n'est acceptée que comme image JPEG, PNG ou WebP : un membre « Peut modifier » ne peut rien glisser dans la carte qui s'exécute chez les autres.

## 9. Messages, dernière activité, suppression du compte (11 novembre 2026)

| Demande | Règle | Résultat |
|---|---|---|
| écrire un message à EquiValdi | `retours` : création avec son propre `uid`, champs connus, texte de 3 à 2 000 caractères, statut « nouveau », date du jour | permis ; refusé au nom d'un autre, trop long, ou déjà « répondu » |
| lire ses messages et les réponses | `get, list` si `resource.data.uid == moi()` (requête `where uid ==`) | permis ; la liste de tous les messages est refusée |
| lire le message de quelqu'un d'autre | `uid` différent | refusé |
| marquer une réponse lue | mise à jour du seul champ `vuLe` | permis à l'auteur |
| répondre, classer | `admin()` | administration seulement |
| noter la dernière ouverture | `structures/{id}` : tout membre (même lecture seule), seul le champ `vu`, à la date du jour à un jour près | permis ; refusé avec un autre champ (`nom`…) |
| supprimer une écurie | `delete` si `gerante(sid)` (l'appli ne le propose que si la gérante y est seule) | refusé à tout autre compte |
| vider le carnet avant | `delete` des données si `gerante(sid)`, même après l'essai | gérante seulement |
| retirer sa fiche de gérante | seulement si l'écurie disparaît dans le même lot (`!existsAfter`) | une gérante ne peut pas abandonner une écurie qui reste |
| effacer ses messages | `delete` par l'auteur | permis |

## 10. Propriétaires en pension (rôle « proprio »)

| Demande | Règle | Résultat |
|---|---|---|
| lire le carnet (chevaux, soins, tâches…) | `equipier(sid)` : gérante, « Peut modifier », « Lecture seule » | un propriétaire est refusé, même cheval par cheval |
| lire l'équipe | `equipier(sid)` ; un propriétaire lit seulement sa fiche et celle de la gérante (`get`) | la liste des membres lui est refusée |
| lire les réglages, la carte | données de l'écurie : `equipier(sid)` | refusé au propriétaire (ses rappels viennent de sa fiche partagée) |
| lire ses fiches partagées | `partages` : `resource.data.proprio == moi()`, requête `where proprio ==` | permis ; la liste de toutes les fiches lui est refusée |
| écrire une fiche partagée | `editeur(sid)`, champ `proprio` obligatoire | l'équipe seulement (pas d'abonnement exigé, pour pouvoir retirer un accès) |
| lire ses relevés | `releves` : même règle que les fiches partagées | permis à son propriétaire |
| écrire un relevé | `gerante(sid)` | la gérante seulement (« Peut modifier » refusé) |
| inviter avec ce rôle | invitations : `role in ['equipe', 'lecture', 'proprio']` | permis à la gérante |
| écrire quoi que ce soit dans le carnet | `editeur(sid)` faux pour `proprio` | refusé |

## 11. Autres stocks (12 novembre 2026)

| Demande | Règle | Résultat |
|---|---|---|
| lire, écrire les stocks | `stocks` ajouté à `donnees()` : mêmes droits que le foin | équipe en lecture, gérante et « Peut modifier » en écriture (écurie active) ; refusé au propriétaire |
| santé du cheval (pesées, documents) | dans la fiche du cheval (`chevaux`) | aucune règle nouvelle |

## 12. Questionnaire public (12 novembre 2026)

| Demande | Règle | Résultat |
|---|---|---|
| répondre sans compte | `sondage` : `create` pour tous, champs listés, `v == 1`, profil connu, date du jour, textes et listes bornés, prix de 0 à 1 000 | accepté |
| champ en trop, profil inconnu | `keys().hasOnly`, `profil in [...]` | refusé |
| lire, effacer | `admin()` seulement | refusé à tous les autres, comptes compris |

## Migration

- Recopie de l'équipe (cas c) : seulement par l'ancienne gérante, pour un uid qui existe dans l'ancien `membres`, avec exactement le même rôle (`equipe` ou `lecture`).
- Liste des anciennes invitations : `list` où `par == moi()`, réservé à l'ancienne gérante (ajout nécessaire à l'étape 5 : les anciennes invitations n'ont ni `structure` ni `email`).

## Limites de Firestore respectées

Une demande peut lire au plus 10 documents dans les règles, un lot d'écritures 20 au total. Les lots de l'appli restent en dessous :

| Lot | Lectures par écriture | Taille du lot | Total |
|---|---|---|---|
| carnet (migration) | 2 (`editeur`, `actif`) | 9 fiches au plus, et 5 Mo au plus | 18 |
| équipe (migration) | 4 (`gerante`, `ancienneGerante`, ancienne fiche) | 4 fiches | 16 |
| invitations (migration) | 1 (`gerante`) | 18 | 18 |
| création d'une écurie | 2 | 3 écritures | 2 |
| rejoindre avec un code | 2 + 3 | 3 écritures | 5 |
| passer la gérance | 2 par écriture | 4 écritures | 6 |
