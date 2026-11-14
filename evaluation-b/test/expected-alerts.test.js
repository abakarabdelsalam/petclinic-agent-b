import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertMatches, scoreLine } from '../expected-alerts.js';

test('une alerte sur la bonne régression est reconnue', () => {
  assert.equal(alertMatches('R01', 'Le numéro de téléphone des propriétaires est toujours null dans l\'API'), true);
  assert.equal(alertMatches('R07', 'Suppression de @CrossOrigin bloque les appels CORS à pettypes'), true);
});

test('une alerte sur une autre panne n\'est pas comptée', () => {
  assert.equal(alertMatches('R03', 'Les visites ne s\'affichent pas'), false);
  assert.equal(alertMatches('R07', 'Liste des propriétaires vide'), false);
});

test('une PR saine ne doit produire aucune alerte', () => {
  assert.equal(scoreLine('S01', 'saine', []), true);
  assert.equal(scoreLine('S01', 'saine', ['quelque chose']), false);
});

test('une régression sans alerte liée est ratée', () => {
  assert.equal(scoreLine('R04', 'regression', []), false);
  assert.equal(scoreLine('R04', 'regression', ['Liste des propriétaires vide']), false);
  assert.equal(scoreLine('R04', 'regression', ['Spécialités des vétérinaires absentes']), true);
});
