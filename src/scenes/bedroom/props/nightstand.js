import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

/** Mesa de luz: un cajón simple de madera clara. Sobre ella se apoyan el despertador y el celular. */
export function buildNightstand(buckets, obstacles) {
  const { center, size, height } = furniture.nightstand;

  buckets.addBox('woodLight', size, height, size, center.x, height / 2, center.z);
  // Tirador del cajón
  buckets.addBox('metal', 0.1, 0.02, 0.02, center.x, height * 0.55, center.z + size / 2 + 0.01);

  obstacles.push(
    new THREE.Box3(
      new THREE.Vector3(center.x - size / 2, 0, center.z - size / 2),
      new THREE.Vector3(center.x + size / 2, height, center.z + size / 2),
    ),
  );

  /** Altura de la superficie superior, para que los props que se apoyan encima la usen. */
  return { topY: height };
}
