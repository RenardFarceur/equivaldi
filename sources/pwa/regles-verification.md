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

## Migration

- Recopie de l'équipe (cas c) : seulement par l'ancienne gérante, pour un uid qui existe dans l'ancien `membres`, avec exactement le même rôle (`equipe` ou `lecture`).
- Liste des anciennes invitations : `list` où `par == moi()`, réservé à l'ancienne gérante (ajout nécessaire à l'étape 5 : les anciennes invitations n'ont ni `structure` ni `email`).

## Limites de Firestore respectées

Une demande peut lire au plus 10 documents dans les règles, un lot d'écritures 20 au total. Les lots de l'appli restent en dessous :

| Lot | Lectures par écriture | Taille du lot | Total |
|---|---|---|---|
| carnet (migration) | 1 (`editeur`) | 18 fiches au plus, et 5 Mo au plus | 18 |
| équipe (migration) | 4 (`gerante`, `ancienneGerante`, ancienne fiche) | 4 fiches | 16 |
| invitations (migration) | 1 (`gerante`) | 18 | 18 |
| création d'une écurie | 2 | 3 écritures | 2 |
| rejoindre avec un code | 2 + 3 | 3 écritures | 5 |
| passer la gérance | 2 par écriture | 4 écritures | 6 |
