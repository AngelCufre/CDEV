import * as THREE from 'three';
import { mergeParts, seededRandom } from '../../world/lowPoly.js';
import { addStandingPerson, randomPersonStyle } from '../../world/people.js';
import { STORY_HEIGHT, students } from './layout.js';

// Medio lado de la caja de colisión de cada estudiante.
const PERSON_HALF = 0.2;

/** Estudiantes quietos en el hall y los pasillos: un solo mesh y sus colisiones por planta. */
export function buildStudents() {
  const random = seededRandom(500);
  const parts = [];
  const obstacles = [[], []];
  for (const { floor, x, z, yaw } of students) {
    addStandingPerson(parts, {
      x,
      z,
      yaw,
      groundY: floor * STORY_HEIGHT,
      style: randomPersonStyle(random),
    });
    obstacles[floor].push(
      new THREE.Box3(
        new THREE.Vector3(x - PERSON_HALF, 0, z - PERSON_HALF),
        new THREE.Vector3(x + PERSON_HALF, 2, z + PERSON_HALF),
      ),
    );
  }
  const mesh = mergeParts(
    parts,
    'students',
    new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
  );
  return { mesh, obstacles };
}
