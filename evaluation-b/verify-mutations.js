import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apply, reset, loadMutations, DEFAULT_REPO } from './mutate.js';

// Compile chaque PR dans un worktree séparé, pour ne pas toucher l'API qui tourne.
const here = path.dirname(fileURLToPath(import.meta.url));
const worktree = path.join(path.dirname(DEFAULT_REPO), 'petclinic-rest-verif');
if (!existsSync(worktree)) {
  execSync(`git worktree add --detach "${worktree}" HEAD`, { cwd: DEFAULT_REPO, stdio: 'ignore' });
}

const only = process.argv.slice(2);
let failures = 0;
for (const m of await loadMutations()) {
  if (only.length && !only.includes(m.id)) continue;
  reset(worktree);
  try {
    await apply(m.id, worktree);
    execSync('mvn -q -o compile -DskipTests', { cwd: worktree, stdio: 'pipe' });
    console.log(`✅ ${m.id} appliquée et compilée`);
  } catch (error) {
    failures++;
    const detail = (error.stdout?.toString() || error.message).split('\n').filter((l) => l.includes('ERROR')).slice(0, 3).join('\n');
    console.log(`❌ ${m.id} : ${detail || error.message}`);
  }
}
reset(worktree);
console.log(failures ? `${failures} échec(s)` : 'Toutes les mutations compilent.');
process.exit(failures ? 1 : 0);
