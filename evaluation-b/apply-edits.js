// Git sous Windows extrait souvent en CRLF : on aligne find/replace sur les fins de ligne du fichier.
export function applyEdit(content, { find, replace }) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const target = find.replace(/\n/g, eol);
  const occurrences = content.split(target).length - 1;
  if (occurrences !== 1) {
    throw new Error(`"${find.slice(0, 60)}" trouvé ${occurrences} fois au lieu d'une`);
  }
  return content.replace(target, () => replace.replace(/\n/g, eol));
}
