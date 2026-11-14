import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDiff, domainFromName, parseDiff } from '../diff-analyzer.js';
import { formatDiff } from '../git-diff.js';

function diff(file, body) {
  return `diff --git a/${file} b/${file}\nindex 1..2 100644\n--- a/${file}\n+++ b/${file}\n@@ -1,3 +1,3 @@\n${body}`;
}

test('domainFromName distingue PetType de Pet', () => {
  assert.equal(domainFromName('PetTypeRestControllerV1.java'), 'pettypes');
  assert.equal(domainFromName('PetMapper.java'), 'pets');
  assert.equal(domainFromName('VetMapper.java'), 'vets');
  assert.equal(domainFromName('OwnerMapper.java'), 'owners');
  assert.equal(domainFromName('README.md'), null);
});

test('parseDiff ignore les en-têtes --- et +++', () => {
  const [file] = parseDiff(diff('a/Owner.java', ' contexte\n-ancien\n+nouveau'));
  assert.deepEqual(file.changes.map((c) => c.line), ['ancien', 'nouveau']);
  assert.deepEqual(file.changes[0].before, ['contexte']);
});

test('un fichier Java est rattaché à son domaine', () => {
  const result = analyzeDiff(diff('src/main/java/x/mapper/VetMapper.java', '+    @Mapping(target = "specialties", ignore = true)'));
  assert.deepEqual(result.domaines, ['vets']);
  assert.ok(result.ecrans.some((e) => e.endsWith('/vets')));
});

test('une modif d\'openapi.yml est rattachée au chemin qui la précède', () => {
  const result = analyzeDiff(diff('src/main/resources/openapi.yml', '-  /pettypes:\n+  /pet-types:\n     get:'));
  assert.deepEqual(result.domaines, ['pettypes']);
});

test('une modif d\'openapi.yml est rattachée au schéma qui la précède', () => {
  const body = '     OwnerFields:\n       properties:\n         telephone:\n-          pattern: a\n+          pattern: b';
  assert.deepEqual(analyzeDiff(diff('src/main/resources/openapi.yml', body)).domaines, ['owners']);
});

test('les données SQL sont rattachées à la table insérée', () => {
  const body = ' INSERT INTO vets (first_name, last_name) VALUES\n ("A", "B"),\n-("C", "D");\n+("C", "D"),\n+("E", "F");';
  assert.deepEqual(analyzeDiff(diff('src/main/resources/db/h2/data.sql', body)).domaines, ['vets']);
});

test('la configuration touche tous les domaines', () => {
  const result = analyzeDiff(diff('src/main/resources/application.properties', '-a=false\n+a=true'));
  assert.equal(result.domaines.length, 6);
  assert.equal(result.fichiers[0].raison, 'configuration globale');
});

test('formatDiff signale une PR vide et balise le diff', () => {
  assert.match(formatDiff('  '), /PR est vide/);
  assert.match(formatDiff('diff --git a/x b/x'), /^<diff_pr>\n/);
});
