const API = 'http://localhost:9966/petclinic/api/';
const FRONT_ORIGIN = 'http://localhost:4300';

async function call(method, chemin, body, headers = {}) {
  const response = await fetch(API + chemin, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* corps vide ou non JSON */ }
  return { status: response.status, json, headers: response.headers };
}

const OWNER_1 = { firstName: 'George', lastName: 'Franklin', address: '110 W. Liberty St.', telephone: '6085551023' };

// Une sonde par comportement : true = sain. Chaque régression du corpus doit en faire échouer une précise.
export const PROBES = {
  R01: async () => (await call('GET', 'owners/1')).json?.telephone === '6085551023',
  R02: async () => {
    const { status, json } = await call('GET', 'owners?lastName=Davis');
    return status === 200 && json.length > 0 && json.every((o) => o.lastName === 'Davis');
  },
  R03: async () => {
    const put = await call('PUT', 'owners/1', { ...OWNER_1, city: 'Lyon' });
    return put.status === 204 && (await call('GET', 'owners/1')).json?.city === 'Lyon';
  },
  R04: async () => (await call('GET', 'vets')).json?.find?.((v) => v.lastName === 'Leary')?.specialties?.length > 0,
  R05: async () => (await call('POST', 'owners', { firstName: 'Sonde', lastName: 'Test', address: '1 rue Haute', city: 'Lyon', telephone: '0612345678' })).status === 201,
  R06: async () => (await call('GET', 'pettypes')).status === 200,
  R07: async () => {
    const { status, headers } = await call('GET', 'pettypes', null, { Origin: FRONT_ORIGIN });
    return status === 200 && Boolean(headers.get('access-control-allow-origin'));
  },
  R08: async () => (await call('GET', 'owners')).json?.some?.((o) => o.pets.some((p) => p.visits.length > 0)) === true,
  R09: async () => {
    const description = 'Vaccination annuelle complète';
    const { status, json } = await call('POST', 'owners/1/pets/1/visits', { date: '2026-11-13', description });
    return status === 201 && json?.description === description;
  },
  R10: async () => (await call('GET', 'vets')).status === 200
};

export async function runProbes() {
  const results = {};
  for (const [id, probe] of Object.entries(PROBES)) {
    try {
      results[id] = await probe();
    } catch {
      results[id] = false;
    }
  }
  return results;
}
