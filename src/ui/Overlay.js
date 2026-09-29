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
    this.notesViewer = this._buildNotesViewer();
    this.objective = this._buildObjective();
    this.phone = this._buildPhone();
    this.toast = this._buildToast();
    this._toastTimer = null;
    this._notesPages = [];
    this._notesIndex = 0;
    this._notesZoom = 1;
    this._notesPan = { x: 0, y: 0 };

    root.append(
      this.startScreen,
      this.eyelid,
      this.vignette,
      this.crosshair,
      this.hint,
      this.narrativeText,
      this.notificationsContainer,
      this.objective,
      this.toast,
      this.phone,
      this.notesViewer,
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

  /** Fundido a negro con un texto centrado ("Continuará…", "Minutos después…"). */
  showFadeToBlack(text = 'Continuará…') {
    this.fadeToBlack.querySelector('span').textContent = text;
    this.fadeToBlack.classList.add('visible');
  }

  /** Sale del negro (entrada de una escena nueva). */
  hideFadeToBlack() {
    this.fadeToBlack.classList.remove('visible');
  }

  // ---------- Objetivo actual (esquina superior izquierda) ----------
  _buildObjective() {
    const el = document.createElement('div');
    el.className = 'objective';
    return el;
  }

  /** Muestra el objetivo actual, o lo oculta con `null`. */
  setObjective(text) {
    this.objective.textContent = text ?? '';
    this.objective.classList.toggle('visible', Boolean(text));
  }

  // ---------- Aviso breve (mensaje nuevo, etc.) ----------
  _buildToast() {
    const el = document.createElement('div');
    el.className = 'toast';
    return el;
  }

  showToast(text, durationMs = 3500) {
    this.toast.textContent = text;
    this.toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.hideToast(), durationMs);
  }

  hideToast() {
    clearTimeout(this._toastTimer);
    this.toast.classList.remove('visible');
  }

  // ---------- Celular en la mano (tecla R) ----------
  _buildPhone() {
    const el = document.createElement('div');
    el.className = 'phone';
    el.innerHTML = `
      <div class="phone-screen">
        <div class="phone-status">
          <span>Personal</span>
          <span class="phone-battery"></span>
        </div>
        <div class="phone-time"></div>
        <div class="phone-date">lunes</div>
        <div class="phone-notifications"></div>
        <div class="phone-help"><kbd>R</kbd> guardar</div>
      </div>
    `;
    return el;
  }

  get isPhoneVisible() {
    return this.phone.classList.contains('visible');
  }

  setPhoneVisible(visible) {
    this.phone.classList.toggle('visible', visible);
    if (visible) this.toast.classList.remove('visible');
  }

  setPhoneTime(text) {
    this.phone.querySelector('.phone-time').textContent = text;
  }

  setPhoneBattery(percent) {
    const battery = this.phone.querySelector('.phone-battery');
    battery.textContent = `${percent}%`;
    battery.classList.toggle('low', percent <= 15);
  }

  /** Reemplaza las notificaciones de la pantalla bloqueada (la más nueva arriba). */
  setPhoneNotifications(items) {
    const list = this.phone.querySelector('.phone-notifications');
    list.innerHTML = '';
    for (const item of [...items].reverse()) {
      const card = document.createElement('div');
      card.className = 'phone-notification';
      const header = document.createElement('div');
      header.className = 'phone-notification-header';
      header.textContent = item.hora ? `${item.de} · ${item.hora}` : item.de;
      const body = document.createElement('div');
      body.textContent = item.texto;
      card.append(header, body);
      list.appendChild(card);
    }
  }

  /** Deja la UI limpia para la escena siguiente. No toca el fundido a negro. */
  resetForSceneChange() {
    this.hideHint();
    this.setCrosshairVisible(false);
    this.hideNarrativeText();
    this.clearNotifications();
    this.closeNotes();
    this.setObjective(null);
    this.setPhoneVisible(false);
    this.hideToast();
    this.setEyelidIntensity(0);
    this.setVignetteIntensity(0);
  }

  // ---------- Visor de apuntes ----------
  _buildNotesViewer() {
    const el = document.createElement('div');
    el.className = 'notes-viewer';
    el.innerHTML = `
      <div class="notes-stage">
        <div class="notes-arrow notes-prev">‹</div>
        <div class="notes-page"><img alt="Hoja de apuntes" /></div>
        <div class="notes-arrow notes-next">›</div>
      </div>
      <div class="notes-toolbar">
        <span class="notes-counter"></span>
        <span class="notes-help">
          <kbd>←</kbd><kbd>→</kbd> cambiar hoja · rueda o <kbd>+</kbd><kbd>−</kbd> zoom ·
          mouse para recorrer · <kbd>E</kbd> cerrar
        </span>
      </div>
    `;
    return el;
  }

  /** Abre el visor en la primera hoja. `pages` es una lista de { url }. */
  openNotes(pages) {
    this._notesPages = pages;
    this._notesIndex = 0;
    this._renderNotesPage(null);
    this.notesViewer.classList.add('visible');
  }

  closeNotes() {
    this.notesViewer.classList.remove('visible');
  }

  showNextNote() {
    if (this._notesIndex >= this._notesPages.length - 1) return;
    this._notesIndex += 1;
    this._renderNotesPage('next');
  }

  showPrevNote() {
    if (this._notesIndex <= 0) return;
    this._notesIndex -= 1;
    this._renderNotesPage('prev');
  }

  /** Acerca (direction > 0) o aleja (direction < 0) la hoja, entre 100% y 400%. */
  zoomNote(direction) {
    const factor = direction > 0 ? 1.25 : 0.8;
    this._notesZoom = Math.min(4, Math.max(1, this._notesZoom * factor));
    if (this._notesZoom < 1.01) this._notesZoom = 1;
    this._applyNotesTransform();
  }

  /** Recorre la hoja ampliada con el movimiento del mouse (en píxeles de pantalla). */
  panNote(dx, dy) {
    if (this._notesZoom === 1) return;
    this._notesPan.x -= dx * 1.5;
    this._notesPan.y -= dy * 1.5;
    this._applyNotesTransform();
  }

  _applyNotesTransform() {
    // La imagen se escala desde el centro: se limita el paneo para que el borde
    // de la hoja ampliada nunca deje ver el vacío dentro del marco.
    const page = this.notesViewer.querySelector('.notes-page');
    const zoom = this._notesZoom;
    const maxX = ((zoom - 1) * page.clientWidth) / 2;
    const maxY = ((zoom - 1) * page.clientHeight) / 2;
    this._notesPan.x = Math.max(-maxX, Math.min(maxX, this._notesPan.x));
    this._notesPan.y = Math.max(-maxY, Math.min(maxY, this._notesPan.y));
    page.querySelector('img').style.transform =
      `translate(${this._notesPan.x}px, ${this._notesPan.y}px) scale(${zoom})`;
    this._updateNotesCounter();
  }

  _updateNotesCounter() {
    const zoomText = this._notesZoom > 1 ? ` · ${Math.round(this._notesZoom * 100)}%` : '';
    this.notesViewer.querySelector('.notes-counter').textContent =
      `Hoja ${this._notesIndex + 1} de ${this._notesPages.length}${zoomText}`;
  }

  _renderNotesPage(direction) {
    const total = this._notesPages.length;
    const page = this.notesViewer.querySelector('.notes-page');
    page.querySelector('img').src = this._notesPages[this._notesIndex].url;
    // Cada hoja arranca sin zoom.
    this._notesZoom = 1;
    this._notesPan = { x: 0, y: 0 };
    this._applyNotesTransform();
    this.notesViewer
      .querySelector('.notes-prev')
      .classList.toggle('disabled', this._notesIndex === 0);
    this.notesViewer
      .querySelector('.notes-next')
      .classList.toggle('disabled', this._notesIndex === total - 1);

    // Reinicia la animación de "pasar hoja" en la dirección correspondiente.
    page.classList.remove('turn-next', 'turn-prev');
    if (direction) {
      void page.offsetWidth; // fuerza reflow para que la animación arranque de nuevo
      page.classList.add(`turn-${direction}`);
    }
  }

  dispose() {
    this.root.innerHTML = '';
  }
}
