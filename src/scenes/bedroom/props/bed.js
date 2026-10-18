import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

/**
 * Cama: estructura de madera + colchón + acolchado revuelto + almohada.
 * Toda geometría estática, se acumula en `buckets` para fusionarse con el resto
 * de los muebles que compartan material (menos draw calls).
 */
export function buildBed(buckets, obstacles) {
  const { center, width, length, frameHeight, mattressHeight } = furniture.bed;
  const headZ = center.z - length / 2; // extremo de la cabecera (contra la pared norte)

  // Marco de madera
  buckets.addBox('woodDark', width, frameHeight, length, center.x, frameHeight / 2, center.z);
  // Cabecera, un poco más alta que el marco
  buckets.addBox(
    'woodDark',
    width,
    frameHeight + 0.35,
    0.06,
    center.x,
    (frameHeight + 0.35) / 2,
    headZ - 0.02,
  );

  // Colchón
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
    { radius: 0.06 },
  );

  // Acolchado/sábana revuelta: dos cajas superpuestas con leve rotación para dar
  // sensación de desorden ("me quedé dormido y no la estiré").
  const blanketY = frameHeight + mattressHeight + 0.06;
  buckets.addBox(
    'fabricClothes',
    width - 0.1,
    0.1,
    length * 0.55,
    center.x + 0.03,
    blanketY,
    center.z + length * 0.12,
    0.03,
    { radius: 0.045 },
  );

  // Almohada en la cabecera
  const pillowY = frameHeight + mattressHeight + 0.07;
  buckets.addBox(
    'pillow',
    width * 0.55,
    0.14,
    0.34,
    center.x - 0.05,
    pillowY,
    headZ + 0.24,
    -0.05,
    {
      radius: 0.065,
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
