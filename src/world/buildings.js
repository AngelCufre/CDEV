import * as THREE from 'three';
import { paint, box, facadePlane } from './lowPoly.js';

const FLOOR_HEIGHT = 2.8;

/**
 * Casa con techo a cuatro aguas y ventanas en la fachada (algunas encendidas, porque
 * afuera está oscuro). `facing = 1` la fachada mira a +z; `facing = -1`, a -z.
 * `frontZ` es la z de la fachada: el cuerpo se extiende hacia atrás desde ahí.
 */
export function addHouse(
  parts,
  { x, frontZ, width, floors, color, facing = 1, depth = 6, groundY = 0, random, litChance = 0.3 },
) {
  const height = floors * FLOOR_HEIGHT + 0.3;
  const centerZ = frontZ - (facing * depth) / 2;
  parts.push(paint(box(width, height, depth, x, groundY + height / 2, centerZ), color));

  // Techo: cono de 4 lados girado 45° (base cuadrada de lado √2), escalado para
  // cubrir la planta con un poco de alero.
  const roofHeight = 1.4;
  const roof = new THREE.ConeGeometry(1, 1, 4);
  roof.rotateY(Math.PI / 4);
  roof.scale((width * 1.1) / Math.SQRT2, roofHeight, (depth * 1.1) / Math.SQRT2);
  roof.translate(x, groundY + height + roofHeight / 2, centerZ);
  parts.push(paint(roof, 0x3f464d));

  const windowZ = frontZ + facing * 0.01;
  for (let floor = 0; floor < floors; floor += 1) {
    const y = groundY + floor * FLOOR_HEIGHT + 1.5;
    for (const col of [-1, 0, 1]) {
      const wx = x + (col * width) / 3;
      if (floor === 0 && col === 0) {
        parts.push(paint(facadePlane(0.9, 1.9, wx, groundY + 0.95, windowZ, facing), 0x3b2f28));
        continue;
      }
      const lit = random() < litChance;
      parts.push(
        paint(facadePlane(0.8, 1.0, wx, y, windowZ, facing), lit ? 0xf3c77a : 0x2f353c, {
          shaded: !lit,
        }),
      );
    }
  }
}

/** Árbol low-poly: pino (cono) o redondo (icosaedro facetado). */
export function addTree(parts, { x, z, type, scale, groundY = 0 }) {
  const s = scale;
  const trunkHeight = 1.4 * s;
  const trunk = new THREE.CylinderGeometry(0.12 * s, 0.16 * s, trunkHeight, 6);
  trunk.translate(x, groundY + trunkHeight / 2, z);
  parts.push(paint(trunk, 0x3d3128));

  let foliage;
  if (type === 'pine') {
    foliage = new THREE.ConeGeometry(1.1 * s, 2.8 * s, 7);
    foliage.translate(x, groundY + trunkHeight + 1.2 * s, z);
  } else {
    foliage = new THREE.IcosahedronGeometry(1.3 * s, 0);
    foliage.scale(1, 0.9, 1);
    foliage.translate(x, groundY + trunkHeight + 0.9 * s, z);
  }
  parts.push(paint(foliage, type === 'pine' ? 0x2f4a2c : 0x3b5233));
}

/** Farol de calle con la lámpara prendida. El brazo apunta hacia `armDirZ` (±1). */
export function addLampPost(parts, { x, z, groundY = 0, armDirZ = -1 }) {
  const post = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6);
  post.translate(x, groundY + 2.1, z);
  parts.push(paint(post, 0x2c3035));
  parts.push(paint(box(0.06, 0.06, 0.9, x, groundY + 4.15, z + armDirZ * 0.42), 0x2c3035));
  parts.push(
    paint(box(0.3, 0.1, 0.22, x, groundY + 4.08, z + armDirZ * 0.85), 0xffe3a8, {
      shaded: false,
    }),
  );
}

/** Cerco de madera mojada a lo largo del eje X, de `fromX` a `toX`. */
export function addFence(parts, { fromX, toX, z, groundY = 0, railOffsetZ = 0.06 }) {
  const color = 0x4e4036;
  for (let x = fromX; x <= toX + 0.001; x += 1.5) {
    parts.push(paint(box(0.08, 1.0, 0.08, x, groundY + 0.5, z), color));
  }
  const length = toX - fromX;
  for (const y of [0.35, 0.75]) {
    parts.push(
      paint(box(length, 0.07, 0.04, (fromX + toX) / 2, groundY + y, z + railOffsetZ), color),
    );
  }
}
