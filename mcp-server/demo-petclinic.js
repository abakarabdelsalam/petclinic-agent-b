import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Rejoue via MCP ce que fera l'agent : ouvrir PetClinic, lire, naviguer, capturer.
const client = new Client({ name: 'demo', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: 'node', args: ['server.js'] }));

async function call(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  console.log(`\n> ${name} ${JSON.stringify(args)}\n${result.content[0].text}`);
}

try {
  await call('ouvrir', { url: 'http://localhost:4300/' });
  await call('lire_page');
  await call('ouvrir', { url: 'http://localhost:4300/vets' });
  await call('lire_page');
  await call('capture', { nom: 'veterinaires' });
  await call('appeler_api', { methode: 'GET', chemin: 'owners/1' });
  await call('appeler_api', { methode: 'GET', chemin: 'owners/999' });
} finally {
  await client.close();
}
