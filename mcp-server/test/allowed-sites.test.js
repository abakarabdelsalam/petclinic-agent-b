import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed } from '../allowed-sites.js';

test('accepte le front et l\'API PetClinic', () => {
  assert.equal(isAllowed('http://localhost:4300/owners'), true);
  assert.equal(isAllowed('http://localhost:9966/petclinic/api/vets'), true);
});

test('refuse les autres hôtes et ports', () => {
  assert.equal(isAllowed('https://example.com'), false);
  assert.equal(isAllowed('http://localhost:4200'), false);
  assert.equal(isAllowed('http://localhost:4300.evil.com'), false);
});

test('refuse les protocoles non web et les URL invalides', () => {
  assert.equal(isAllowed('file:///C:/Windows/win.ini'), false);
  assert.equal(isAllowed('javascript:alert(1)'), false);
  assert.equal(isAllowed('pas une url'), false);
});
