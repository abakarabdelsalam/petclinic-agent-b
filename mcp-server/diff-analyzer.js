const FRONT = 'http://localhost:4300/petclinic';

// Écrans du front et appels d'API qui dépendent de chaque domaine.
export const IMPACT = {
  owners: {
    ecrans: [`${FRONT}/owners`, `${FRONT}/owners/add`, `${FRONT}/owners/1`, `${FRONT}/owners/1/edit`],
    api: ['GET owners', 'GET owners?lastName=Davis', 'GET owners/1', 'POST owners', 'PUT owners/{id}']
  },
  pets: {
    ecrans: [`${FRONT}/owners/1`, `${FRONT}/owners/1/pets/add`, `${FRONT}/pets/1/edit`],
    api: ['GET pets', 'GET pets/1', 'POST owners/{id}/pets', 'PUT pets/{id}']
  },
  pettypes: {
    ecrans: [`${FRONT}/pettypes`, `${FRONT}/owners/1/pets/add`],
    api: ['GET pettypes', 'GET pettypes/1', 'POST pettypes']
  },
  visits: {
    ecrans: [`${FRONT}/owners/1`, `${FRONT}/pets/1/visits/add`],
    api: ['GET visits', 'POST owners/{id}/pets/{petId}/visits']
  },
  vets: {
    ecrans: [`${FRONT}/vets`, `${FRONT}/vets/add`],
    api: ['GET vets', 'GET vets/1', 'POST vets']
  },
  specialties: {
    ecrans: [`${FRONT}/specialties`, `${FRONT}/vets`],
    api: ['GET specialties']
  }
};

const ALL = Object.keys(IMPACT);

// Ordre important : "PetType" doit passer avant "Pet".
const NAME_RULES = [
  [/pettype|pet-type|\btypes\b/i, 'pettypes'],
  [/owner/i, 'owners'],
  [/visit/i, 'visits'],
  [/specialt/i, 'specialties'],
  [/vet/i, 'vets'],
  [/pet/i, 'pets']
];

export function domainFromName(text) {
  const rule = NAME_RULES.find(([pattern]) => pattern.test(text));
  return rule ? rule[1] : null;
}

// Découpe un diff unifié : pour chaque fichier, les lignes ajoutées/supprimées
// et le contexte qui les précède (utile pour situer une modif dans openapi.yml).
export function parseDiff(diffText) {
  const files = [];
  let current = null;
  let context = [];
  for (const line of diffText.split(/\r?\n/)) {
    const header = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (header) {
      current = { file: header[2], changes: [] };
      files.push(current);
      context = [];
    } else if (current && /^[+-](?![+-]{2} )/.test(line)) {
      current.changes.push({ line: line.slice(1), before: [...context] });
    } else if (current && line.startsWith(' ')) {
      context.push(line.slice(1));
    }
  }
  return files;
}

// Dans openapi.yml, une modif appartient au dernier chemin ("  /owners:") ou schéma ("    Owner:") qui la précède.
function openapiDomains(changes) {
  const domains = new Set();
  for (const { line, before } of changes) {
    const anchors = [...before, line].reverse();
    const anchor = anchors.find((l) => /^ {2}\/[\w{}\/-]+:/.test(l) || /^ {4}[A-Z]\w*:\s*$/.test(l)) ?? line;
    const domain = domainFromName(anchor);
    if (domain) domains.add(domain);
  }
  return domains;
}

export function domainsForFile({ file, changes }) {
  if (/application[\w-]*\.properties$|\/security\/|\/config\//.test(file)) {
    return { domains: ALL, raison: 'configuration globale' };
  }
  if (/\/db\/.+\.sql$/.test(file)) {
    const fromSql = new Set(changes.map((c) => domainFromName(c.line.match(/INSERT INTO (\w+)/i)?.[1] ?? c.before.findLast((l) => /INSERT INTO/i.test(l)) ?? '')).filter(Boolean));
    return fromSql.size ? { domains: [...fromSql], raison: 'données de démo' } : { domains: ALL, raison: 'schéma ou données' };
  }
  if (file.endsWith('openapi.yml')) {
    const domains = openapiDomains(changes);
    return domains.size ? { domains: [...domains], raison: 'contrat OpenAPI' } : { domains: ALL, raison: 'contrat OpenAPI (zone inconnue)' };
  }
  const domain = domainFromName(file.split('/').pop());
  return domain ? { domains: [domain], raison: 'code' } : { domains: ALL, raison: 'fichier non reconnu' };
}

export function analyzeDiff(diffText) {
  const files = parseDiff(diffText).map((f) => ({ fichier: f.file, ...domainsForFile(f) }));
  const domains = [...new Set(files.flatMap((f) => f.domains))];
  return {
    fichiers: files,
    domaines: domains,
    ecrans: [...new Set(domains.flatMap((d) => IMPACT[d].ecrans))],
    api: [...new Set(domains.flatMap((d) => IMPACT[d].api))]
  };
}
