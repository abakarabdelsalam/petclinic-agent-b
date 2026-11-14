import { runLoop, DEFAULT_LIMITS } from './agent-loop.js';
import { AGENT_SYSTEM, AGENT_PROMPT } from './prompts.js';
import { validateReport, REPORT_SCHEMA } from './report-validator.js';

export async function runRegressionAgent({ claude, mcp, limits = DEFAULT_LIMITS, model }) {
  const rapports = [];
  const invalides = [];
  let resume = '';

  const localTools = {
    signaler_regression: {
      definition: { name: 'signaler_regression', description: 'Signale une régression reproduite, avec sa preuve.', input_schema: REPORT_SCHEMA },
      handle: (report) => {
        const { ok, erreurs } = validateReport(report);
        if (!ok) {
          invalides.push({ report, erreurs });
          return { text: `Rapport refusé : ${erreurs.join(' ; ')}. Corrige-le et renvoie-le.`, isError: true };
        }
        rapports.push(report);
        return { text: `Rapport n°${rapports.length} enregistré.` };
      }
    },
    terminer: {
      definition: {
        name: 'terminer',
        description: 'Termine le test quand les écrans impactés sont couverts.',
        input_schema: { type: 'object', properties: { resume: { type: 'string' } }, required: ['resume'] }
      },
      handle: (input) => {
        resume = input.resume ?? '';
        return { text: 'Test terminé.', stop: true };
      }
    }
  };

  const run = await runLoop({ claude, mcp, system: AGENT_SYSTEM, prompt: AGENT_PROMPT, localTools, limits, model });
  return { ...run, rapports, invalides, resume };
}
