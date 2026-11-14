import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apply, reset, loadMutations, DEFAULT_REPO } from './mutate.js';
import { analyzeDiff } from '../mcp-server/diff-analyzer.js';
import { readDiff } from '../mcp-server/git-diff.js';

// Domaine où la régression se voit : sert uniquement à noter l'analyseur, qui ne lit jamais ce fichier.
const EXPECTED = {
  R01: 'owners', R02: 'owners', R03: 'owners', R04: 'vets', R05: 'owners',
  R06: 'pettypes', R07: 'pettypes', R08: 'pets', R09: 'owners', R10: 'owners'
};

const here = path.dirname(fileURLToPath(import.meta.url));
const worktree = path.join(path.dirname(DEFAULT_REPO), 'petclinic-rest-verif');
let hits = 0;

for (const m of await loadMutations()) {
  reset(worktree);
  await apply(m.id, worktree);
  const { domaines, ecrans } = analyzeDiff(readDiff({ repo: worktree, context: 60 }));
  const expected = EXPECTED[m.id];
  const ok = expected ? domaines.includes(expected) : true;
  if (expected && ok) hits++;
  console.log(`${ok ? '✅' : '❌'} ${m.id}  domaines=[${domaines.join(', ')}]  écrans=${ecrans.length}${expected ? `  attendu=${expected}` : ''}`);
}
reset(worktree);
console.log(`\nRégressions correctement ciblées : ${hits}/10`);
