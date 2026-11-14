# Serveur MCP Playwright pour PetClinic

Serveur MCP (Model Context Protocol) qui donne à un modèle Claude un navigateur Playwright limité à PetClinic.

## Pourquoi MCP

Dans le Projet A, les outils (ouvrir, cliquer…) sont codés dans le backend Java et appelés par notre propre boucle d'agent.
MCP standardise cette frontière : le serveur décrit ses outils, et n'importe quel client MCP (Claude Code, Claude Desktop, notre futur agent) peut les lister et les appeler, sans connaître Playwright.

```
Client MCP (Claude Code, agent)  ──JSON-RPC sur stdio──▶  server.js  ──▶  Playwright/Chromium  ──▶  PetClinic
```

- **stdio** : le client lance `node server.js` et échange des messages JSON sur stdin/stdout. Les journaux vont donc sur stderr.
- Le navigateur ne démarre qu'au premier appel d'outil et reste ouvert entre les appels.

## Outils

| Outil | Paramètres | Rôle |
|-------|-----------|------|
| `ouvrir` | `url` | Navigue vers une URL autorisée |
| `lire_page` | — | Texte visible de la page, entre balises `<contenu_page>` |
| `cliquer` | `selecteur` | Clic (CSS `button.btn` ou texte `text=Add Owner`) |
| `remplir` | `selecteur`, `texte` | Saisie dans un champ |
| `capture` | `nom` (optionnel) | Capture PNG dans `captures/` |
| `appeler_api` | `methode` (GET/POST/PUT/DELETE), `chemin`, `corps` (optionnel) | Appel direct à l'API, chemin relatif à `/petclinic/api/` |
| `lire_diff` | — | `git diff` de la PR appliquée dans `petclinic-rest`, entre balises `<diff_pr>` |
| `analyser_diff` | — | Domaines touchés, écrans et appels d'API à tester en priorité |

## Garde-fous

- **Sites autorisés** (`allowed-sites.js`) : seulement `localhost:4300` (front) et `localhost:9966` (API). Tout autre hôte, `file:` ou `javascript:` est refusé.
- **Texte plutôt que HTML** : `lire_page` renvoie le texte visible, tronqué à 8 000 caractères. Il est balisé pour rappeler au modèle que c'est une donnée, pas une instruction.
- **Erreurs** : une erreur Playwright (sélecteur introuvable, délai de 5 s dépassé) revient au modèle comme résultat `isError`, sans arrêter le serveur.
- **Nom de capture assaini** : `../x` devient `___x`, impossible d'écrire hors de `captures/`.

## Commandes

```powershell
cd mcp-server
npm install
npx playwright install chromium
npm test                  # 20 tests, sans PetClinic
node demo-petclinic.js    # démo réelle : PetClinic doit tourner
```

## Lancer PetClinic

```powershell
cd petclinic-rest;    mvn spring-boot:run          # API : http://localhost:9966/petclinic/api/
cd petclinic-angular; npm ci; npx ng serve --port 4300   # Front : http://localhost:4300
```

Le port 4300 évite le conflit avec la boutique TechShop du Projet A (4200).

## Utilisation dans Claude Code

Le fichier `.mcp.json` à la racine du projet déclare le serveur. Au prochain lancement de Claude Code dans ce dossier, approuvez `petclinic-playwright`, puis vérifiez avec `/mcp`.
