import { config } from '../config.js';

/**
 * Respirar hondo: mientras el jugador mantiene Espacio sin caminar (y tiene el control,
 * no en una animación), el estrés baja de a poco hasta un piso. El reloj del juego sigue
 * corriendo: ese es el costo. `canBreathe()` dice si el jugador está en condiciones
 * (por defecto, cuando controla la mirada).
 */
export function createBreathing({ input, stats, canBreathe = () => input.isLookEnabled }) {
  let active = false;

  return {
    get active() {
      return active;
    },
    update(delta) {
      const m = input.move;
      const walking = m.forward || m.back || m.left || m.right;
      active = input.isHeld('Space') && canBreathe() && !walking;
      if (!active) return;
      const { porSegundo, piso } = config.stats.respirar;
      const excess = stats.get('estres') - piso;
      if (excess > 0) stats.drift('estres', -Math.min(porSegundo, excess / delta), delta);
    },
  };
}
