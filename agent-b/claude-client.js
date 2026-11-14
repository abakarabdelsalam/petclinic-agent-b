import Anthropic from '@anthropic-ai/sdk';

export const DEFAULT_MODEL = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5';
// Dollars par million de jetons (Haiku 4.5), surchargeables si le tarif change.
export const PRICES = {
  input: Number(process.env.PRICE_INPUT_PER_MILLION ?? 1),
  output: Number(process.env.PRICE_OUTPUT_PER_MILLION ?? 5)
};

export function costOf(usage, prices = PRICES) {
  const input = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1;
  return (input * prices.input + (usage.output_tokens ?? 0) * prices.output) / 1_000_000;
}

// Mode simulé par défaut : aucun appel payant tant que CLAUDE_MODE=real n'est pas posé.
export function createClaude(mode = process.env.CLAUDE_MODE ?? 'fake') {
  if (mode === 'real') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY est requise quand CLAUDE_MODE=real');
    const client = new Anthropic();
    return { mode, send: (params) => client.messages.create(params) };
  }
  return { mode: 'fake', send: async (params) => fakeResponse(params) };
}

let fakeId = 0;
function toolUse(name, input) {
  return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `fake_${++fakeId}`, name, input }], usage: { input_tokens: 0, output_tokens: 0 } };
}

function lastToolResult(messages) {
  const last = messages.at(-1);
  return Array.isArray(last.content) ? last.content.find((b) => b.type === 'tool_result')?.content ?? '' : '';
}

// Parcours déterministe pour tester la tuyauterie : jamais de rapport, donc jamais de faux positif.
function fakeResponse({ messages, tools }) {
  const turn = messages.filter((m) => m.role === 'assistant').length;
  const names = tools.map((t) => t.name);
  if (names.includes('verdict')) return toolUse('verdict', { verdict: 'REJETEE', raison: 'Mode simulé.' });
  if (turn === 0) return toolUse('analyser_diff', {});
  if (turn === 1) {
    let ecran = 'http://localhost:4300/petclinic/';
    try { ecran = JSON.parse(lastToolResult(messages)).ecrans[0] ?? ecran; } catch { /* diff vide ou illisible */ }
    return toolUse('ouvrir', { url: ecran });
  }
  if (turn === 2) return toolUse('lire_page', {});
  return toolUse('terminer', { resume: 'Mode simulé : parcours minimal, aucune régression recherchée.' });
}
