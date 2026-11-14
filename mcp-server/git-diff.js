import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PETCLINIC_REPO = process.env.PETCLINIC_REPO ?? path.join(here, '..', 'petclinic-rest');
const MAX_DIFF = 12000;

// Contexte large pour l'analyse : situer une ligne d'openapi.yml ou de data.sql demande de remonter loin.
// En CI la PR est commitée : DIFF_BASE (ex. origin/main) compare la base à l'arbre de travail.
export function readDiff({ repo = PETCLINIC_REPO, context = 3, base = process.env.DIFF_BASE } = {}) {
  const args = ['diff', `-U${context}`, ...(base ? [base] : [])];
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

export function formatDiff(diff) {
  if (!diff.trim()) return 'Aucune modification : la PR est vide.';
  const body = diff.length > MAX_DIFF ? `${diff.slice(0, MAX_DIFF)}\n[... tronqué]` : diff;
  return `<diff_pr>\n${body}\n</diff_pr>`;
}
