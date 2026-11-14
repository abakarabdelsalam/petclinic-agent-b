// Commentaire Markdown posté sur la PR par Jenkins.
export function formatPrComment(result) {
  const lines = ['## Agent de non-régression PetClinic', ''];
  if (result.confirmees.length === 0) {
    lines.push('Aucune régression confirmée.');
  } else {
    lines.push(`**${result.confirmees.length} régression(s) confirmée(s)**`, '');
    for (const { rapport, verification } of result.confirmees) {
      lines.push(`### ${rapport.titre} (${rapport.gravite})`);
      lines.push(`- **Où :** ${rapport.ecran_ou_endpoint}`);
      lines.push(`- **Attendu :** ${rapport.attendu}`);
      lines.push(`- **Observé :** ${rapport.observe}`);
      lines.push(`- **Reproduire :** ${rapport.etapes.join(' → ')}`);
      lines.push(`- **Vérificateur :** ${verification.raison}`, '');
    }
  }
  if (result.rejetees.length) lines.push('', `_${result.rejetees.length} signalement(s) écarté(s) par le vérificateur._`);
  lines.push('', `_${result.actions} actions, ${(result.dureeMs / 1000).toFixed(0)} s, ${result.coutUsd.toFixed(3)} $, arrêt : ${result.arret}._`);
  return lines.join('\n');
}
