import { execSync, spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const API_REPO = process.env.PETCLINIC_REPO ?? path.join(here, '..', 'petclinic-rest');
export const API_PORT = 9966;
export const READY_URL = `http://localhost:${API_PORT}/petclinic/api/vets`;

export function parseListeningPid(netstatOutput, port) {
  const line = netstatOutput.split(/\r?\n/).find((l) => new RegExp(`:${port}\\s.*LISTENING`).test(l));
  return line ? Number(line.trim().split(/\s+/).at(-1)) : null;
}

function pidOnPort(port) {
  return parseListeningPid(execSync('netstat -ano -p tcp', { encoding: 'utf8' }), port);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function stopApi(port = API_PORT) {
  const pid = pidOnPort(port);
  if (!pid) return;
  execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
  for (let i = 0; i < 30 && pidOnPort(port); i++) await sleep(500);
}

// N'importe quelle réponse HTTP suffit : une API qui renvoie 401 ou 404 est démarrée, c'est peut-être la régression.
export async function waitReady(url = READY_URL, timeoutMs = 240_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      await sleep(2000);
    }
  }
  return false;
}

// Redémarre l'API sur le code courant (PR appliquée) : base H2 en mémoire, donc données neuves à chaque PR.
export async function restartApi({ repo = API_REPO, logFile = path.join(os.tmpdir(), 'petclinic-rest-agent.log') } = {}) {
  await stopApi();
  const log = openSync(logFile, 'w');
  const child = spawn('mvn -q -o spring-boot:run', { cwd: repo, shell: true, detached: true, windowsHide: true, stdio: ['ignore', log, log] });
  child.unref();
  if (!(await waitReady())) throw new Error(`L'API n'a pas démarré : voir ${logFile}`);
}
