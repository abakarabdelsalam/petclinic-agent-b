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

## Résultats mesurés (mode réel, Haiku 4.5)

| Corpus | Régressions | Fausses alertes | Coût | Remarque |
|--------|-------------|-----------------|------|----------|
| Réglage, run 1 (`mutations.json`) | 6/10 | 0/5 | 0,92 $ | Avant ajustement des prompts |
| Réglage, run 2 (`mutations.json`) | 7/10 | 0/5 | 0,92 $ | Prompts ajustés sur ce corpus : score optimiste |
| Contrôle (`mutations-holdout.json`) | 2/4 | 0/2 | 0,32 $ | Jamais utilisé pour régler : le chiffre honnête |

Les alertes du run 2 correspondent toutes à la bonne régression (relecture manuelle).

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
