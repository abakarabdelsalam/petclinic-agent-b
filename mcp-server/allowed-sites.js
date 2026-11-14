export const PETCLINIC_HOSTS = ['localhost:4300', 'localhost:9966'];

// Le navigateur ne doit sortir que vers PetClinic : une page piégée ne peut pas l'envoyer ailleurs.
export function isAllowed(url, allowedHosts = PETCLINIC_HOSTS) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  return allowedHosts.includes(parsed.host);
}
