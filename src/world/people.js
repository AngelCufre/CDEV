import * as THREE from 'three';
import { paint, roundedBox } from './lowPoly.js';

/**
 * Personas low-poly (piezas con bordes redondeados + cabeza esférica) para fusionar con
 * `mergeParts`.
 * En coordenadas locales miran a +x, con los pies en y = 0; `yaw` las gira.
 */

const JACKETS = [0x2d3e50, 0x5b2c2c, 0x3d3d3d, 0x1f3a2e, 0x6b5b3e, 0x2c2c54, 0x7a7a7a, 0x4a3b5c];
const PANTS = [0x1c2533, 0x2b2b2b, 0x3e3a33, 0x23303f];
const SKINS = [0xe0b48f, 0xc68c64, 0x8d5a3b, 0xf1c9a5, 0xa8714b];
const HAIR = [0x2a1d14, 0x5a3b22, 0x111111, 0x8c6a3f, 0x3b2a20];
const BACKPACKS = [0x1b1b1b, 0x8a2b2b, 0x2b4a7a, 0x3d5a3a];

/** Ropa, piel y accesorios al azar (con un generador con semilla, para que se repita). */
export function randomPersonStyle(random) {
  const pick = (list) => list[Math.floor(random() * list.length)];
  return {
    jacket: pick(JACKETS),
    pants: pick(PANTS),
    skin: pick(SKINS),
    hair: pick(HAIR),
    backpack: random() < 0.4 ? pick(BACKPACKS) : null,
    height: 1.6 + random() * 0.25,
  };
}

const SHOES = 0x1b1c1f;

const _matrix = new THREE.Matrix4();
const _rotation = new THREE.Matrix4();

function placePart(parts, geometry, color, x, y, z, transform) {
  geometry.translate(x, y, z);
  geometry.applyMatrix4(transform);
  parts.push(paint(geometry, color));
}

/** Pieza del cuerpo con bordes redondeados, centrada en el origen. */
function piece(w, h, d, radius, segments = 1) {
  return roundedBox(w, h, d, 0, 0, 0, radius, segments);
}

function makeTransform({ x, z, yaw = 0, groundY = 0, scale = 1 }) {
  _rotation.makeRotationY(yaw);
  _matrix.makeScale(scale, scale, scale).premultiply(_rotation);
  _matrix.setPosition(x, groundY, z);
  return _matrix.clone();
}

function addHead(parts, style, y, transform) {
  placePart(parts, new THREE.IcosahedronGeometry(0.11, 3), style.skin, 0, y, 0, transform);
  const hair = new THREE.SphereGeometry(0.115, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  placePart(parts, hair, style.hair, -0.01, y + 0.02, 0, transform);
}

function addHand(parts, style, x, y, z, transform) {
  placePart(parts, new THREE.IcosahedronGeometry(0.045, 1), style.skin, x, y, z, transform);
}

/** Pasajero parado. `armUp` lo pone agarrado del pasamanos de arriba. */
export function addStandingPerson(parts, { x, z, yaw = 0, groundY = 0, style, armUp = false }) {
  const transform = makeTransform({ x, z, yaw, groundY, scale: style.height / 1.7 });
  for (const side of [1, -1]) {
    placePart(parts, piece(0.27, 0.08, 0.13, 0.035), SHOES, 0.04, 0.04, side * 0.085, transform);
    placePart(
      parts,
      piece(0.17, 0.74, 0.15, 0.06, 2),
      style.pants,
      0,
      0.45,
      side * 0.085,
      transform,
    );
  }
  placePart(parts, piece(0.28, 0.62, 0.44, 0.09, 2), style.jacket, 0, 1.1, 0, transform);
  addHead(parts, style, 1.53, transform);

  // Brazo izquierdo colgando; el derecho colgando o arriba, agarrado del caño.
  placePart(parts, piece(0.1, 0.55, 0.1, 0.045), style.jacket, 0, 1.06, -0.27, transform);
  addHand(parts, style, 0, 0.765, -0.27, transform);
  if (armUp) {
    placePart(parts, piece(0.09, 0.62, 0.09, 0.04), style.jacket, 0, 1.68, 0.2, transform);
    addHand(parts, style, 0, 2.0, 0.2, transform);
  } else {
    placePart(parts, piece(0.1, 0.55, 0.1, 0.045), style.jacket, 0, 1.06, 0.27, transform);
    addHand(parts, style, 0, 0.765, 0.27, transform);
  }

  if (style.backpack !== null) {
    placePart(parts, piece(0.18, 0.42, 0.34, 0.06, 2), style.backpack, -0.23, 1.12, 0, transform);
  }
}

/** Pasajero sentado (el asiento queda debajo, en y ≈ 0.5). */
export function addSeatedPerson(parts, { x, z, yaw = 0, groundY = 0, style }) {
  const transform = makeTransform({ x, z, yaw, groundY, scale: style.height / 1.7 });
  for (const side of [1, -1]) {
    const legZ = side * 0.085;
    placePart(parts, piece(0.42, 0.16, 0.15, 0.06, 2), style.pants, 0.12, 0.57, legZ, transform); // muslo
    placePart(parts, piece(0.14, 0.42, 0.14, 0.05), style.pants, 0.36, 0.29, legZ, transform); // pierna
    placePart(parts, piece(0.25, 0.08, 0.13, 0.035), SHOES, 0.4, 0.04, legZ, transform);
  }
  placePart(parts, piece(0.26, 0.58, 0.42, 0.09, 2), style.jacket, -0.05, 0.94, 0, transform);
  addHead(parts, style, 1.35, transform);
  for (const side of [1, -1]) {
    placePart(parts, piece(0.3, 0.1, 0.1, 0.045), style.jacket, 0.08, 0.72, side * 0.24, transform);
    addHand(parts, style, 0.24, 0.71, side * 0.235, transform);
  }
}
