import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

/**
 * Cama: estructura de madera con parantes torneados en la cabecera, colchón, un
 * acolchado de tela con pliegues que cuelga por el costado y los pies (como quedó al
 * levantarse apurado) y la almohada. Toda geometría estática, se acumula en `buckets`
 * para fusionarse con el resto de los muebles que compartan material.
 */

// Radio del borde del colchón sobre el que dobla el acolchado antes de caer.
const EDGE_RADIUS = 0.06;

/**
 * Acolchado: un plano subdividido con pliegues (sumas de senos) que, pasado el borde del
 * colchón, dobla sobre un radio y cae vertical. `hang` es lo que cuelga.
 */
function buildBlanketGeometry({ center, width, length, frameHeight, mattressHeight }) {
  const hang = 0.26;
  const coverLength = length * 0.62;
  const w = width - 0.08 + hang;
  const l = coverLength + hang;
  const geo = new THREE.PlaneGeometry(w, l, 44, 60);
  geo.rotateX(-Math.PI / 2); // ahora en XZ, normal +y
  // Lo bastante por encima del colchón para que ningún pliegue lo atraviese.
  const topY = frameHeight + mattressHeight + 0.05;
  // Bordes del colchón en coordenadas locales (el lado libre es +x, los pies +z).
  const edgeX = w / 2 - hang;
  const edgeZ = l / 2 - hang;
  const quarter = (EDGE_RADIUS * Math.PI) / 2;

  const position = geo.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const overX = Math.max(0, x - edgeX);
    const overZ = Math.max(0, z - edgeZ);
    const over = Math.hypot(overX, overZ);
    // Pliegues grandes, arrugas medianas y textura fina; se aplanan donde cuelga.
    const flat = 1 - Math.min(1, over / 0.05);
    let y =
      (0.022 * Math.sin(x * 7.3 + 0.4) * Math.sin(z * 5.1 + 1.3) +
        0.012 * Math.sin(x * 13 + z * 9) +
        0.005 * Math.sin(x * 31 - z * 23)) *
      flat;
    if (over > 0) {
      let horizontal;
      let drop;
      if (over < quarter) {
        const angle = over / EDGE_RADIUS;
        horizontal = EDGE_RADIUS * Math.sin(angle);
        drop = EDGE_RADIUS * (1 - Math.cos(angle));
      } else {
        horizontal = EDGE_RADIUS;
        drop = EDGE_RADIUS + (over - quarter);
      }
      position.setX(i, x - overX + (overX / over) * horizontal);
      position.setZ(i, z - overZ + (overZ / over) * horizontal);
      // La parte colgante ondea apenas.
      y -= drop - 0.006 * Math.sin((x + z) * 25) * Math.min(1, over / 0.1);
    }
    position.setY(i, topY + y);
  }
  geo.computeVertexNormals();
  // Trama de la tela más fina que en una caja (la textura se repite).
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 4);

  const footEdge = center.z + length / 2 - 0.03;
  geo.translate(center.x - width / 2 + 0.04 + w / 2, 0, footEdge - coverLength + l / 2);
  return geo;
}

export function buildBed(buckets, obstacles) {
  const { center, width, length, frameHeight, mattressHeight } = furniture.bed;
  const headZ = center.z - length / 2; // extremo de la cabecera (contra la pared norte)

  // Marco de madera y cabecera, un poco más alta que el marco.
  buckets.addBox('woodDark', width, frameHeight, length, center.x, frameHeight / 2, center.z);
  const headboardHeight = frameHeight + 0.35;
  buckets.addBox(
    'woodDark',
    width,
    headboardHeight,
    0.06,
    center.x,
    headboardHeight / 2,
    headZ - 0.02,
  );
  // Parantes torneados a los lados de la cabecera, con remate redondo.
  const postHeight = headboardHeight + 0.14;
  for (const side of [1, -1]) {
    const x = center.x + side * (width / 2 - 0.035);
    buckets.addCylinder('woodDark', 0.032, 0.036, postHeight, 14, x, postHeight / 2, headZ - 0.02);
    buckets.addIcosahedron('woodDark', 0.045, 2, x, postHeight + 0.02, headZ - 0.02);
  }

  // Colchón, con los bordes bien redondeados.
  const mattressY = frameHeight + mattressHeight / 2;
  buckets.addBox(
    'fabricBed',
    width - 0.06,
    mattressHeight,
    length - 0.06,
    center.x,
    mattressY,
    center.z,
    0,
    { radius: 0.06, segments: 3 },
  );

  // Acolchado revuelto ("me quedé dormido y no lo estiré").
  buckets.addGeometry('fabricClothes', buildBlanketGeometry(furniture.bed));

  // Almohada en la cabecera, un poco corrida.
  const pillowY = frameHeight + mattressHeight + 0.07;
  buckets.addBox(
    'pillow',
    width * 0.55,
    0.14,
    0.34,
    center.x - 0.05,
    pillowY,
    headZ + 0.24,
    -0.08,
    {
      radius: 0.065,
      segments: 4,
    },
  );

  // Obstáculo de colisión: el volumen completo de la cama (footprint horizontal).
  obstacles.push(
    new THREE.Box3(
      new THREE.Vector3(center.x - width / 2, 0, center.z - length / 2),
      new THREE.Vector3(center.x + width / 2, 0.65, center.z + length / 2),
    ),
  );
}
