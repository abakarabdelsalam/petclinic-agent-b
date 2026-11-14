import { isAllowed } from './allowed-sites.js';

export const API_BASE = 'http://localhost:9966/petclinic/api/';
const MAX_BODY = 8000;
const TIMEOUT_MS = 5000;

export class ApiTools {
  constructor({ baseUrl = API_BASE, fetchImpl = fetch, retries = 3, retryDelayMs = 500 } = {}) {
    this.baseUrl = baseUrl;
    this.allowedHosts = [new URL(baseUrl).host];
    this.fetch = fetchImpl;
    this.retries = retries;
    this.retryDelayMs = retryDelayMs;
  }

  // Seule une panne réseau est réessayée : un 4xx/5xx est une réponse, donc une preuve.
  async fetchWithRetry(url, options) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
      } catch (error) {
        if (attempt >= this.retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      }
    }
  }

  // Chemin relatif à l'API ("owners/1") : le modèle ne peut pas viser un autre serveur.
  async appeler(methode, chemin, corps) {
    const url = new URL(chemin.replace(/^\/+/, ''), this.baseUrl);
    if (!isAllowed(url.href, this.allowedHosts) || !url.href.startsWith(this.baseUrl)) {
      return `Refusé : ${chemin} sort de l'API PetClinic.`;
    }
    const options = { method: methode, headers: {} };
    if (corps !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = typeof corps === 'string' ? corps : JSON.stringify(corps);
    }
    const response = await this.fetchWithRetry(url, options);
    const text = await response.text();
    const body = text.length > MAX_BODY ? `${text.slice(0, MAX_BODY)}\n[... tronqué]` : text;
    return `${methode} ${url.pathname} → HTTP ${response.status}\n<reponse_api>\n${body}\n</reponse_api>`;
  }
}
