import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

/**
 * Silla de madera frente al escritorio: patas torneadas, asiento con bordes
 * redondeados, respaldo de listones y ropa tirada encima (desorden tipo "estudiante").
 */
export function buildChair(buckets, obstacles) {
  const { center } = furniture.chair;
  const seatHeight = 0.46;
  const seatSize = 0.4;
  const backHeight = 0.42;
  const backZ = center.z - seatSize / 2 + 0.03;

  buckets.addBox('woodDark', seatSize, 0.04, seatSize, center.x, seatHeight, center.z, 0, {
    radius: 0.018,
    segments: 3,
  });

  // Patas torneadas (más finas abajo) y travesaños entre ellas.
  const legOffset = seatSize / 2 - 0.035;
  const legHeight = seatHeight - 0.02;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      buckets.addCylinder(
        'woodDark',
        0.02,
        0.016,
        legHeight,
        12,
        center.x + sx * legOffset,
        legHeight / 2,
        center.z + sz * legOffset,
      );
    }
    buckets.addBox(
      'woodDark',
      0.025,
      0.025,
      legOffset * 2,
      center.x + sx * legOffset,
      0.16,
      center.z,
    );
  }

  // Respaldo: dos parantes y tres listones, con el travesaño de arriba más ancho.
  for (const sx of [-1, 1]) {
    buckets.addCylinder(
      'woodDark',
      0.018,
      0.02,
      backHeight,
      12,
      center.x + sx * legOffset,
      seatHeight + backHeight / 2,
      backZ,
    );
  }
  for (const y of [0.11, 0.22, 0.33]) {
    buckets.addBox('woodDark', seatSize - 0.1, 0.055, 0.02, center.x, seatHeight + y, backZ, 0, {
      radius: 0.008,
    });
  }
  buckets.addBox('woodDark', seatSize, 0.05, 0.035, center.x, seatHeight + backHeight, backZ, 0, {
    radius: 0.015,
    segments: 3,
  });

  // Ropa colgada del respaldo: un "bulto" con icosaedro deformado para que no se vea
  // como una esfera perfecta, más una manga que cae hacia el asiento.
  buckets.addIcosahedron(
    'fabricClothes',
    0.18,
    3,
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
    { radius: 0.025, segments: 3 },
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
