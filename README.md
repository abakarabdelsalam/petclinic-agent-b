# Agent de non-régression PetClinic

Un agent IA qui teste si une PR sur l'API Spring Boot de PetClinic casse le front Angular.

## Structure

| Dossier | Rôle |
|---------|------|
| `mcp-server/` | Serveur MCP Playwright + API : navigation, appels HTTP, lecture du diff |
| `agent-b/` | Agent de non-régression et vérificateur |
| `evaluation-b/` | Corpus de PR (réglage, contrôle, vierge) et script de mesure |
| `jenkins/` | Image Docker de Jenkins, pipeline de tests et pipeline de PR |

## Prérequis

PetClinic doit être cloné à côté, puis lancé :
- `petclinic-rest` (API, port 9966) : `spring-petclinic/spring-petclinic-rest`
- `petclinic-angular` (front, port 4300) : `spring-petclinic/spring-petclinic-angular`

Indiquer leur emplacement si ce n'est pas `..\petclinic-rest` :
```powershell
$env:PETCLINIC_REPO = "D:\chemin\vers\petclinic-rest"
```

## Installation

```powershell
cd mcp-server; npm install; npx playwright install chromium; cd ..
cd agent-b; npm install; cd ..
cd evaluation-b; npm install; cd ..
```

## Tests (sans PetClinic, sans coût)

```powershell
cd mcp-server; npm test     # 29 tests
cd ..\agent-b; npm test     # 19 tests
cd ..\evaluation-b; npm test  # 11 tests, dont 2 ignorés si PETCLINIC_REPO n'est pas défini
```

## Mesure

Mode simulé par défaut (aucun appel à Claude). Mode réel, payant, avec ta clé dans le terminal :

```powershell
cd evaluation-b
$env:CLAUDE_MODE = "real"
$env:ANTHROPIC_API_KEY = "ta-clé"
node evaluate.js R04                       # une PR
$env:CORPUS = "mutations-holdout.json"
node evaluate.js                           # corpus de contrôle
```

## Résultats mesurés (Haiku 4.5)

| Corpus | Régressions | Fausses alertes | Coût |
|--------|-------------|-----------------|------|
| Réglage, run 2 | 7/10 | 0/5 | 0,92 $ |
| Contrôle, deux runs | 2/4 | 0/2 | 0,33 $ |
| Vierge (jamais vu avant le run) | 3/3 | 0/2 | 0,35 $ |

Le corpus de réglage a servi à ajuster les prompts : son score est optimiste. Le corpus vierge est le plus fiable, mais petit (3 régressions, un seul run). Le score du corpus vierge est relu à la main, le script n'ayant pas les termes attendus pour ce corpus. Détails et limites : `evaluation-b/README.md`.

## Jenkins

Jenkins tourne dans Docker avec une image qui ajoute Node, Chromium et `fuser` (`jenkins/Dockerfile`). Le dépôt est monté en lecture seule sur `/repo`.

```powershell
cd jenkins; docker build -t jenkins-node .
docker run -d --name jenkins -p 8080:8080 -v jenkins_home:/var/jenkins_home -v D:/Projets/petclinic-agent-b:/repo:ro jenkins-node
```

| Pipeline | Rôle | Résultat |
|----------|------|----------|
| `jenkins/Jenkinsfile.ci` | Tests unitaires des trois modules | Vert |
| `jenkins/Jenkinsfile.pr` sans `PR_NUMBER` | Applique une PR simulée du corpus, lance PetClinic et l'agent | F03 en mode réel : régression confirmée, build instable, 0,061 $ |
| `jenkins/Jenkinsfile.pr` avec `PR_NUMBER` | Récupère une vraie PR du fork GitHub, la teste, publie le rapport en commentaire | PR #1 du fork : régression confirmée, commentaire publié (HTTP 201), 0,071 $ |

Identifiants Jenkins attendus : `anthropic-api-key` (mode réel) et `github-token` (jeton à portée réduite au fork, permission « Pull requests : Read and write »). Le déclenchement reste manuel : un webhook GitHub demanderait un Jenkins joignable depuis Internet.
