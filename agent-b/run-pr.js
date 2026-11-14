import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClaude } from './claude-client.js';
import { McpTools } from './mcp-tools.js';
import { runRegressionAgent } from './regression-agent.js';
import { verifyReport } from './verifier.js';
import { restartApi, API_REPO } from './api-runner.js';
import { formatPrComment } from './pr-comment.js';
import { readDiff, formatDiff } from '../mcp-server/git-diff.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Teste la PR présente dans l'arbre de travail de petclinic-rest.
export async function runPr({ claude = createClaude(), restart = true, repo = API_REPO } = {}) {
  const start = Date.now();
  if (restart) await restartApi({ repo });
  const diff = formatDiff(readDiff({ repo }));
  const mcp = await McpTools.connect();
  try {
    const run = await runRegressionAgent({ claude, mcp });
    const confirmees = [];
    const rejetees = [];
    let coutUsd = run.coutUsd;
    for (const rapport of run.rapports) {
      const verification = await verifyReport({ claude, mcp, report: rapport, diff });
      coutUsd += verification.coutUsd;
      (verification.verdict === 'CONFIRMEE' ? confirmees : rejetees).push({ rapport, verification });
    }
    return {
      mode: claude.mode, arret: run.arret, actions: run.actions, resume: run.resume,
      confirmees, rejetees, invalides: run.invalides, journal: run.journal,
      coutUsd, dureeMs: Date.now() - start
    };
  } finally {
    await mcp.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const restart = !process.argv.includes('--no-restart');
  try {
    const result = await runPr({ restart });
    const dir = path.join(here, 'resultats');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `pr-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await writeFile(file, JSON.stringify(result, null, 2));
    const comment = formatPrComment(result);
    await writeFile(path.join(dir, 'commentaire-pr.md'), comment);
    console.log(comment);
    console.log(`\nDétail : ${file}`);
    process.exit(result.confirmees.length ? 1 : 0);
  } catch (error) {
    console.error(`Échec : ${error.message}`);
    process.exit(2);
  }
}
