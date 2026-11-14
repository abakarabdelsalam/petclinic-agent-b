import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { ApiTools } from '../api-tools.js';

let server, api;
const received = [];

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      received.push({ method: req.method, url: req.url, body, type: req.headers['content-type'] });
      if (req.url === '/petclinic/api/owners/999') {
        res.statusCode = 404;
        return res.end('{"detail":"introuvable"}');
      }
      res.statusCode = req.method === 'POST' ? 201 : 200;
      res.end('[{"id":1}]');
    });
  });
  await new Promise((resolve) => server.listen(0, resolve));
  api = new ApiTools({ baseUrl: `http://localhost:${server.address().port}/petclinic/api/` });
});

after(() => server.close());

test('GET renvoie le statut et le corps balisé', async () => {
  const result = await api.appeler('GET', '/vets');
  assert.match(result, /GET \/petclinic\/api\/vets → HTTP 200/);
  assert.match(result, /<reponse_api>\n\[\{"id":1\}\]/);
});

test('POST envoie le corps JSON', async () => {
  const result = await api.appeler('POST', 'owners', { firstName: 'Léo' });
  assert.match(result, /HTTP 201/);
  const last = received.at(-1);
  assert.equal(last.body, '{"firstName":"Léo"}');
  assert.equal(last.type, 'application/json');
});

test('un statut d\'erreur est rapporté, pas levé', async () => {
  assert.match(await api.appeler('GET', 'owners/999'), /HTTP 404/);
});

test('réessaie une panne réseau puis réussit', async () => {
  let calls = 0;
  const flaky = new ApiTools({
    retryDelayMs: 1,
    fetchImpl: async () => {
      if (++calls < 3) throw new TypeError('fetch failed');
      return new Response('ok', { status: 200 });
    }
  });
  assert.match(await flaky.appeler('GET', 'vets'), /HTTP 200/);
  assert.equal(calls, 3);
});

test('abandonne après 3 pannes réseau', async () => {
  let calls = 0;
  const down = new ApiTools({ retryDelayMs: 1, fetchImpl: async () => { calls++; throw new TypeError('fetch failed'); } });
  await assert.rejects(down.appeler('GET', 'vets'), /fetch failed/);
  assert.equal(calls, 3);
});

test('ne réessaie pas un statut HTTP d\'erreur', async () => {
  let calls = 0;
  const failing = new ApiTools({ fetchImpl: async () => { calls++; return new Response('', { status: 500 }); } });
  assert.match(await failing.appeler('GET', 'vets'), /HTTP 500/);
  assert.equal(calls, 1);
});

test('refuse de sortir de l\'API', async () => {
  const before = received.length;
  assert.match(await api.appeler('GET', '../../etc'), /^Refusé/);
  assert.match(await api.appeler('GET', 'http://example.com/x'), /^Refusé/);
  assert.equal(received.length, before);
});
