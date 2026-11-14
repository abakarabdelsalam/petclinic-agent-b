// Termes qui identifient la régression, tirés de son impact (pas des alertes produites).
// Une alerte n'est comptée comme bonne que si elle contient l'un de ces termes.
const TERMES = {
  R01: /t[ée]l[ée]phone|phone/i,
  R02: /nom|filtr|lastName|recherche/i,
  R03: /ville|city/i,
  R04: /sp[ée]cialit|specialt/i,
  R05: /t[ée]l[ée]phone|format|10 chiffres/i,
  R06: /pettypes|pet-types|pet types|types? /i,
  R07: /cors/i,
  R08: /visit/i,
  R09: /description|tronqu/i,
  R10: /401|authentif|s[ée]curit/i,
  H01: /v[ée]t[ée]rinaire|vet|404/i,
  H02: /animal|pet/i,
  H05: /nom de famille|lastName|nom/i,
  H06: /nom de l'animal|animal|pet/i
};

export function alertMatches(id, text) {
  const terme = TERMES[id];
  return terme ? terme.test(text) : false;
}

export function scoreLine(id, type, confirmees) {
  if (type !== 'regression') return confirmees.length === 0;
  return confirmees.some((t) => alertMatches(id, t));
}
