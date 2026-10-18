import * as THREE from 'three';
import { paint, box, roundedBox, taperTop, mergeParts } from './lowPoly.js';
import { createGlowMaterial, addGlow } from './glow.js';

/**
 * Vehículos low-poly compartidos entre escenas. Miran a +x en coordenadas locales,
 * con el origen a nivel del piso y centrado.
 */

export const CAR_COLORS = [0x8e1b1b, 0x1f3f66, 0xb9b9b4, 0x2b2b2e, 0x3f5e3a, 0xc2a14a, 0x6b6f75];

/**
 * Luces de los vehículos, compartidas por todos: conos de luz de los faros y halos de
 * faros y luces traseras (que el piso mojado refleja).
 */
export function createBeamResources() {
  const geometry = new THREE.ConeGeometry(1.1, 7, 16, 1, true);
  // Rotado para que el vértice quede atrás (en el faro) y la base hacia +x.
  geometry.rotateZ(Math.PI / 2);
  geometry.translate(3.5, 0, 0);
  const material = new THREE.MeshBasicMaterial({
    color: 0xfff1c9,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return {
    geometry,
    material,
    headGlow: createGlowMaterial(0xfff1d0, 0.85),
    tailGlow: createGlowMaterial(0xff3a2a, 0.55),
  };
}

/** Conos de luz y halos de los faros delanteros (en x), a la altura `y`. */
export function addBeams(object, beams, x, y, zs, glowSize = 0.9) {
  for (const z of zs) {
    const beam = new THREE.Mesh(beams.geometry, beams.material);
    beam.position.set(x, y, z);
    beam.renderOrder = 1;
    object.add(beam);
    addGlow(object, beams.headGlow, x + 0.05, y, z, glowSize);
  }
}

/** Halos rojos de las luces traseras. */
export function addTailGlows(object, beams, x, y, zs, size = 0.5) {
  for (const z of zs) addGlow(object, beams.tailGlow, x - 0.05, y, z, size);
}

/** Ruedas con su taza (más clara, hacia afuera). */
export function addWheels(parts, radius, width, xs, halfTrack) {
  for (const x of xs) {
    for (const side of [1, -1]) {
      const wheel = new THREE.CylinderGeometry(radius, radius, width, 24);
      wheel.rotateX(Math.PI / 2);
      wheel.translate(x, radius, side * halfTrack);
      parts.push(paint(wheel, 0x17191c));
      const hub = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.01, 16);
      hub.rotateX(Math.PI / 2);
      hub.translate(x, radius, side * halfTrack);
      parts.push(paint(hub, 0x7d8186));
    }
  }
}

export function buildCar(color, bodyMaterial, beams) {
  const parts = [];
  parts.push(paint(roundedBox(4.2, 0.62, 1.78, 0, 0.55, 0, 0.14), color));
  // Cabina (vidrios) más angosta arriba: parabrisas y luneta inclinados.
  const cabin = taperTop(roundedBox(2.3, 0.56, 1.6, -0.25, 1.14, 0, 0.12), 0.9, 0.78, 0.9);
  parts.push(paint(cabin, 0x2b333b));
  parts.push(paint(roundedBox(1.72, 0.06, 1.46, -0.3, 1.43, 0, 0.03), color)); // techo
  addWheels(parts, 0.32, 0.24, [1.35, -1.35], 0.82);
  for (const z of [0.58, -0.58]) {
    parts.push(paint(box(0.04, 0.13, 0.32, 2.11, 0.64, z), 0xfff4d6, { shaded: false }));
    parts.push(paint(box(0.04, 0.12, 0.3, -2.11, 0.66, z * 1.03), 0xd8261e, { shaded: false }));
  }

  const car = new THREE.Group();
  car.name = 'car';
  car.add(mergeParts(parts, 'car-body', bodyMaterial));
  addBeams(car, beams, 2.13, 0.64, [0.58, -0.58]);
  addTailGlows(car, beams, -2.13, 0.66, [0.6, -0.6]);
  return car;
}
