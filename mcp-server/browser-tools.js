import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { isAllowed, PETCLINIC_HOSTS } from './allowed-sites.js';

const MAX_TEXT = 8000;
const ACTION_TIMEOUT_MS = 5000;

export class BrowserTools {
  constructor(page, { allowedHosts = PETCLINIC_HOSTS, captureDir = 'captures' } = {}) {
    this.page = page;
    this.allowedHosts = allowedHosts;
    this.captureDir = captureDir;
  }

  async ouvrir(url) {
    if (!isAllowed(url, this.allowedHosts)) {
      return `Refusé : ${url} n'est pas un site autorisé.`;
    }
    const response = await this.page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    return `Ouvert : ${this.page.url()} (HTTP ${response ? response.status() : '?'})`;
  }

  // Texte visible plutôt que HTML brut : dix fois moins de jetons pour le modèle.
  async lirePage() {
    const text = await this.page.locator('body').innerText();
    const truncated = text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n[... tronqué]` : text;
    const controls = await this.listerControles();
    return `URL : ${this.page.url()}\n<contenu_page>\n${truncated}\n</contenu_page>${controls}`;
  }

  // Sans sélecteurs, le modèle lit la page mais ne peut pas remplir un formulaire.
  async listerControles() {
    const items = await this.page.$$eval('input, select, textarea, button', (elements) => elements
      .filter((e) => e.offsetParent !== null)
      .map((e) => {
        const tag = e.tagName.toLowerCase();
        const selector = e.id ? `#${e.id}` : e.name ? `${tag}[name="${e.name}"]` : null;
        if (tag === 'button') return `bouton "${e.innerText.trim()}"${e.disabled ? ' (désactivé)' : ''}`;
        if (!selector) return null;
        const options = tag === 'select' ? ` options=[${[...e.options].map((o) => o.text.trim()).join(', ')}]` : '';
        return `${tag} ${selector} valeur="${e.value}"${options}`;
      })
      .filter(Boolean));
    return items.length ? `\nContrôles :\n${items.map((i) => `- ${i}`).join('\n')}` : '';
  }

  async choisir(selecteur, option) {
    await this.page.locator(selecteur).first().selectOption({ label: option }, { timeout: ACTION_TIMEOUT_MS });
    return `Choisi : ${option} dans ${selecteur}`;
  }

  async cliquer(selecteur) {
    await this.page.locator(selecteur).first().click({ timeout: ACTION_TIMEOUT_MS });
    await this.page.waitForLoadState('networkidle');
    return `Cliqué : ${selecteur} → ${this.page.url()}`;
  }

  async remplir(selecteur, texte) {
    await this.page.locator(selecteur).first().fill(texte, { timeout: ACTION_TIMEOUT_MS });
    return `Rempli : ${selecteur}`;
  }

  async capture(nom = 'capture') {
    const safeName = nom.replace(/[^a-zA-Z0-9_-]/g, '_');
    await mkdir(this.captureDir, { recursive: true });
    const filePath = path.join(this.captureDir, `${safeName}.png`);
    await this.page.screenshot({ path: filePath, fullPage: true });
    return `Capture : ${path.resolve(filePath)}`;
  }
}
