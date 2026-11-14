import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverEnv } from '../mcp-tools.js';

test('serverEnv transmet les variables utiles au serveur MCP', () => {
  const env = serverEnv({ PETCLINIC_REPO: '/repo', DIFF_BASE: 'origin/master', PLAYWRIGHT_BROWSERS_PATH: '/ms-playwright' });
  assert.equal(env.PETCLINIC_REPO, '/repo');
  assert.equal(env.DIFF_BASE, 'origin/master');
  assert.equal(env.PLAYWRIGHT_BROWSERS_PATH, '/ms-playwright');
});

test('serverEnv ne transmet ni les secrets ni les variables absentes', () => {
  const env = serverEnv({ ANTHROPIC_API_KEY: 'secret', CLAUDE_MODE: 'real' });
  assert.equal(env.ANTHROPIC_API_KEY, undefined);
  assert.equal('PETCLINIC_REPO' in env, false);
});
