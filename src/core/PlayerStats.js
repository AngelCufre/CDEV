import { config } from '../config.js';
import { parseTime, formatTime } from '../systems/PhoneClock.js';

export const STAT_KEYS = ['estres', 'mojado', 'preparacion'];

const clampStat = (value) => Math.max(0, Math.min(100, value));

/** La primera frase de la lista cuyo `desde` alcanza el valor (las listas van de mayor a menor). */
export function pickByThreshold(list, value) {
  return (list.find((entry) => value >= entry.desde) ?? list[list.length - 1]).texto;
}

/**
 * Stats del jugador a lo largo del día (de 0 a 100): estrés, qué tan mojado está y cuánto
 * repasó. Sobreviven a los cambios de escena. Las narrativas los modifican con eventos
 * (`trigger`, definidos en config.stats.eventos) o con cambios continuos (`drift`); el HUD
 * se entera de los eventos suscribiéndose con `onChange` (Observer).
 */
export class PlayerStats {
  constructor() {
    this._listeners = [];
    this.sceneLabel = null;
    this.values = {};
    this.reset();
  }

  /**
   * Vuelve a los valores iniciales (al empezar el día). Modifica el mismo objeto `values`
   * (no lo reemplaza): el panel de debug queda enganchado a él.
   */
  reset() {
    Object.assign(this.values, config.stats.inicial);
    this.log = []; // [{ escena, texto, cambios: { estres: 10, ... } }]
    this._sceneStart = { ...this.values };
    this._triggered = new Set();
  }

  get(key) {
    return this.values[key];
  }

  /** Empieza una escena: desde acá se cuentan los cambios que resume el fundido. */
  beginScene(name) {
    this.sceneLabel = config.stats.nombresEscenas[name] ?? name;
    this._sceneStart = { ...this.values };
  }

  /** Cuánto cambió cada stat en la escena actual (solo los que cambiaron). */
  sceneDeltas() {
    return STAT_KEYS.map((key) => ({
      key,
      delta: Math.round(this.values[key] - this._sceneStart[key]),
    })).filter((entry) => entry.delta !== 0);
  }

  onChange(callback) {
    this._listeners.push(callback);
    return () => {
      const index = this._listeners.indexOf(callback);
      if (index !== -1) this._listeners.splice(index, 1);
    };
  }

  /**
   * Suma (o resta) de golpe a uno o varios stats: `changes` = { estres: 5, mojado: -2 }.
   * Con `texto` queda en el registro del día y el HUD lo muestra. Devuelve lo que
   * realmente cambió (los stats no pasan de 0 ni de 100).
   */
  add(changes, texto = null, extra = {}) {
    const cambios = {};
    for (const key of STAT_KEYS) {
      const amount = changes[key];
      if (!amount) continue;
      const before = this.values[key];
      this.values[key] = clampStat(before + amount);
      if (this.values[key] !== before) cambios[key] = this.values[key] - before;
    }
    if (Object.keys(cambios).length === 0) return cambios;
    if (texto) this.log.push({ escena: this.sceneLabel, texto, cambios });
    for (const callback of this._listeners) callback({ texto, cambios, ...extra });
    return cambios;
  }

  /** Dispara un evento de config.stats.eventos. Con `once`, solo la primera vez en el día. */
  trigger(name, { once = false } = {}) {
    const event = config.stats.eventos[name];
    if (!event) throw new Error(`Evento de stats desconocido: "${name}"`);
    if (once) {
      if (this._triggered.has(name)) return null;
      this._triggered.add(name);
    }
    const { texto, pantallaMojada = 0, ...changes } = event;
    return this.add(changes, texto, { pantallaMojada });
  }

  /** Mensaje nuevo en el celular: suma estrés según quién lo manda. */
  message(sender) {
    const amounts = config.stats.mensajes;
    return this.add({ estres: amounts[sender] ?? amounts.otro }, `Mensaje de ${sender}`);
  }

  /** Cambio continuo y silencioso (por segundo): la lluvia, el secado, respirar hondo. */
  drift(key, perSecond, delta) {
    if (perSecond === 0) return;
    this.values[key] = clampStat(this.values[key] + perSecond * delta);
  }

  /**
   * Nervios por la hora: suma estrés cada segundo, más rápido cuanto más tarde es.
   * `clockMinutes` es la hora del juego (null si la escena no tiene reloj).
   */
  addLatenessStress(clockMinutes, delta, extraPerSecond = 0) {
    const { estresPorSegundo, minutosParaDuplicar } = config.stats.atraso;
    const late =
      clockMinutes === null
        ? 0
        : Math.max(0, clockMinutes - parseTime(config.narrative.horaParcial));
    const factor = 1 + Math.min(late, 20) / minutosParaDuplicar;
    this.drift('estres', estresPorSegundo * factor + extraPerSecond, delta);
  }

  /** Lo que muestra la pantalla final: hora de llegada, stats, veredicto y momentos. */
  summary({ arrivalMinutes }) {
    const { estres, mojado, preparacion } = this.values;
    const { evaluacion, veredictos } = config.stats;
    const late = Math.max(0, Math.floor(arrivalMinutes) - parseTime(config.narrative.horaParcial));

    const chance =
      preparacion * evaluacion.pesoPreparacion +
      (100 - estres) * evaluacion.pesoCalma +
      (100 - mojado) * evaluacion.pesoSeco -
      Math.max(0, late - evaluacion.toleranciaMinutos) * evaluacion.penalidadPorMinuto;

    // Los eventos que más movieron los stats, en el orden en que pasaron.
    const magnitude = (entry) =>
      Object.values(entry.cambios).reduce((sum, amount) => sum + Math.abs(amount), 0);
    const moments = this.log
      .map((entry, index) => ({ ...entry, index }))
      .sort((a, b) => magnitude(b) - magnitude(a))
      .slice(0, evaluacion.momentos)
      .sort((a, b) => a.index - b.index);

    return {
      arrival: formatTime(arrivalMinutes),
      late,
      values: { ...this.values },
      chance: Math.round(Math.max(1, Math.min(99, chance))),
      verdict: `${pickByThreshold(veredictos.estres, estres)}, ${pickByThreshold(
        veredictos.mojado,
        mojado,
      )}. ${pickByThreshold(veredictos.preparacion, preparacion)}`,
      moments,
    };
  }
}
