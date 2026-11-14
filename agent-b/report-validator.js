export const GRAVITES = ['bloquante', 'majeure', 'mineure'];
const TEXT_FIELDS = ['titre', 'ecran_ou_endpoint', 'attendu', 'observe'];

// Un rapport sans preuve observée ni étapes rejouables ne doit pas atteindre le vérificateur.
export function validateReport(report) {
  const erreurs = [];
  if (!report || typeof report !== 'object') return { ok: false, erreurs: ['rapport absent'] };
  for (const field of TEXT_FIELDS) {
    if (typeof report[field] !== 'string' || report[field].trim().length < 3) {
      erreurs.push(`${field} manquant ou trop court`);
    }
  }
  if (!Array.isArray(report.etapes) || report.etapes.length === 0 || report.etapes.some((e) => typeof e !== 'string' || !e.trim())) {
    erreurs.push('etapes doit être une liste non vide de phrases');
  }
  if (!GRAVITES.includes(report.gravite)) {
    erreurs.push(`gravite doit valoir ${GRAVITES.join(', ')}`);
  }
  if (typeof report.attendu === 'string' && report.attendu.trim() === report.observe?.trim()) {
    erreurs.push('attendu et observe sont identiques : ce n\'est pas une régression');
  }
  return { ok: erreurs.length === 0, erreurs };
}

export const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    titre: { type: 'string', description: 'Résumé court de la régression' },
    ecran_ou_endpoint: { type: 'string', description: 'URL de l\'écran ou appel d\'API concerné' },
    attendu: { type: 'string', description: 'Comportement attendu' },
    observe: { type: 'string', description: 'Comportement réellement observé, avec la preuve (texte lu, statut HTTP…)' },
    etapes: { type: 'array', items: { type: 'string' }, description: 'Étapes pour reproduire' },
    gravite: { type: 'string', enum: GRAVITES }
  },
  required: ['titre', 'ecran_ou_endpoint', 'attendu', 'observe', 'etapes', 'gravite']
};
