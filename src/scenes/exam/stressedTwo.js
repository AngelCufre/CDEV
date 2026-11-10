import * as THREE from 'three';
import { paint, roundedBox, mergeParts } from '../../world/lowPoly.js';

const BODY = 0xd9453a;
const LIMB = 0x8f2a24;
const SCALE = 0.62;
const STEP_RATE = 15; // rad/s de la fase de carrera: pasos rapidísimos
const AISLES_X = [-2.5, 0, 2.5];
const AISLES_Z = [-3.0, 0, 3.7];

/** Un "2" gordito con cara asustada, patitas y bracitos. Mira hacia +z en coordenadas locales. */
function buildModel() {
  const root = new THREE.Group();
  root.name = 'stressed-two';
  const body = new THREE.Group();
  root.add(body);

  // El trazo del 2: la panza de arriba, la diagonal y la base.
  const curve = new THREE.CatmullRomCurve3(
    [
      [-0.22, 1.5],
      [-0.12, 1.7],
      [0.1, 1.76],
      [0.26, 1.62],
      [0.22, 1.42],
      [-0.26, 0.98],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
  );
  const parts = [paint(new THREE.TubeGeometry(curve, 20, 0.09, 8, false), BODY)];
  parts.push(paint(roundedBox(0.6, 0.17, 0.18, 0, 0.93, 0, 0.06), BODY));

  // Cara: ojos bien abiertos, pupilas chiquitas y cejas de pánico.
  for (const side of [-1, 1]) {
    const eye = new THREE.SphereGeometry(0.05, 10, 8);
    eye.translate(side * 0.065 + 0.02, 1.64, 0.08);
    parts.push(paint(eye, 0xffffff, { shaded: false }));
    const pupil = new THREE.SphereGeometry(0.02, 8, 6);
    pupil.translate(side * 0.065 + 0.02, 1.64, 0.125);
    parts.push(paint(pupil, 0x111111, { shaded: false }));
    const brow = roundedBox(0.075, 0.016, 0.02, side * 0.07 + 0.02, 1.72, 0.1, 0.006, 1);
    brow.rotateZ(side * 0.45);
    parts.push(paint(brow, 0x111111, { shaded: false }));
  }
  const mouth = roundedBox(0.09, 0.05, 0.02, 0.02, 1.54, 0.09, 0.015, 1);
  parts.push(paint(mouth, 0x3a0d0d, { shaded: false }));
  body.add(mergeParts(parts, 'stressed-two-body'));

  const limbMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const limb = (x, y, length, radius, name) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const cylinder = new THREE.CylinderGeometry(radius, radius * 0.85, length, 8);
    cylinder.translate(0, -length / 2, 0);
    const end = new THREE.SphereGeometry(radius * 1.5, 8, 6);
    end.translate(0, -length, 0);
    pivot.add(mergeParts([paint(cylinder, LIMB), paint(end, LIMB)], name, limbMaterial));
    return pivot;
  };
  const legs = [-1, 1].map((side) => limb(side * 0.15, 0.88, 0.8, 0.034, 'stressed-two-leg'));
  const arms = [-1, 1].map((side) => limb(side * 0.2 - 0.04, 1.22, 0.5, 0.028, 'stressed-two-arm'));
  for (const pivot of [...legs, ...arms]) body.add(pivot);

  root.scale.setScalar(0);
  return { root, body, legs, arms };
}

/**
 * Un número 2 con patas y bracitos, la encarnación del estrés: cuando el estrés pasa el
 * umbral aparece y corre en pánico por los pasillos del aula, doblando en cada cruce al
 * azar. Cuando baja del umbral (menos un margen) se achica hasta desaparecer.
 */
export function createStressedTwo({ speed, threshold }) {
  const model = buildModel();
  const nodes = [];
  for (const x of AISLES_X) for (const z of AISLES_Z) nodes.push(new THREE.Vector2(x, z));
  const neighbours = nodes.map((node) =>
    nodes.flatMap((other, j) =>
      other !== node && (other.x === node.x) !== (other.y === node.y) &&
      Math.abs(other.x - node.x) + Math.abs(other.y - node.y) < 4
        ? [j]
        : [],
    ),
  );

  let current = 0;
  let next = 0;
  let previous = -1;
  const position = new THREE.Vector2();
  let phase = 0;
  let appear = 0;
  let active = false;

  function pickNext() {
    const options = neighbours[current].filter((j) => j !== previous);
    const list = options.length ? options : neighbours[current];
    previous = current;
    next = list[Math.floor(Math.random() * list.length)];
  }

  current = nodes.findIndex((n) => n.x === 2.5 && n.y === -3.0);
  position.copy(nodes[current]);
  pickNext();
  model.root.position.set(position.x, 0, position.y);

  return {
    group: model.root,
    update(delta, stress) {
      if (!active && stress >= threshold) active = true;
      else if (active && stress < threshold - 8) active = false;
      appear += ((active ? 1 : 0) - appear) * Math.min(1, delta * 4);
      const visible = appear > 0.02;
      model.root.visible = visible;
      if (!visible) return;
      model.root.scale.setScalar(SCALE * appear);

      // Más estrés, más rápido corre.
      const run = speed * (0.85 + 0.5 * Math.max(0, (stress - threshold) / (100 - threshold)));
      const target = nodes[next];
      const toTarget = target.clone().sub(position);
      const distance = toTarget.length();
      const step = run * delta;
      if (distance <= step) {
        position.copy(target);
        current = next;
        pickNext();
      } else {
        position.addScaledVector(toTarget, step / distance);
        const wanted = Math.atan2(toTarget.x, toTarget.y);
        let d = (wanted - model.root.rotation.y) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        model.root.rotation.y += d * Math.min(1, delta * 10);
      }
      model.root.position.set(position.x, 0, position.y);

      phase += delta * STEP_RATE;
      const swing = Math.sin(phase);
      model.legs[0].rotation.x = swing * 0.9;
      model.legs[1].rotation.x = -swing * 0.9;
      // Los bracitos al aire, agitándose.
      model.arms[0].rotation.set(Math.sin(phase * 1.3) * 0.5, 0, -2.6 + Math.sin(phase) * 0.5);
      model.arms[1].rotation.set(Math.sin(phase * 1.3 + 1) * 0.5, 0, 2.6 - Math.sin(phase) * 0.5);
      model.body.position.y = Math.abs(swing) * 0.07;
      model.body.rotation.z = Math.sin(phase * 0.5) * 0.08; // se bambolea del apuro
    },
  };
}
