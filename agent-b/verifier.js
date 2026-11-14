import { runLoop } from './agent-loop.js';
import { VERIFIER_SYSTEM, verifierPrompt } from './prompts.js';

export const VERIFIER_LIMITS = { maxActions: 12, maxMs: 3 * 60_000, maxCostUsd: 0.08 };
const VERIFIER_MCP_TOOLS = ['ouvrir', 'lire_page', 'cliquer', 'remplir', 'choisir', 'appeler_api'];

// Verdict par un outil à énumération, pas par du texte libre : rien à interpréter, donc rien à mal lire.
export async function verifyReport({ claude, mcp, report, diff, limits = VERIFIER_LIMITS, model }) {
  let verdict = null;
  const localTools = {
    verdict: {
      definition: {
        name: 'verdict',
        description: 'Rend le verdict final sur le rapport.',
        input_schema: {
          type: 'object',
          properties: { verdict: { type: 'string', enum: ['CONFIRMEE', 'REJETEE'] }, raison: { type: 'string' } },
          required: ['verdict', 'raison']
        }
      },
      handle: (input) => {
        if (!['CONFIRMEE', 'REJETEE'].includes(input.verdict)) {
          return { text: 'verdict doit valoir CONFIRMEE ou REJETEE.', isError: true };
        }
        verdict = { verdict: input.verdict, raison: input.raison ?? '' };
        return { text: 'Verdict enregistré.', stop: true };
      }
    }
  };

  const run = await runLoop({
    claude, mcp, model, limits, localTools,
    system: VERIFIER_SYSTEM,
    prompt: verifierPrompt(report, diff),
    mcpToolNames: VERIFIER_MCP_TOOLS
  });
  // Sans verdict explicite, on rejette : mieux vaut rater une régression qu'inventer une alerte.
  return { ...(verdict ?? { verdict: 'REJETEE', raison: `Pas de verdict (arrêt : ${run.arret}).` }), coutUsd: run.coutUsd, actions: run.actions };
}
