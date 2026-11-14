export function fakeMcp(responses = {}) {
  const calls = [];
  return {
    calls,
    definitions: (names) => ['ouvrir', 'lire_page', 'appeler_api']
      .filter((n) => !names || names.includes(n))
      .map((name) => ({ name, description: name, input_schema: { type: 'object' } })),
    has: (name) => ['ouvrir', 'lire_page', 'appeler_api'].includes(name),
    call: async (name, args) => {
      calls.push({ name, args });
      return { text: responses[name] ?? `${name} ok`, isError: false };
    }
  };
}

// Claude scripté : chaque élément est la liste d'appels d'outils d'un tour, ou "fin" pour end_turn.
export function scriptedClaude(turns, usage = { input_tokens: 1000, output_tokens: 100 }) {
  const requests = [];
  let id = 0;
  return {
    mode: 'fake',
    requests,
    send: async (params) => {
      requests.push(params);
      const turn = turns[requests.length - 1] ?? 'fin';
      if (turn === 'fin') return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'fini' }], usage };
      return {
        stop_reason: 'tool_use',
        content: turn.map(([name, input]) => ({ type: 'tool_use', id: `t${++id}`, name, input })),
        usage
      };
    }
  };
}

export const VALID_REPORT = {
  titre: 'Spécialités absentes',
  ecran_ou_endpoint: 'http://localhost:4300/petclinic/vets',
  attendu: 'Helen Leary affiche radiology',
  observe: 'Colonne Specialties vide pour tous',
  etapes: ['Ouvrir la page Veterinarians', 'Lire la ligne Helen Leary'],
  gravite: 'majeure'
};
