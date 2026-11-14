import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, stat, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { BrowserTools } from '../browser-tools.js';

const PAGE = `<html><body>
  <h1>Accueil</h1>
  <input id="nom">
  <select id="espece"><option>chat</option><option>chien</option></select>
  <button onclick="document.querySelector('h1').textContent = 'Bonjour ' + document.querySelector('#nom').value">Valider</button>
</body></html>`;

let server, browser, tools, baseUrl, captureDir;

before(async () => {
  server = http.createServer((req, res) => res.end(PAGE));
  await new Promise((resolve) => server.listen(0, resolve));
  const host = `localhost:${server.address().port}`;
  baseUrl = `http://${host}/`;
  captureDir = await mkdtemp(path.join(os.tmpdir(), 'mcp-captures-'));
  browser = await chromium.launch();
  tools = new BrowserTools(await browser.newPage(), { allowedHosts: [host], captureDir });
});

after(async () => {
  await browser.close();
  server.close();
  await rm(captureDir, { recursive: true, force: true });
});

test('ouvrir refuse un site non autorisé sans naviguer', async () => {
  const result = await tools.ouvrir('https://example.com');
  assert.match(result, /^Refusé/);
});

test('ouvrir puis lire_page renvoie le texte visible balisé', async () => {
  assert.match(await tools.ouvrir(baseUrl), /HTTP 200/);
  const text = await tools.lirePage();
  assert.match(text, /<contenu_page>\nAccueil/);
});

test('remplir puis cliquer modifie la page', async () => {
  await tools.ouvrir(baseUrl);
  await tools.remplir('#nom', 'Léo');
  await tools.cliquer('text=Valider');
  assert.match(await tools.lirePage(), /Bonjour Léo/);
});

test('lire_page liste les champs et les boutons avec leurs sélecteurs', async () => {
  await tools.ouvrir(baseUrl);
  const text = await tools.lirePage();
  assert.match(text, /- input #nom valeur=""/);
  assert.match(text, /- select #espece valeur="chat" options=\[chat, chien\]/);
  assert.match(text, /- bouton "Valider"/);
});

test('choisir sélectionne une option par son texte', async () => {
  await tools.ouvrir(baseUrl);
  await tools.choisir('#espece', 'chien');
  assert.match(await tools.lirePage(), /select #espece valeur="chien"/);
});

test('capture écrit un PNG avec un nom assaini', async () => {
  await tools.ouvrir(baseUrl);
  const result = await tools.capture('../pirate');
  assert.match(result, /___pirate\.png$/);
  const file = await stat(path.join(captureDir, '___pirate.png'));
  assert.ok(file.size > 0);
});
