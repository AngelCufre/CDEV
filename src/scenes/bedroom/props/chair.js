import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

/** Silla frente al escritorio, con ropa tirada sobre el respaldo (desorden tipo "estudiante"). */
export function buildChair(buckets, obstacles) {
  const { center } = furniture.chair;
  const seatHeight = 0.46;
  const seatSize = 0.4;
  const legSize = 0.04;

  buckets.addBox('woodDark', seatSize, 0.04, seatSize, center.x, seatHeight, center.z);

  const legOffset = seatSize / 2 - legSize / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      buckets.addBox(
        'woodDark',
        legSize,
        seatHeight - 0.02,
        legSize,
        center.x + sx * legOffset,
        (seatHeight - 0.02) / 2,
        center.z + sz * legOffset,
      );
    }
  }

  // Respaldo
  const backHeight = 0.42;
  buckets.addBox(
    'woodDark',
    seatSize,
    backHeight,
    0.04,
    center.x,
    seatHeight + backHeight / 2,
    center.z - seatSize / 2 + 0.02,
  );

  // Ropa colgada del respaldo: un "bulto" con icosaedro deformado para que no se vea
  // como una esfera perfecta, más una manga que cae hacia el asiento.
  buckets.addIcosahedron(
    'fabricClothes',
    0.18,
    2,
    center.x,
    seatHeight + backHeight * 0.75,
    center.z - seatSize / 2 - 0.05,
    { x: 1.3, y: 0.9, z: 0.7 },
  );
  buckets.addBox(
    'fabricClothes',
    0.12,
    0.28,
    0.06,
    center.x + 0.12,
    seatHeight + backHeight * 0.4,
    center.z - seatSize / 2 - 0.02,
    0.15,
  );

  obstacles.push(
    new THREE.Box3(
      new THREE.Vector3(center.x - seatSize / 2 - 0.05, 0, center.z - seatSize / 2 - 0.1),
      new THREE.Vector3(
        center.x + seatSize / 2 + 0.05,
        seatHeight + backHeight,
        center.z + seatSize / 2,
      ),
    ),
  );
}
