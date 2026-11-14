# Agent de non-régression PetClinic (Projet B)

Une PR modifie l'API Spring Boot `petclinic-rest`. L'agent la teste comme un humain : il lit le diff, cible les écrans impactés du front Angular, fait les actions, appelle l'API, et signale ce que la PR casse. Un vérificateur rejoue chaque signalement avant qu'il ne devienne une alerte.

```
run-pr.js
  ├─ restartApi()            redémarre l'API sur le code de la PR (H2 neuve)
  ├─ runRegressionAgent()    boucle Claude + outils MCP + signaler_regression / terminer
  │     └─ ReportValidator   refuse un rapport sans preuve ni étapes
  ├─ verifyReport()          2e agent, outils réduits, verdict CONFIRMEE / REJETEE par outil
  └─ formatPrComment()       commentaire Markdown pour la PR
```

| Fichier | Rôle |
|---------|------|
| `agent-loop.js` | Boucle d'agent générique, garde-fous (30 actions, 6 min, 0,25 $), cache de prompt |
| `regression-agent.js` | Agent principal : outils MCP + `signaler_regression` + `terminer` |
| `verifier.js` | Vérificateur : reproduit le défaut, rejette par défaut s'il ne conclut pas |
| `report-validator.js` | Champs obligatoires, gravité, attendu ≠ observé |
| `claude-client.js` | Claude réel ou simulé, calcul du coût |
| `mcp-tools.js` | Client MCP vers `mcp-server/` |
| `api-runner.js` | Arrêt, démarrage et attente de l'API (port 9966) |

## Choix

- **Verdict par outil à énumération** : le Projet A lisait le verdict dans du texte libre et se trompait sur la mise en forme. Ici le modèle appelle `verdict({ verdict: "CONFIRMEE" | "REJETEE" })` : rien à interpréter.
- **Le vérificateur reproduit, il ne relit pas** : il reçoit le rapport et le diff, rejoue le défaut avec ses propres outils, puis tranche. Sans verdict, il rejette : mieux vaut rater une régression qu'inventer une alerte.
- **Cache de prompt** : chaque tour relit toute la conversation. Marquer le dernier message en cache fait payer cette relecture à 10 % du prix.
- **Une PR = un redémarrage** : base H2 en mémoire, donc chaque test part des mêmes données.

## Commandes

```powershell
cd agent-b; npm install; npm test        # 19 tests, sans réseau ni API payante
node run-pr.js                           # teste la PR présente dans petclinic-rest (mode simulé)
node run-pr.js --no-restart              # sans redémarrer l'API
```

Code de sortie : `0` aucune régression, `1` régression confirmée, `2` panne.

### Mode réel (payant)

Dans **le terminal qui lance la commande uniquement**, jamais dans les variables de Windows :

```powershell
$env:CLAUDE_MODE = "real"
$env:ANTHROPIC_API_KEY = "..."
cd ..\evaluation-b
node evaluate.js R04          # une PR, quelques centimes
node evaluate.js              # les 15 PR
```

Modèle : `claude-haiku-4-5` par défaut (`CLAUDE_MODEL` pour changer). Prix : 1 $ / 5 $ par million de jetons (`PRICE_INPUT_PER_MILLION`, `PRICE_OUTPUT_PER_MILLION`).

## Jenkins

Les pipelines sont dans `../jenkins/` (voir le README principal). Code de sortie de `run-pr.js` : build vert, instable si régression confirmée, rouge si l'agent tombe.
