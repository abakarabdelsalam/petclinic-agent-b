import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const MCP_SERVER = path.join(here, '..', 'mcp-server', 'server.js');

// Le SDK ne transmet au serveur qu'un environnement minimal : ces variables doivent être passées explicitement.
export const FORWARDED_ENV = ['PETCLINIC_REPO', 'DIFF_BASE', 'PLAYWRIGHT_BROWSERS_PATH'];

export function serverEnv(source = process.env) {
  const forwarded = Object.fromEntries(FORWARDED_ENV.filter((name) => source[name]).map((name) => [name, source[name]]));
  return { ...getDefaultEnvironment(), ...forwarded };
}

// Pont entre le serveur MCP et l'API Claude : mêmes outils, format Anthropic.
export class McpTools {
  static async connect(serverPath = MCP_SERVER) {
    const client = new Client({ name: 'agent-non-regression', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: 'node', args: [serverPath], env: serverEnv(), stderr: 'ignore' }));
    const { tools } = await client.listTools();
    return new McpTools(client, tools);
  }

  constructor(client, tools) {
    this.client = client;
    this.tools = tools;
  }

  definitions(names = null) {
    return this.tools
      .filter((t) => !names || names.includes(t.name))
      .map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
  }

  has(name) {
    return this.tools.some((t) => t.name === name);
  }

  async call(name, args) {
    const result = await this.client.callTool({ name, arguments: args ?? {} });
    return { text: result.content.map((c) => c.text ?? '').join('\n'), isError: Boolean(result.isError) };
  }

  async close() {
    await this.client.close();
  }
}
