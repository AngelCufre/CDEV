import * as THREE from 'three';
import { config } from '../config.js';

/**
 * Caminar en primera persona con WASD/flechas, relativo a hacia dónde mira la cámara
 * y resuelto contra las colisiones de la escena. Compartido por todas las escenas.
 * `update` devuelve la distancia horizontal recorrida en ese frame.
 */
export function createPlayerMovement({ camera, input, collision }) {
  // Reutilizados en cada frame para no asignar memoria en el loop.
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  function update(delta) {
    const move = input.move;
    if (!(move.forward || move.back || move.left || move.right)) return 0;

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.set(-forward.z, 0, forward.x); // perpendicular en el plano XZ (forward × up)

    let dx = 0;
    let dz = 0;
    const step = config.player.velocidadCaminar * delta;
    if (move.forward) {
      dx += forward.x * step;
      dz += forward.z * step;
    }
    if (move.back) {
      dx -= forward.x * step;
      dz -= forward.z * step;
    }
    if (move.right) {
      dx += right.x * step;
      dz += right.z * step;
    }
    if (move.left) {
      dx -= right.x * step;
      dz -= right.z * step;
    }

    const startX = camera.position.x;
    const startZ = camera.position.z;
    collision.resolve(camera.position, dx, dz);
    return Math.hypot(camera.position.x - startX, camera.position.z - startZ);
  }

  return { update };
}
