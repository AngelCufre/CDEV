import { config } from '../config.js';

const ICON_PATHS = {
  estres:
    'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z',
  mojado: 'M12 2.8s-6.5 7.3-6.5 11.7a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.8 12 2.8z',
  preparacion:
    'M3.5 5.2c2.6-.9 5.4-.6 7.7 1v13c-2.3-1.5-5.1-1.9-7.7-1V5.2zm17 0c-2.6-.9-5.4-.6-7.7 1v13c2.3-1.5 5.1-1.9 7.7-1V5.2z',
};

/** Stats que se muestran, en orden. */
export const STAT_INFO = [
  { key: 'estres', label: 'Estrés' },
  { key: 'mojado', label: 'Mojado' },
  { key: 'preparacion', label: 'Preparación' },
];

const LABELS = Object.fromEntries(STAT_INFO.map(({ key, label }) => [key, label]));

function statLabel(key) {
  return LABELS[key] ?? key;
}

/** Ícono SVG del stat (corazón, gota, libro), para insertar con innerHTML. */
export function statIcon(key) {
  return `<svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON_PATHS[key]}"/></svg>`;
}

/** "+12" / "−3" (con signo menos tipográfico). */
export function formatDelta(amount) {
  const rounded = Math.round(amount);
  return `${rounded >= 0 ? '+' : '−'}${Math.abs(rounded)}`;
}

/** Chip de color con el cambio de un stat: "+12 estrés". */
export function createStatChip(key, amount, { withIcon = false } = {}) {
  const chip = document.createElement('span');
  chip.className = 'stat-chip';
  chip.dataset.stat = key;
  if (withIcon) chip.innerHTML = statIcon(key);
  chip.append(`${formatDelta(amount)} ${statLabel(key).toLowerCase()}`);
  return chip;
}

const FEED_MAX = 4;
const FEED_LIFE_MS = 4300; // coincide con la animación feed-out del CSS

/**
 * HUD de stats arriba a la derecha: una barra por stat (el estrés más grande, de verde a
 * rojo y con un corazón que late), el aviso de respirar hondo y, debajo, los eventos que
 * los fueron cambiando ("+10 estrés · El colectivo pasó lleno").
 *
 * Las barras siguen al valor con un poco de demora: lo que acaba de subir (o bajar) se ve
 * como un tramo más claro que se va completando.
 */
export class StatsHud {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'stats-hud';
    this.el.innerHTML = `
      <div class="stats-panel">
        ${STAT_INFO.map(
          ({ key, label }) => `
          <div class="stat" data-stat="${key}">
            <div class="stat-head">
              ${statIcon(key)}<span class="stat-label">${label}</span><span class="stat-value">0%</span>
            </div>
            <div class="stat-track"><div class="stat-ghost"></div><div class="stat-fill"></div></div>
          </div>`,
        ).join('')}
        <div class="stats-breath"><span class="breath-ring"></span><span class="breath-text"></span></div>
      </div>
      <div class="stats-feed"></div>
    `;
    this.panel = this.el.querySelector('.stats-panel');
    this.feed = this.el.querySelector('.stats-feed');
    this.breath = this.el.querySelector('.stats-breath');
    this._breathState = null;
    this._stressHue = null;

    this._rows = {};
    for (const { key } of STAT_INFO) {
      const row = this.el.querySelector(`.stat[data-stat="${key}"]`);
      this._rows[key] = {
        row,
        fill: row.querySelector('.stat-fill'),
        ghost: row.querySelector('.stat-ghost'),
        value: row.querySelector('.stat-value'),
        icon: row.querySelector('.stat-icon'),
        shown: null, // valor que sigue al real con demora
        text: '',
      };
    }
  }

  setVisible(visible) {
    this.el.classList.toggle('visible', visible);
  }

  /** Cada frame: barras, color del estrés, latido del corazón y aviso de respirar. */
  update(delta, values, { pulse = 0, breathing = false } = {}) {
    const follow = 1 - Math.exp(-delta * 4);
    for (const { key } of STAT_INFO) {
      const r = this._rows[key];
      const value = values[key];
      r.shown = r.shown === null ? value : r.shown + (value - r.shown) * follow;
      r.fill.style.transform = `scaleX(${Math.min(value, r.shown) / 100})`;
      r.ghost.style.transform = `scaleX(${Math.max(value, r.shown) / 100})`;
      const text = `${Math.round(value)}%`;
      if (text !== r.text) {
        r.text = text;
        r.value.textContent = text;
      }
    }

    // Estrés: de verde (tranquilo) a rojo; con mucho estrés el panel brilla al latir.
    const stress = values.estres / 100;
    const hue = Math.round(130 * (1 - stress));
    if (hue !== this._stressHue) {
      this._stressHue = hue;
      this._rows.estres.fill.style.backgroundColor = `hsl(${hue} 72% 52%)`;
    }
    this._rows.estres.icon.style.transform = `scale(${1 + pulse * (0.1 + 0.25 * stress)})`;
    const danger = Math.max(0, Math.min(1, (stress - 0.6) / 0.3));
    this.panel.style.setProperty('--glow', (danger * pulse).toFixed(3));

    const breathState = breathing
      ? 'active'
      : values.estres >= config.stats.respirar.avisoDesde
        ? 'hint'
        : null;
    if (breathState !== this._breathState) {
      this._breathState = breathState;
      this.breath.className = `stats-breath ${breathState ?? ''}`;
      this.breath.querySelector('.breath-text').innerHTML =
        breathState === 'active' ? 'Respirando hondo…' : 'Mantené <kbd>Espacio</kbd> para respirar';
    }
  }

  /** Un stat cambió de golpe: destella su barra y, si el cambio tiene texto, va al listado. */
  pushEvent({ texto, cambios }) {
    for (const key of Object.keys(cambios)) {
      const row = this._rows[key]?.row;
      if (!row) continue;
      row.classList.remove('bump');
      void row.offsetWidth; // reinicia la animación si ya estaba destellando
      row.classList.add('bump');
    }
    const visible = Object.entries(cambios).filter(([, amount]) => Math.round(amount) !== 0);
    if (!texto || visible.length === 0) return;

    const item = document.createElement('div');
    item.className = 'feed-item';
    const text = document.createElement('span');
    text.className = 'feed-text';
    text.textContent = texto;
    item.append(text, ...visible.map(([key, amount]) => createStatChip(key, amount)));
    this.feed.prepend(item);
    while (this.feed.children.length > FEED_MAX) this.feed.lastElementChild.remove();
    setTimeout(() => item.remove(), FEED_LIFE_MS);
  }
}
