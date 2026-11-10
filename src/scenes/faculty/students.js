import * as THREE from 'three';
import { mergeParts, paint, seededRandom } from '../../world/lowPoly.js';
import { addStandingPerson, randomPersonStyle } from '../../world/people.js';
import { STORY_HEIGHT, students } from './layout.js';

// Medio lado de la caja de colisión de cada estudiante.
const PERSON_HALF = 0.2;

/** La misma superficie vista del otro lado: invierte el orden de los vértices y las normales. */
function flipped(geometry) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  geo.deleteAttribute('uv');
  const position = geo.attributes.position;
  const normal = geo.attributes.normal;
  for (let i = 0; i < position.count; i += 3) {
    for (const attr of [position, normal]) {
      const x = attr.getX(i + 1);
      const y = attr.getY(i + 1);
      const z = attr.getZ(i + 1);
      attr.setXYZ(i + 1, attr.getX(i + 2), attr.getY(i + 2), attr.getZ(i + 2));
      attr.setXYZ(i + 2, x, y, z);
    }
  }
  for (let i = 0; i < normal.count; i += 1) {
    normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
  }
  return geo;
}

/** Paraguas abierto sobre la cabeza de alguien parado en (x, z). */
function addUmbrella(parts, { x, z, groundY, color }) {
  const stick = new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6);
  stick.translate(x, groundY + 1.55, z);
  parts.push(paint(stick, 0x2b2b2b));
  // Cono abierto: la tela se ve de arriba y, del otro lado, desde abajo.
  const canopy = new THREE.ConeGeometry(0.55, 0.28, 8, 1, true);
  canopy.translate(x, groundY + 2.08, z);
  parts.push(paint(flipped(canopy), color));
  parts.push(paint(canopy, color));
}

/**
 * Estudiantes quietos en el campus y en el pasillo del 1° piso: un solo mesh y sus
 * colisiones por nivel. Algunos de los de afuera llevan paraguas.
 */
export function buildStudents() {
  const random = seededRandom(500);
  const parts = [];
  const obstacles = [[], []];
  for (const { floor, x, z, yaw, umbrella } of students) {
    const groundY = floor * STORY_HEIGHT;
    addStandingPerson(parts, { x, z, yaw, groundY, style: randomPersonStyle(random) });
    if (umbrella !== undefined) addUmbrella(parts, { x, z, groundY, color: umbrella });
    obstacles[floor].push(
      new THREE.Box3(
        new THREE.Vector3(x - PERSON_HALF, 0, z - PERSON_HALF),
        new THREE.Vector3(x + PERSON_HALF, 2, z + PERSON_HALF),
      ),
    );
  }
  const mesh = mergeParts(parts, 'students');
  return { mesh, obstacles };
}
