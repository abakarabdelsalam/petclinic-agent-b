import { apply, reset, loadMutations, DEFAULT_REPO } from './mutate.js';
import { runProbes } from './probes.js';
import { restartApi } from '../agent-b/api-runner.js';

// Prouve sur l'API qui tourne que chaque régression casse sa sonde, et que la base et les PR saines n'en cassent aucune.
const cases = [{ id: 'BASE', type: 'base' }, ...(await loadMutations())];
let failures = 0;

try {
  for (const m of cases) {
    reset(DEFAULT_REPO);
    if (m.type !== 'base') await apply(m.id, DEFAULT_REPO);
    await restartApi();
    const results = await runProbes();
    const broken = Object.keys(results).filter((id) => !results[id]);
    const ok = m.type === 'regression' ? broken.includes(m.id) : broken.length === 0;
    if (!ok) failures++;
    console.log(`${ok ? '✅' : '❌'} ${m.id.padEnd(4)} sondes cassées : ${broken.join(', ') || 'aucune'}`);
  }
} finally {
  reset(DEFAULT_REPO);
  await restartApi();
}
console.log(failures ? `\n${failures} cas incorrect(s)` : '\nChaque régression se manifeste, la base et les PR saines sont propres.');
process.exit(failures ? 1 : 0);
