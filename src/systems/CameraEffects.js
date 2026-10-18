import * as THREE from 'three';
import { config } from '../config.js';

/** Ruido suave para el temblor: senos con frecuencias que casi nunca coinciden. */
function wobble(t, seed) {
  return (
    Math.sin(t * 11.3 + seed) * 0.5 +
    Math.sin(t * 6.7 + seed * 2.1) * 0.3 +
    Math.sin(t * 19.1 + seed * 3.7) * 0.2
  );
}

/**
 * Efectos de cámara que existen solo mientras se dibuja el frame: el balanceo al caminar
 * y un temblor de la mirada que crece con el estrés. `apply` los suma justo antes del
 * render y `restore` deja la cámara como estaba, así no se acumulan ni afectan a la
 * narrativa, las colisiones o el raycast de interacción.
 */
export function createCameraEffects({ camera, input, stats }) {
  const savedPosition = new THREE.Vector3();
  const savedQuaternion = new THREE.Quaternion();
  const lastPosition = new THREE.Vector3();
  const side = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const offset = new THREE.Quaternion();
  let hasLast = false;
  let time = 0;
  let stepPhase = 0; // avanza π por paso
  let walkAmount = 0; // 0..1, suavizado para que el balanceo entre y salga sin saltos

  return {
    apply(delta) {
      const { balanceoPaso: bob, temblorEstres } = config.efectos;
      time += delta;

      // Camina si hay teclas apretadas y la cámara realmente se movió (no cuenta una
      // animación de la narrativa ni el salto de posición al cambiar de escena).
      const moved = hasLast
        ? Math.hypot(camera.position.x - lastPosition.x, camera.position.z - lastPosition.z)
        : 0;
      lastPosition.copy(camera.position);
      hasLast = true;
      const m = input.move;
      const walking = (m.forward || m.back || m.left || m.right) && moved > 1e-4 && moved < 0.5;
      if (walking) stepPhase += (moved / bob.largoPaso) * Math.PI;
      walkAmount += ((walking ? 1 : 0) - walkAmount) * (1 - Math.exp(-delta * 8));

      savedPosition.copy(camera.position);
      savedQuaternion.copy(camera.quaternion);

      if (walkAmount > 0.001) {
        camera.getWorldDirection(side);
        side.set(-side.z, 0, side.x).normalize();
        camera.position.y += Math.sin(stepPhase * 2) * bob.altura * walkAmount;
        camera.position.addScaledVector(side, Math.sin(stepPhase) * bob.lateral * walkAmount);
      }

      const stress = stats.get('estres') / 100;
      const shake = temblorEstres * stress * stress;
      euler.set(
        wobble(time, 1.3) * shake,
        wobble(time, 4.1) * shake,
        wobble(time, 7.9) * shake * 0.5 + Math.sin(stepPhase) * bob.rolido * walkAmount,
      );
      offset.setFromEuler(euler);
      camera.quaternion.multiply(offset);
    },

    restore() {
      camera.position.copy(savedPosition);
      camera.quaternion.copy(savedQuaternion);
    },
  };
}
