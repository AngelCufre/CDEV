import { config } from '../config.js';

/** Envolvente del latido (0..1) a `t` segundos del golpe: "lub" fuerte y "dub" más suave. */
function heartbeatPulse(t) {
  const lub = Math.exp(-t * 14);
  const dub = t >= 0.18 ? 0.7 * Math.exp(-(t - 0.18) * 14) : 0;
  return Math.min(1, lub + dub);
}

/**
 * Lo que se siente del estado del jugador, cada frame: el corazón (late más rápido con
 * el estrés y, pasado el umbral, se escucha), la respiración, el HUD de stats y los
 * efectos de pantalla del post-procesado (estrés, mojado y gotas de las salpicadas).
 */
export function createStressFeedback({ stats, overlay, audio, post }) {
  const { latido } = config.stats;
  let sinceBeat = 0;
  let splash = 0;

  stats.onChange((event) => {
    overlay.stats.pushEvent(event);
    if (event.pantallaMojada) splash = Math.max(splash, event.pantallaMojada);
  });

  return {
    /** `silent`: sin sonidos (por ejemplo, en la pantalla final). */
    update(delta, { breathing = false, silent = false } = {}) {
      const stress = stats.get('estres') / 100;
      const bpm = latido.lpmMin + (latido.lpmMax - latido.lpmMin) * stress;
      sinceBeat += delta;
      if (sinceBeat >= 60 / bpm) {
        sinceBeat = 0;
        const threshold = latido.umbral / 100;
        if (!silent && stress > threshold) {
          const loudness = (stress - threshold) / (1 - threshold);
          audio.playHeartbeatBeat(config.audio.volumenLatido * (0.25 + 0.75 * loudness));
        }
      }
      const pulse = heartbeatPulse(sinceBeat);
      splash = Math.max(0, splash - delta / config.efectos.pantallaMojadaSegundos);

      audio.setBreathing(breathing && !silent);
      post?.setMood({ stress, pulse, wet: stats.get('mojado') / 100, splash });
      overlay.stats.update(delta, stats.values, { pulse, breathing });
    },
  };
}
