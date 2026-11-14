import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { applyEdit } from '../apply-edits.js';
import { existsSync } from 'node:fs';
import { loadMutations, DEFAULT_REPO } from '../mutate.js';

const needsPetclinic = existsSync(DEFAULT_REPO) ? {} : { skip: 'PETCLINIC_REPO absent' };

test('applyEdit remplace une occurrence unique', () => {
  assert.equal(applyEdit('a\nb\nc', { find: 'b\n', replace: 'B\n' }), 'a\nB\nc');
});

test('applyEdit respecte les fins de ligne CRLF', () => {
  assert.equal(applyEdit('a\r\nb\r\nc', { find: 'a\nb', replace: 'x\ny' }), 'x\r\ny\r\nc');
});

test('applyEdit refuse un texte absent ou ambigu', () => {
  assert.throws(() => applyEdit('abc', { find: 'z', replace: '' }), /0 fois/);
  assert.throws(() => applyEdit('aa', { find: 'a', replace: '' }), /2 fois/);
});

test('applyEdit ne interprète pas les motifs $ du remplacement', () => {
  assert.equal(applyEdit('x', { find: 'x', replace: "'^[0-9]$'" }), "'^[0-9]$'");
});

test('le corpus contient 10 régressions et 5 PR saines aux id uniques', async () => {
  const mutations = await loadMutations();
  assert.equal(mutations.filter((m) => m.type === 'regression').length, 10);
  assert.equal(mutations.filter((m) => m.type === 'saine').length, 5);
  assert.equal(new Set(mutations.map((m) => m.id)).size, 15);
});

test('le corpus de contrôle s\'applique aussi, avec 4 régressions et 2 PR saines', needsPetclinic, async () => {
  const mutations = await loadMutations('mutations-holdout.json');
  assert.equal(mutations.filter((m) => m.type === 'regression').length, 4);
  assert.equal(mutations.filter((m) => m.type === 'saine').length, 2);
  for (const m of mutations) {
    const contents = new Map();
    for (const edit of m.edits) {
      const file = path.join(DEFAULT_REPO, edit.file);
      const content = contents.get(file) ?? await readFile(file, 'utf8');
      assert.doesNotThrow(() => contents.set(file, applyEdit(content, edit)), `${m.id} : ${edit.file}`);
    }
  }
});

test('chaque edit s\'applique sur les sources de petclinic-rest', needsPetclinic, async () => {
  for (const m of await loadMutations()) {
    const contents = new Map();
    for (const edit of m.edits) {
      const file = path.join(DEFAULT_REPO, edit.file);
      const content = contents.get(file) ?? await readFile(file, 'utf8');
      assert.doesNotThrow(() => contents.set(file, applyEdit(content, edit)), `${m.id} : ${edit.file}`);
    }
  }
});
