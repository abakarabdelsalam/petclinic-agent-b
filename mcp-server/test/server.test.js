import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.js');

test('le serveur expose les 9 outils et refuse un site non autorisé via MCP', async () => {
  const client = new Client({ name: 'test', version: '1.0.0' });
  // Sans env explicite, le SDK masque PLAYWRIGHT_BROWSERS_PATH et le serveur ne trouve pas Chromium en CI.
  await client.connect(new StdioClientTransport({ command: 'node', args: [serverPath], env: { ...getDefaultEnvironment(), ...process.env } }));
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['analyser_diff', 'appeler_api', 'capture', 'choisir', 'cliquer', 'lire_diff', 'lire_page', 'ouvrir', 'remplir']);

    const result = await client.callTool({ name: 'ouvrir', arguments: { url: 'https://example.com' } });
    assert.match(result.content[0].text, /^Refusé/);
  } finally {
    await client.close();
  }
});
