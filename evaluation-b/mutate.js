import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyEdit } from './apply-edits.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO = process.env.PETCLINIC_REPO ?? path.join(here, '..', 'petclinic-rest');

export async function loadMutations(file = process.env.CORPUS ?? 'mutations.json') {
  return JSON.parse(await readFile(path.join(here, file), 'utf8')).mutations;
}

function git(repo, ...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

// Remet les fichiers suivis dans l'état du commit de base : une seule PR à la fois.
export function reset(repo) {
  git(repo, 'checkout', '--', '.');
}

export async function apply(id, repo) {
  const mutation = (await loadMutations()).find((m) => m.id === id);
  if (!mutation) throw new Error(`Mutation inconnue : ${id}`);
  if (git(repo, 'status', '--porcelain', '--untracked-files=no').trim()) {
    throw new Error('Arbre de travail modifié : lancez "reset" d\'abord.');
  }
  for (const edit of mutation.edits) {
    const file = path.join(repo, edit.file);
    await writeFile(file, applyEdit(await readFile(file, 'utf8'), edit));
  }
  return mutation;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, id, repo = DEFAULT_REPO] = process.argv.slice(2);
  if (command === 'list') {
    for (const m of await loadMutations()) console.log(`${m.id}  ${m.titre}`);
  } else if (command === 'apply') {
    const m = await apply(id, repo);
    console.log(`PR ${m.id} appliquée : « ${m.titre} ». Voir : git -C "${repo}" diff`);
  } else if (command === 'reset') {
    reset(repo);
    console.log('Arbre de travail remis à la base.');
  } else {
    console.log('Usage : node mutate.js list | apply <id> [repo] | reset [repo]');
  }
}
