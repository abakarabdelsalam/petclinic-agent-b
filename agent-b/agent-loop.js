import { costOf, DEFAULT_MODEL } from './claude-client.js';

export const DEFAULT_LIMITS = { maxActions: 30, maxMs: 6 * 60_000, maxCostUsd: 0.25 };

// Le préfixe de la conversation est relu à chaque tour : le marquer en cache divise son coût par dix.
function withCacheBreakpoint(messages) {
  const copy = messages.slice();
  const last = copy.at(-1);
  if (Array.isArray(last.content) && last.content.length) {
    const blocks = last.content.slice();
    blocks[blocks.length - 1] = { ...blocks.at(-1), cache_control: { type: 'ephemeral' } };
    copy[copy.length - 1] = { ...last, content: blocks };
  }
  return copy;
}

/**
 * Boucle d'agent générique : le modèle choisit un outil, on l'exécute, on renvoie le résultat.
 * localTools : { nom: { definition, handle(input) → { text, stop } } } ; les autres outils passent par MCP.
 */
export async function runLoop({ claude, mcp, system, prompt, mcpToolNames = null, localTools = {}, limits = DEFAULT_LIMITS, model = DEFAULT_MODEL, now = Date.now }) {
  const local = Object.values(localTools).map((t) => t.definition);
  const tools = [...mcp.definitions(mcpToolNames), ...local];
  tools[tools.length - 1] = { ...tools.at(-1), cache_control: { type: 'ephemeral' } };

  const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
  const journal = [];
  const start = now();
  let cost = 0;
  let actions = 0;
  let arret = null;

  while (!arret) {
    const response = await claude.send({ model, max_tokens: 2048, system, tools, messages: withCacheBreakpoint(messages) });
    cost += costOf(response.usage ?? {});
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      arret = response.stop_reason === 'end_turn' ? 'fin_sans_terminer' : response.stop_reason;
      break;
    }

    const results = [];
    for (const block of response.content.filter((b) => b.type === 'tool_use')) {
      actions++;
      let outcome;
      try {
        outcome = localTools[block.name]
          ? await localTools[block.name].handle(block.input ?? {})
          : mcp.has(block.name)
            ? await mcp.call(block.name, block.input)
            : { text: `Outil inconnu : ${block.name}`, isError: true };
      } catch (error) {
        outcome = { text: `Erreur : ${error.message}`, isError: true };
      }
      journal.push({ outil: block.name, entree: block.input, erreur: Boolean(outcome.isError) });
      results.push({ type: 'tool_result', tool_use_id: block.id, content: outcome.text, ...(outcome.isError ? { is_error: true } : {}) });
      if (outcome.stop) arret = 'termine';
    }
    messages.push({ role: 'user', content: results });

    if (arret) break;
    if (actions >= limits.maxActions) arret = 'limite_actions';
    else if (now() - start >= limits.maxMs) arret = 'limite_duree';
    else if (cost >= limits.maxCostUsd) arret = 'limite_budget';
  }

  return { arret, actions, coutUsd: cost, dureeMs: now() - start, journal };
}
