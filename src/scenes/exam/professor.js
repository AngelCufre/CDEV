import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createFloralFabricTexture } from '../../utils/textures.js';
import { paint, roundedBox, mergeParts, seededRandom } from '../../world/lowPoly.js';

const SKIN = 0xe3b28e;
const SHOES = 0x5a2a22;
const FOLDER = 0x2f6b8a;
const HAIR_COLORS = [0xa4482a, 0xb8592f, 0x8e3b22, 0xc4683a, 0x9a4126, 0xb04f2c];
const STEP_LENGTH = 0.55;

const _target = new THREE.Vector3();

/** Diferencia de ángulos en (-π, π]. */
function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Rulos: muchas bolitas facetadas en tonos pelirrojos, alrededor de la cabeza (salvo la
 * cara) y cayendo en volumen hasta los hombros. `head` es el centro de la cabeza.
 */
function buildCurls(parts, head, random) {
  const direction = new THREE.Vector3();
  const addCurl = (x, y, z, radius) => {
    const curl = new THREE.IcosahedronGeometry(radius, 1);
    curl.translate(x, y, z);
    parts.push(paint(curl, HAIR_COLORS[Math.floor(random() * HAIR_COLORS.length)]));
  };
  // Alrededor de la cabeza.
  let placed = 0;
  while (placed < 150) {
    direction.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
    if (direction.lengthSq() > 1 || direction.lengthSq() < 0.05) continue;
    direction.normalize();
    // La cara (adelante, de la frente para abajo) queda libre.
    if (direction.x > 0.35 && direction.y < 0.45) continue;
    const radius = 0.022 + random() * 0.016;
    const distance = 0.102 + radius * 0.6;
    addCurl(
      head.x + direction.x * distance,
      head.y + direction.y * distance,
      head.z + direction.z * distance * 1.08,
      radius,
    );
    placed += 1;
  }
  // Volumen que cae detrás y a los costados, hasta los hombros.
  placed = 0;
  while (placed < 130) {
    const y = head.y - 0.04 - random() * 0.3;
    const angle = (random() - 0.5) * Math.PI * 1.45 + Math.PI; // de atrás hacia los costados
    const spread = 0.12 + (head.y - y) * 0.35 + random() * 0.03;
    const x = head.x + Math.cos(angle) * spread * 0.9;
    const z = head.z + Math.sin(angle) * spread * 1.15;
    if (x > head.x + 0.02 && Math.abs(z - head.z) < 0.1) continue;
    addCurl(x, y, z, 0.024 + random() * 0.018);
    placed += 1;
  }
}

/** Pieza con la tela floreada (el vestido): conserva las UV para la textura. */
function fabric(geometry) {
  return paint(geometry, 0xffffff, { keepUv: true });
}

/**
 * La profesora: rulos pelirrojos, vestido floreado de muchos colores, carpeta con los
 * parciales bajo el brazo izquierdo. Mira hacia +x en coordenadas locales.
 */
function buildModel() {
  const random = seededRandom(17);
  const root = new THREE.Group();
  root.name = 'professor';
  const body = new THREE.Group();
  root.add(body);

  const fabricTexture = createFloralFabricTexture();
  fabricTexture.repeat.set(3, 2);
  const fabricMaterial = new THREE.MeshBasicMaterial({
    map: fabricTexture,
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  // Vestido: falda acampanada y torso, un poco aplanados de adelante hacia atrás.
  const skirt = new THREE.CylinderGeometry(0.17, 0.35, 0.72, 32, 4, true);
  skirt.scale(0.85, 1, 1);
  skirt.translate(0, 0.78, 0);
  const bodice = new THREE.CylinderGeometry(0.135, 0.17, 0.44, 28);
  bodice.scale(0.75, 1, 1);
  bodice.translate(0, 1.36, 0);
  const dress = new THREE.Mesh(mergeGeometries([fabric(skirt), fabric(bodice)]), fabricMaterial);
  dress.name = 'professor-dress';
  body.add(dress);

  // Cuello, cabeza, rulos, cinturón y la carpeta.
  const parts = [];
  const neck = new THREE.CylinderGeometry(0.042, 0.048, 0.1, 14);
  neck.translate(0, 1.62, 0);
  parts.push(paint(neck, SKIN));
  const head = new THREE.Vector3(0, 1.75, 0);
  const headGeo = new THREE.IcosahedronGeometry(0.105, 3);
  headGeo.scale(0.95, 1.08, 0.92);
  headGeo.translate(head.x, head.y, head.z);
  parts.push(paint(headGeo, SKIN));
  buildCurls(parts, head, random);
  const belt = new THREE.TorusGeometry(0.16, 0.014, 6, 32);
  belt.rotateX(Math.PI / 2);
  belt.scale(0.78, 1, 1);
  belt.translate(0, 1.15, 0);
  parts.push(paint(belt, 0x6a2e1f));
  const folder = roundedBox(0.04, 0.34, 0.26, 0.15, 1.22, -0.07, 0.01);
  folder.rotateY(0.1);
  parts.push(paint(folder, FOLDER));
  body.add(mergeParts(parts, 'professor-body'));

  // Piernas: giran desde la cadera (escondida bajo la falda); se ven las pantorrillas.
  const legs = [1, -1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.8, side * 0.085);
    const legParts = [];
    const leg = new THREE.CylinderGeometry(0.05, 0.04, 0.74, 12);
    leg.translate(0, -0.37, 0);
    legParts.push(paint(leg, SKIN));
    legParts.push(paint(roundedBox(0.22, 0.06, 0.09, 0.05, -0.77, 0, 0.025, 2), SHOES));
    pivot.add(mergeParts(legParts, 'professor-leg'));
    root.add(pivot);
    return pivot;
  });

  // Brazos: el derecho (+z) se balancea al caminar; el izquierdo sostiene la carpeta.
  const arm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.52, side * 0.2);
    const skin = [];
    const limb = new THREE.CylinderGeometry(0.038, 0.034, 0.5, 12);
    limb.translate(0, -0.33, 0);
    skin.push(paint(limb, SKIN));
    const hand = new THREE.IcosahedronGeometry(0.045, 2);
    hand.translate(0, -0.61, 0);
    skin.push(paint(hand, SKIN));
    pivot.add(mergeParts(skin, 'professor-arm'));
    const sleeve = new THREE.CylinderGeometry(0.06, 0.058, 0.16, 16);
    sleeve.translate(0, -0.06, 0);
    pivot.add(new THREE.Mesh(fabric(sleeve), fabricMaterial));
    body.add(pivot);
    return pivot;
  };
  const rightArm = arm(1);
  const leftArm = arm(-1);
  leftArm.rotation.set(-0.35, 0, 0.75); // hacia adelante y adentro: abraza la carpeta

  return { root, body, legs, rightArm, leftArm };
}

/**
 * La profesora y su recorrido. Camina una vuelta cerrada por los pasillos (`loop`, con
 * una parada en los puntos marcados con `pause`). `goTo(x, z, onArrive)` la manda por el
 * camino más corto de la vuelta hasta ese punto, y ahí se queda mirando al banco.
 */
export function createProfessor({ loop, speed, pauseSeconds }) {
  const model = buildModel();
  const points = loop.map((p) => new THREE.Vector2(p.x, p.z));
  const starts = [];
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    starts.push(total);
    total += points[i].distanceTo(points[(i + 1) % points.length]);
  }
  const pauseAt = loop.flatMap((p, i) => (p.pause ? [starts[i]] : []));

  let s = pauseAt[0] ?? 0; // distancia recorrida sobre la vuelta
  let pauseTimer = pauseSeconds;
  let mode = 'patrol'; // 'patrol' | 'going' | 'standing'
  let target = null; // { s, faceYaw, onArrive }
  let walkPhase = 0;
  let walkAmount = 0;
  let yaw = 0;
  const position = new THREE.Vector3();

  /** Punto y dirección de la vuelta a la distancia `distance`. */
  function sample(distance) {
    const d = ((distance % total) + total) % total;
    let i = starts.length - 1;
    while (starts[i] > d) i -= 1;
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const length = a.distanceTo(b);
    const t = (d - starts[i]) / length;
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.y + (b.y - a.y) * t,
      dx: (b.x - a.x) / length,
      dz: (b.y - a.y) / length,
    };
  }

  /** Distancia sobre la vuelta del punto más cercano a (x, z). */
  function project(x, z) {
    let best = { s: 0, distance: Infinity };
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const ab = b.clone().sub(a);
      const t = Math.max(0, Math.min(1, ((x - a.x) * ab.x + (z - a.y) * ab.y) / ab.lengthSq()));
      const px = a.x + ab.x * t;
      const pz = a.y + ab.y * t;
      const distance = Math.hypot(x - px, z - pz);
      if (distance < best.distance) best = { s: starts[i] + t * ab.length(), distance };
    }
    return best.s;
  }

  function place(direction) {
    const p = sample(s);
    position.set(p.x, 0, p.z);
    model.root.position.copy(position);
    return { dx: p.dx * direction, dz: p.dz * direction };
  }

  function turnTowards(dx, dz, delta) {
    const wanted = Math.atan2(-dz, dx);
    yaw += angleDelta(yaw, wanted) * Math.min(1, delta * 6);
    model.root.rotation.y = yaw;
  }

  function animate(delta, walking, stepSpeed) {
    walkAmount += ((walking ? 1 : 0) - walkAmount) * Math.min(1, delta * 6);
    if (walking) walkPhase += ((stepSpeed * delta) / STEP_LENGTH) * Math.PI;
    const swing = Math.sin(walkPhase) * walkAmount;
    model.legs[0].rotation.z = swing * 0.26;
    model.legs[1].rotation.z = -swing * 0.26;
    model.rightArm.rotation.z = -swing * 0.38;
    model.body.position.y = Math.abs(Math.sin(walkPhase)) * 0.018 * walkAmount;
    model.body.rotation.x = Math.sin(walkPhase) * 0.025 * walkAmount;
  }

  const initial = place(1);
  yaw = Math.atan2(-initial.dz, initial.dx);
  model.root.rotation.y = yaw;

  return {
    group: model.root,
    get position() {
      return position;
    },
    /** Dónde tiene la mano con la carpeta (para que las hojas entregadas vayan ahí). */
    handPosition() {
      _target.set(0.18, 1.15, -0.05);
      return model.root.localToWorld(_target.clone());
    },
    goTo(x, z, faceYaw, onArrive) {
      target = { s: project(x, z), faceYaw, onArrive };
      mode = 'going';
      pauseTimer = 0;
    },
    update(delta) {
      if (mode === 'standing') {
        animate(delta, false, 0);
        yaw += angleDelta(yaw, target.faceYaw) * Math.min(1, delta * 4);
        model.root.rotation.y = yaw;
        return;
      }
      if (mode === 'patrol' && pauseTimer > 0) {
        pauseTimer -= delta;
        animate(delta, false, 0);
        // Parada adelante: mira hacia el aula.
        yaw += angleDelta(yaw, -Math.PI / 2) * Math.min(1, delta * 3);
        model.root.rotation.y = yaw;
        return;
      }
      let direction = 1;
      let step = speed * delta;
      if (mode === 'going') {
        // Por el lado más corto de la vuelta, un poco más rápido (ya terminó el tiempo).
        const ahead = (((target.s - s) % total) + total) % total;
        direction = ahead <= total / 2 ? 1 : -1;
        const remaining = direction > 0 ? ahead : total - ahead;
        step = Math.min(speed * 1.6 * delta, remaining);
        s += step * direction;
        if (remaining - step < 0.01) {
          mode = 'standing';
          place(direction);
          target.onArrive?.();
          return;
        }
      } else {
        const before = s % total;
        s = (s + step) % total;
        const after = s;
        for (const p of pauseAt) {
          const crossed = before < after ? before < p && p <= after : before < p || p <= after;
          if (crossed) pauseTimer = pauseSeconds;
        }
      }
      const { dx, dz } = place(direction);
      turnTowards(dx, dz, delta);
      animate(delta, true, step / Math.max(delta, 1e-4));
    },
  };
}
