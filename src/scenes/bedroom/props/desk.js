import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

/**
 * Escritorio con notebook cerrada encima. Los apuntes van aparte (props/notes.js)
 * porque cada hoja lleva su propia textura y no se puede fusionar con el resto.
 * (La notebook es decorativa en esta iteración — no forma parte de los interactuables.)
 */
export function buildDesk(buckets, obstacles) {
  const { center, width, depth, height } = furniture.desk;
  const topThickness = 0.04;

  // Tabla
  buckets.addBox('woodLight', width, topThickness, depth, center.x, height, center.z);

  // Patas
  const legSize = 0.05;
  const legHeight = height - topThickness;
  const legOffsetX = width / 2 - legSize;
  const legOffsetZ = depth / 2 - legSize;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      buckets.addBox(
        'woodLight',
        legSize,
        legHeight,
        legSize,
        center.x + sx * legOffsetX,
        legHeight / 2,
        center.z + sz * legOffsetZ,
      );
    }
  }

  // Notebook cerrada (base + tapa, ambas con screenOff para simular la carcasa oscura)
  const notebookY = height + topThickness / 2;
  buckets.addBox('screenOff', 0.32, 0.02, 0.24, center.x + 0.15, notebookY + 0.01, center.z - 0.05);
  buckets.addBox(
    'screenOff',
    0.32,
    0.22,
    0.015,
    center.x + 0.15,
    notebookY + 0.12,
    center.z - 0.05 - 0.115,
    0,
  );

  // Lapicera (apoyada, como una birome tirada sobre el escritorio)
  buckets.addBox(
    'metal',
    0.012,
    0.012,
    0.15,
    center.x - 0.35,
    notebookY + 0.006,
    center.z - 0.02,
    0.4,
  );

  obstacles.push(
    new THREE.Box3(
      new THREE.Vector3(center.x - width / 2, 0, center.z - depth / 2),
      new THREE.Vector3(center.x + width / 2, height, center.z + depth / 2),
    ),
  );

  return { topY: notebookY };
}
