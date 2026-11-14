import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readDiff } from '../git-diff.js';

let repo;
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });

before(async () => {
  repo = await mkdtemp(path.join(os.tmpdir(), 'diff-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  await writeFile(path.join(repo, 'a.txt'), 'un\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'pr');
  await writeFile(path.join(repo, 'a.txt'), 'deux\n');
  git('commit', '-q', '-am', 'pr');
});

after(() => rm(repo, { recursive: true, force: true }));

test('sans base, une PR commitée donne un diff vide', () => {
  assert.equal(readDiff({ repo, base: '' }), '');
});

test('avec une base, le diff montre les commits de la PR', () => {
  assert.match(readDiff({ repo, base: 'main' }), /-un\n\+deux/);
});
