# Jour 7 - Synthèse : serveur Playwright MCP

**Date :** 12 novembre 2026
**État :** ✅ Terminé, démo réelle réussie

## Correction du Jour 6

Le dépôt cloné au Jour 6 (`spring-projects/spring-petclinic`, dans `petclinic-repo/`) n'a **ni API REST `/api` ni frontend Angular** : c'est une application Thymeleaf rendue côté serveur. Les documents du Jour 6 qui citent `localhost:8080/api` et `frontend/` étaient faux.

Le Projet B teste « une PR sur l'API casse-t-elle le front Angular ? ». Il faut donc les deux dépôts officiels séparés :

| Dossier | Dépôt | Port |
|---------|-------|------|
| `petclinic-rest/` | spring-petclinic/spring-petclinic-rest | 9966 (`/petclinic/api/`) |
| `petclinic-angular/` | spring-petclinic/spring-petclinic-angular (Angular 22) | 4300 |

`petclinic-repo/` n'est plus utilisé. Il n'a pas été supprimé.

## Livrables

- `mcp-server/server.js` : serveur MCP (SDK 1.32.2), 5 outils : `ouvrir`, `lire_page`, `cliquer`, `remplir`, `capture`
- `mcp-server/browser-tools.js` : actions Playwright
- `mcp-server/allowed-sites.js` : liste des hôtes autorisés (4300, 9966)
- `mcp-server/test/` : 8 tests, tous verts
- `mcp-server/demo-petclinic.js` : démo de bout en bout via le protocole MCP
- `.mcp.json` : déclaration du serveur pour Claude Code

## Résultat mesuré

`node demo-petclinic.js` : le client MCP ouvre `http://localhost:4300/`, lit le menu (Owners, Veterinarians, Pet Types, Specialties), ouvre la page des vétérinaires et lit les 6 vétérinaires chargés depuis l'API REST, puis enregistre `captures/veterinaires.png`.

## Prochaine étape : Jour 8

Ajouter les outils HTTP (`get`, `post`, `put`, `delete`) limités à `localhost:9966`, pour tester l'API directement.
