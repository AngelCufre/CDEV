/**
 * UI en HTML/CSS superpuesta al canvas (no texto 3D).
 * Encapsula la pantalla de inicio, hints de interacción, viñeta del despertar,
 * notificaciones narrativas y el fundido final. Todo se monta dentro de #overlay-root.
 */
export class Overlay {
  constructor(root) {
    this.root = root;

    this.startScreen = this._buildStartScreen();
    this.hint = this._buildHint();
    this.crosshair = this._buildCrosshair();
    this.eyelid = this._buildEyelid();
    this.vignette = this._buildVignette();
    this.narrativeText = this._buildNarrativeText();
    this.notificationsContainer = this._buildNotificationsContainer();
    this.fadeToBlack = this._buildFadeToBlack();

    root.append(
      this.startScreen,
      this.eyelid,
      this.vignette,
      this.crosshair,
      this.hint,
      this.narrativeText,
      this.notificationsContainer,
      this.fadeToBlack,
    );
  }

  // ---------- Pantalla de inicio ----------
  _buildStartScreen() {
    const el = document.createElement('div');
    el.className = 'start-screen';
    el.innerHTML = `
      <h1>El peor día — Escena 1: La habitación</h1>
      <p>
        Es de madrugada... o eso creés. Vas a despertarte, levantarte y descubrir qué hora es.
        Movete con <strong>WASD</strong>, mirá con el <strong>mouse</strong> y presioná
        <strong>E</strong> (o click) para interactuar con los objetos resaltados.
      </p>
      <button type="button">Comenzar</button>
    `;
    return el;
  }

  showStartScreen(onStart) {
    this.startScreen.classList.remove('hidden');
    const button = this.startScreen.querySelector('button');
    const handler = () => {
      button.removeEventListener('click', handler);
      onStart();
    };
    button.addEventListener('click', handler);
  }

  hideStartScreen() {
    this.startScreen.classList.add('hidden');
  }

  // ---------- Hint de interacción ----------
  _buildHint() {
    const el = document.createElement('div');
    el.className = 'interaction-hint';
    return el;
  }

  showHint(text) {
    this.hint.textContent = text;
    this.hint.classList.add('visible');
  }

  hideHint() {
    this.hint.classList.remove('visible');
  }

  // ---------- Punto de mira ----------
  _buildCrosshair() {
    const el = document.createElement('div');
    el.className = 'crosshair';
    return el;
  }

  setCrosshairVisible(visible) {
    this.crosshair.classList.toggle('visible', visible);
  }

  // ---------- Párpado (pantalla negra sólida) ----------
  _buildEyelid() {
    const el = document.createElement('div');
    el.className = 'eyelid';
    return el;
  }

  /** intensidad entre 0 (sin nada) y 1 (pantalla negra sólida). Usado en SLEEPING/WAKING. */
  setEyelidIntensity(intensity) {
    this.eyelid.style.opacity = String(Math.max(0, Math.min(1, intensity)));
  }

  // ---------- Viñeta (destellos de parpadeo, oscurece solo los bordes) ----------
  _buildVignette() {
    const el = document.createElement('div');
    el.className = 'vignette';
    return el;
  }

  /** intensidad entre 0 (sin viñeta) y 1 (bordes completamente oscuros, centro visible). */
  setVignetteIntensity(intensity) {
    this.vignette.style.opacity = String(Math.max(0, Math.min(1, intensity)));
  }

  // ---------- Texto narrativo (hora, etc.) ----------
  _buildNarrativeText() {
    const el = document.createElement('div');
    el.className = 'narrative-text';
    return el;
  }

  showNarrativeText(text) {
    this.narrativeText.textContent = text;
    this.narrativeText.classList.add('visible');
  }

  hideNarrativeText() {
    this.narrativeText.classList.remove('visible');
  }

  // ---------- Notificaciones ----------
  _buildNotificationsContainer() {
    const el = document.createElement('div');
    el.className = 'notifications';
    return el;
  }

  /** Muestra una lista de notificaciones con aparición escalonada. */
  showNotifications(items, staggerMs = 400) {
    this.notificationsContainer.innerHTML = '';
    items.forEach((text, index) => {
      const item = document.createElement('div');
      item.className = 'notification-item';
      item.textContent = text;
      this.notificationsContainer.appendChild(item);
      setTimeout(() => item.classList.add('visible'), index * staggerMs);
    });
  }

  clearNotifications() {
    this.notificationsContainer.innerHTML = '';
  }

  // ---------- Fundido final ----------
  _buildFadeToBlack() {
    const el = document.createElement('div');
    el.className = 'fade-to-black';
    el.innerHTML = '<span>Continuará…</span>';
    return el;
  }

  showFadeToBlack() {
    this.fadeToBlack.classList.add('visible');
  }

  dispose() {
    this.root.innerHTML = '';
  }
}
