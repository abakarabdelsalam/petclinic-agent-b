# Jeu d'évaluation du Projet B

15 « PR » sur l'API `petclinic-rest` : 10 régressions qui cassent le front Angular, 5 PR saines.

`mutations.json` est le **corrigé** : l'agent ne doit jamais le lire. Il ne voit que le `git diff` de la PR.

## Principe

Une PR = un ou plusieurs remplacements de texte exacts dans les sources. Aucun commit : la PR est appliquée dans l'arbre de travail, et `git diff` la montre comme une vraie PR.

Chaque remplacement doit trouver son texte **exactement une fois**, sinon il échoue. Une mise à jour de PetClinic qui déplace le code est donc détectée, au lieu de produire une mutation silencieusement fausse.

## Corpus

| Id | Titre de la PR | Ce qui casse | Visible par |
|----|---------------|--------------|-------------|
| R01 | Alléger le mapping des propriétaires | Téléphone absent | API + front |
| R02 | Ignorer les recherches par nom vides | Filtre par nom ignoré | API + front |
| R03 | Simplifier la mise à jour d'un propriétaire | Ville non enregistrée | API + front |
| R04 | Réduire la taille des réponses vétérinaires | Spécialités absentes | API + front |
| R05 | Passer les téléphones au format international | 400 avec 10 chiffres | API + front |
| R06 | Harmoniser les URL en kebab-case | /pettypes en 404 | API + front |
| R07 | Nettoyer les annotations du contrôleur des types | CORS bloqué | **front seul** |
| R08 | Éviter le chargement des visites dans les animaux | Visites absentes | API + front |
| R09 | Limiter la taille des descriptions de visite | Description tronquée | API + front |
| R10 | Activer la sécurité par défaut | 401 partout | API + front |
| S01–S05 | Commentaire, renommage, doc OpenAPI, log, nouvelle vétérinaire | Rien | — |

R07 ne se voit que dans le navigateur, ce qui justifie Playwright en plus des appels HTTP. S05 est un piège à faux positif : 7 vétérinaires au lieu de 6, c'est voulu.

## Corpus et mesures

Les corpus de PR sont dans `evaluation-b/` : `mutations.json` (réglage), `mutations-holdout.json` (contrôle), `mutations-fresh.json` (N01 à N05), `mutations-clean.json` (F01 à F05).

## Résultats mesurés (mode réel, Haiku 4.5)

| Corpus | Régressions | Fausses alertes | Coût | Remarque |
|--------|-------------|-----------------|------|----------|
| Réglage, run 1 | 6/10 | 0/5 | 0,92 $ | Avant ajustement des prompts |
| Réglage, run 2 | 7/10 | 0/5 | 0,92 $ | Prompts ajustés sur ce corpus : optimiste |
| Contrôle, run 1 | 2/4 | 0/2 | 0,32 $ | Avant le correctif du transport MCP |
| Contrôle, run 2 | 0/4 | 0/2 | 0,32 $ | Bug : PETCLINIC_REPO non transmis après séparation du dépôt |
| Contrôle, run 3 | 2/4 | 0/2 | 0,33 $ | Après correctif : chiffre de référence sur ce corpus |
| Neuf (N01 à N05) | 3/3 | 0/2 | 0,34 $ | Après correctif du vérificateur, déjà vu : optimiste |
| Vierge (F01 à F05) | 3/3 | 0/2 | 0,35 $ | Jamais vu avant ce run, un seul essai |

Les scores 3/3 sont relus à la main : le script n'a pas encore les termes attendus pour les corpus N et F, et compte donc 0/3 à tort.

Lecture des PR ratées du contrôle : H02 et H06 sont dans `OwnerRestControllerV1.java`. Un correctif de l'analyseur les couvre désormais, mais il n'a pas été mesuré sur des PR neuves.

Limites :
- Un seul essai par PR : l'écart entre deux runs est grand (R01 et R10 changent de camp).
- Le corpus de contrôle ne compte que 4 régressions : 2/4 a une marge d'erreur très large.
- Les deux régressions ratées (H02, H06) sont dans `OwnerRestControllerV1.java`, qui contient aussi les endpoints des animaux. L'analyseur propose le domaine « propriétaires » seulement, d'après le nom du fichier.
- Le script compte toute alerte sur une PR cassée comme bonne, sans vérifier qu'elle correspond à la bonne régression.

Pour mesurer le corpus de contrôle : `$env:CORPUS = "mutations-holdout.json"` puis `node evaluate.js`.

## Commandes

```powershell
cd evaluation-b
npm test                       # les 15 PR s'appliquent sur les sources actuelles
npm run verify                 # chaque PR compile (worktree séparé, ~10 min)
node mutate.js list
node mutate.js apply R04       # applique la PR dans petclinic-rest
git -C ..\petclinic-rest diff  # ce que l'agent verra
node mutate.js reset           # revient à la base
```
