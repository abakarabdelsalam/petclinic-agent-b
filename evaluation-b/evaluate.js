import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apply, reset, loadMutations, DEFAULT_REPO } from './mutate.js';
import { runPr } from '../agent-b/run-pr.js';
import { restartApi } from '../agent-b/api-runner.js';
import { scoreLine } from './expected-alerts.js';

// L'agent ne voit que le diff ; seul ce script connaît le corrigé.
const here = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const mutations = (await loadMutations()).filter((m) => !only.length || only.includes(m.id));
const lignes = [];
let fatal = null;
const mode = process.env.CLAUDE_MODE === 'real' ? 'réel (payant)' : 'SIMULÉ : aucun appel à Claude, score sans valeur. Posez CLAUDE_MODE=real pour mesurer.';
console.log(`Mode : ${mode}\n`);

try {
  for (const m of mutations) {
    if (fatal) break;
    reset(DEFAULT_REPO);
    await apply(m.id, DEFAULT_REPO);
    process.stdout.write(`${m.id} … `);
    let result;
    try {
      result = await runPr();
    } catch (error) {
      fatal = error.status === 401
        ? 'Clé API refusée (401) : ANTHROPIC_API_KEY doit contenir ta vraie clé, qui commence par sk-ant-.'
        : `Échec : ${error.message}`;
      console.log(`\n${fatal}`);
      break;
    }
    const alerte = result.confirmees.length > 0;
    const ligne = {
      id: m.id, type: m.type, impact: m.impact,
      correct: scoreLine(m.id, m.type, result.confirmees.map((c) => c.rapport.titre)),
      confirmees: result.confirmees.map((c) => c.rapport.titre),
      rejetees: result.rejetees.map((c) => c.rapport.titre),
      arret: result.arret, actions: result.actions, journal: result.journal,
      dureeS: Math.round(result.dureeMs / 1000), coutUsd: Number(result.coutUsd.toFixed(4))
    };
    lignes.push(ligne);
    console.log(`${ligne.correct ? '✅' : '❌'} ${alerte ? `${result.confirmees.length} alerte(s)` : 'aucune alerte'} · ${ligne.actions} actions · ${ligne.dureeS} s · ${ligne.coutUsd} $`);
  }
} finally {
  reset(DEFAULT_REPO);
  await restartApi();
}

if (fatal) process.exit(2);

const regressions = lignes.filter((l) => l.type === 'regression');
const saines = lignes.filter((l) => l.type === 'saine');
const synthese = {
  date: new Date().toISOString(),
  mode: process.env.CLAUDE_MODE ?? 'fake',
  modele: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5',
  regressions_detectees: `${regressions.filter((l) => l.correct).length}/${regressions.length}`,
  faux_positifs: `${saines.filter((l) => !l.correct).length}/${saines.length}`,
  duree_moyenne_s: Math.round(lignes.reduce((s, l) => s + l.dureeS, 0) / Math.max(lignes.length, 1)),
  cout_total_usd: Number(lignes.reduce((s, l) => s + l.coutUsd, 0).toFixed(4)),
  details: lignes
};
const stamp = synthese.date.replace(/[:.]/g, '-');
await writeFile(path.join(here, `results-${synthese.mode}-${stamp}.json`), JSON.stringify({ corpus: process.env.CORPUS ?? 'mutations.json', ...synthese }, null, 2));
console.log(`\nRégressions détectées : ${synthese.regressions_detectees} · Faux positifs : ${synthese.faux_positifs} · Durée moyenne : ${synthese.duree_moyenne_s} s · Coût total : ${synthese.cout_total_usd} $`);
