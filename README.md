# Agent de non-régression PetClinic

Un agent IA qui teste si une PR sur l'API Spring Boot de PetClinic casse le front Angular.

## Structure

| Dossier | Rôle |
|---------|------|
| `mcp-server/` | Serveur MCP Playwright + API : navigation, appels HTTP, lecture du diff |
| `agent-b/` | Agent de non-régression, vérificateur, Jenkinsfile |
| `evaluation-b/` | Corpus de PR (réglage et contrôle) et script de mesure |

## Prérequis

PetClinic doit être cloné à côté, puis lancé :
- `petclinic-rest` (API, port 9966) : `spring-projects/spring-petclinic-rest`
- `petclinic-angular` (front, port 4300) : `spring-projects/spring-petclinic-angular`

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
cd mcp-server; npm test     # 27 tests
cd ..\agent-b; npm test     # 17 tests
cd ..\evaluation-b; npm test  # 7 tests
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
| Contrôle inédit | 2/4 | 0/2 | 0,32 $ |

Le corpus de réglage a servi à ajuster les prompts : son score est optimiste. Le corpus de contrôle est le chiffre à retenir. Détails et limites : `evaluation-b/README.md`.

## Jenkins

`agent-b/Jenkinsfile` est écrit mais n'a pas été exécuté sur une vraie instance Jenkins.
