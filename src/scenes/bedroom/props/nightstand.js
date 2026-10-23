import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

/**
 * Mesa de luz de madera clara sobre cuatro patas, con el frente del cajón y su tirador,
 * y un velador (apagado) en el rincón de atrás. Sobre ella se apoyan el despertador y
 * el celular.
 */
export function buildNightstand(buckets, obstacles) {
  const { center, size, height } = furniture.nightstand;
  const legHeight = 0.08;
  const bodyHeight = height - legHeight;

  buckets.addBox(
    'woodLight',
    size,
    bodyHeight,
    size,
    center.x,
    legHeight + bodyHeight / 2,
    center.z,
  );
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      buckets.addCylinder(
        'woodLight',
        0.018,
        0.022,
        legHeight,
        12,
        center.x + sx * (size / 2 - 0.045),
        legHeight / 2,
        center.z + sz * (size / 2 - 0.045),
      );
    }
  }
  // Frente del cajón apenas sobresalido (el frente mira a +z) y tirador redondo.
  const drawerY = height * 0.66;
  buckets.addBox(
    'woodLight',
    size - 0.06,
    0.15,
    0.016,
    center.x,
    drawerY,
    center.z + size / 2 + 0.008,
  );
  buckets.addIcosahedron('metal', 0.014, 2, center.x, drawerY, center.z + size / 2 + 0.028);

  // Velador: base, columna y pantalla.
  const lampX = center.x + 0.11;
  const lampZ = center.z - 0.11;
  buckets.addCylinder('metal', 0.055, 0.06, 0.015, 20, lampX, height + 0.0075, lampZ);
  buckets.addCylinder('metal', 0.008, 0.008, 0.2, 10, lampX, height + 0.015 + 0.1, lampZ);
  buckets.addCylinder('shade', 0.06, 0.1, 0.13, 24, lampX, height + 0.215 + 0.065, lampZ);

  obstacles.push(
    new THREE.Box3(
      new THREE.Vector3(center.x - size / 2, 0, center.z - size / 2),
      new THREE.Vector3(center.x + size / 2, height, center.z + size / 2),
    ),
  );

  /** Altura de la superficie superior, para que los props que se apoyan encima la usen. */
  return { topY: height };
}
