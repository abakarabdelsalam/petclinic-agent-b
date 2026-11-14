import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runLoop } from '../agent-loop.js';
import { runRegressionAgent } from '../regression-agent.js';
import { verifyReport } from '../verifier.js';
import { validateReport } from '../report-validator.js';
import { costOf, createClaude } from '../claude-client.js';
import { formatPrComment } from '../pr-comment.js';
import { parseListeningPid } from '../api-runner.js';
import { fakeMcp, scriptedClaude, VALID_REPORT } from './helpers.js';

const LIMITS = { maxActions: 30, maxMs: 60_000, maxCostUsd: 10 };

test('validateReport accepte un rapport complet', () => {
  assert.deepEqual(validateReport(VALID_REPORT), { ok: true, erreurs: [] });
});

test('validateReport refuse champs manquants, gravité inconnue et attendu = observé', () => {
  const { ok, erreurs } = validateReport({ ...VALID_REPORT, etapes: [], gravite: 'grave', observe: VALID_REPORT.attendu });
  assert.equal(ok, false);
  assert.equal(erreurs.length, 3);
  assert.equal(validateReport(null).ok, false);
});

test('runLoop exécute les outils MCP et renvoie leurs résultats au modèle', async () => {
  const mcp = fakeMcp({ lire_page: 'Veterinarians' });
  const claude = scriptedClaude([[['ouvrir', { url: 'u' }], ['lire_page', {}]], 'fin']);
  const run = await runLoop({ claude, mcp, system: 's', prompt: 'p', limits: LIMITS });
  assert.deepEqual(mcp.calls.map((c) => c.name), ['ouvrir', 'lire_page']);
  const results = claude.requests[1].messages.at(-1).content;
  assert.equal(results[1].content, 'Veterinarians');
  assert.equal(run.arret, 'fin_sans_terminer');
  assert.equal(run.actions, 2);
});

test('runLoop signale un outil inconnu au modèle sans planter', async () => {
  const claude = scriptedClaude([[['effacer_tout', {}]], 'fin']);
  const run = await runLoop({ claude, mcp: fakeMcp(), system: 's', prompt: 'p', limits: LIMITS });
  assert.match(claude.requests[1].messages.at(-1).content[0].content, /Outil inconnu/);
  assert.equal(run.journal[0].erreur, true);
});

test('runLoop s\'arrête à la limite d\'actions', async () => {
  const claude = scriptedClaude(Array(10).fill([['lire_page', {}]]));
  const run = await runLoop({ claude, mcp: fakeMcp(), system: 's', prompt: 'p', limits: { ...LIMITS, maxActions: 3 } });
  assert.equal(run.arret, 'limite_actions');
  assert.equal(run.actions, 3);
});

test('runLoop s\'arrête à la limite de budget', async () => {
  const claude = scriptedClaude(Array(10).fill([['lire_page', {}]]), { input_tokens: 100_000, output_tokens: 0 });
  const run = await runLoop({ claude, mcp: fakeMcp(), system: 's', prompt: 'p', limits: { ...LIMITS, maxCostUsd: 0.25 } });
  assert.equal(run.arret, 'limite_budget');
  assert.equal(run.actions, 3);
});

test('runLoop s\'arrête à la limite de durée', async () => {
  let t = 0;
  const claude = scriptedClaude(Array(10).fill([['lire_page', {}]]));
  const run = await runLoop({ claude, mcp: fakeMcp(), system: 's', prompt: 'p', limits: { ...LIMITS, maxMs: 25 }, now: () => (t += 10) });
  assert.equal(run.arret, 'limite_duree');
});

test('runLoop met en cache les outils et le dernier message', async () => {
  const claude = scriptedClaude([[['lire_page', {}]], 'fin']);
  await runLoop({ claude, mcp: fakeMcp(), system: 's', prompt: 'p', limits: LIMITS });
  const { tools, messages } = claude.requests[1];
  assert.deepEqual(tools.at(-1).cache_control, { type: 'ephemeral' });
  assert.deepEqual(messages.at(-1).content.at(-1).cache_control, { type: 'ephemeral' });
  assert.equal(messages[0].content[0].cache_control, undefined);
});

test('l\'agent refuse un rapport invalide, garde le valide et s\'arrête sur terminer', async () => {
  const claude = scriptedClaude([
    [['signaler_regression', { titre: 'x' }]],
    [['signaler_regression', VALID_REPORT]],
    [['terminer', { resume: 'vets testés' }]]
  ]);
  const run = await runRegressionAgent({ claude, mcp: fakeMcp(), limits: LIMITS });
  assert.equal(run.rapports.length, 1);
  assert.equal(run.invalides.length, 1);
  assert.equal(run.arret, 'termine');
  assert.equal(run.resume, 'vets testés');
  assert.match(claude.requests[1].messages.at(-1).content[0].content, /Rapport refusé/);
});

test('le vérificateur confirme via l\'outil verdict, avec des outils limités', async () => {
  const claude = scriptedClaude([[['appeler_api', { methode: 'GET', chemin: 'vets' }]], [['verdict', { verdict: 'CONFIRMEE', raison: 'reproduit' }]]]);
  const result = await verifyReport({ claude, mcp: fakeMcp(), report: VALID_REPORT, diff: 'diff' });
  assert.equal(result.verdict, 'CONFIRMEE');
  assert.deepEqual(claude.requests[0].tools.map((t) => t.name).sort(), ['appeler_api', 'lire_page', 'ouvrir', 'verdict']);
});

test('sans verdict, le vérificateur rejette', async () => {
  const result = await verifyReport({ claude: scriptedClaude(['fin']), mcp: fakeMcp(), report: VALID_REPORT, diff: 'd' });
  assert.equal(result.verdict, 'REJETEE');
  assert.match(result.raison, /Pas de verdict/);
});

test('costOf compte entrée, sortie et cache', () => {
  assert.equal(costOf({ input_tokens: 1_000_000, output_tokens: 0 }, { input: 1, output: 5 }), 1);
  assert.equal(costOf({ input_tokens: 0, output_tokens: 1_000_000 }, { input: 1, output: 5 }), 5);
  assert.ok(Math.abs(costOf({ cache_read_input_tokens: 1_000_000 }, { input: 1, output: 5 }) - 0.1) < 1e-9);
});

test('le mode réel exige une clé, le mode simulé est le défaut', () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.throws(() => createClaude('real'), /ANTHROPIC_API_KEY/);
    assert.equal(createClaude('fake').mode, 'fake');
  } finally {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  }
});

test('le Claude simulé finit par terminer sans rapport', async () => {
  const run = await runRegressionAgent({ claude: createClaude('fake'), mcp: fakeMcp(), limits: LIMITS });
  assert.equal(run.arret, 'termine');
  assert.equal(run.rapports.length, 0);
});

test('formatPrComment liste les régressions confirmées', () => {
  const base = { rejetees: [], actions: 12, dureeMs: 60_000, coutUsd: 0.031, arret: 'termine' };
  assert.match(formatPrComment({ ...base, confirmees: [] }), /Aucune régression confirmée/);
  const text = formatPrComment({ ...base, confirmees: [{ rapport: VALID_REPORT, verification: { raison: 'reproduit' } }] });
  assert.match(text, /1 régression\(s\) confirmée\(s\)/);
  assert.match(text, /Spécialités absentes \(majeure\)/);
});

test('parseListeningPid lit le PID qui écoute sur le port', () => {
  const out = '  TCP    0.0.0.0:9966    0.0.0.0:0    LISTENING    4242\r\n  TCP    0.0.0.0:99660   0.0.0.0:0    LISTENING    1\r\n';
  assert.equal(parseListeningPid(out, 9966), 4242);
  assert.equal(parseListeningPid(out, 8080), null);
});
