import * as THREE from 'three';
import { config } from '../../config.js';
import { createBusStopSignTexture, createWetGrassTexture } from '../../utils/textures.js';
import { paint, box, facadePlane, mergeParts, seededRandom } from '../../world/lowPoly.js';
import {
  addHouse,
  addTree,
  addLampPost,
  addFence,
  addBarGate,
  addApartmentBlock,
  addShrub,
  addUtilityPole,
  buildCables,
  addTrashBin,
  addRoundSign,
  addStopSign as addStopRoadSign,
} from '../../world/buildings.js';
import { CAR_COLORS, addParkedCar } from '../../world/vehicles.js';
import { createGlowMaterial, addGlow } from '../../world/glow.js';
import { road } from './layout.js';

/**
 * La ciudad que pasa por la ventanilla. El colectivo no se mueve: la ciudad se desplaza
 * hacia -x armada en tramos de cuadra que se reciclan hacia adelante (siempre más allá
 * de la niebla, así no se ve el salto). Cuando se pide la parada de la facultad, un tramo
 * especial con el edificio entra en la rotación.
 */

export const SEGMENT_LENGTH = 60;
const STOP_OFFSET = 20; // parada común dentro de cada tramo
const CAMPUS_STOP_OFFSET = 26; // parada frente a la facultad
const INTERSECTION = { from: 42, to: 52 };
// Un tramo se recicla cuando su final queda más atrás que esto (detrás del colectivo).
const RECYCLE_BEHIND = 70;
// El tramo de la facultad solo puede aparecer a partir de esta distancia (fuera de la niebla).
const CAMPUS_MIN_AHEAD = 50;

const RIGHT_SIDEWALK_Z = road.rightCurbZ + road.sidewalkWidth / 2;
const LEFT_SIDEWALK_Z = road.leftCurbZ - road.sidewalkWidth / 2;
const RIGHT_FENCE_Z = road.rightCurbZ + road.sidewalkWidth + 0.05;
const LEFT_FENCE_Z = road.leftCurbZ - road.sidewalkWidth - 0.05;
const HOUSE_COLORS = [
  0x9c8f86, 0xb9a58c, 0x8f9aa3, 0xc4b9a3, 0xa88c7a, 0x7f8a7c, 0xb0a89c, 0xbfae94,
];
const BLOCK_COLORS = [0x9a948c, 0x8c8f93, 0xa39b90, 0x8f8a84];
// Entrada de auto del lado izquierdo (hueco en el cerco, portón y auto estacionado).
const DRIVEWAY = { fromX: 24.9, toX: 30.1 };
// Postes de luz del lado izquierdo; el segundo tramo de cable llega al primer poste del
// tramo de ciudad siguiente (que siempre está a SEGMENT_LENGTH).
const POLE_XS = [10, 40];
const POLE_Z = road.leftCurbZ - 0.4;

function addTrafficLight(parts, x, z) {
  const ground = road.sidewalkY;
  const pole = new THREE.CylinderGeometry(0.06, 0.06, 3.2, 12);
  pole.translate(x, ground + 1.6, z);
  parts.push(paint(pole, 0x2c3035));
  parts.push(paint(box(0.26, 0.75, 0.26, x, ground + 3.0, z), 0x1b1d20));
  // Luces en las dos caras que miran a la calle: rojo y amarillo apagados, verde prendido.
  for (const side of [-1, 1]) {
    const faceX = x + side * 0.135;
    parts.push(paint(box(0.02, 0.16, 0.16, faceX, ground + 3.22, z), 0x3a1412));
    parts.push(paint(box(0.02, 0.16, 0.16, faceX, ground + 3.0, z), 0x3a3212));
    parts.push(paint(box(0.02, 0.16, 0.16, faceX, ground + 2.78, z), 0x3ad16b, { shaded: false }));
  }
}

/**
 * Casas a lo largo de un lado, entre `fromX` y `toX`, con arbustos junto a las fachadas.
 * Devuelve [{ x, floors }] para enganchar los cables de luz.
 */
function addHouseRow(parts, random, { fromX, toX, frontZ, facing, skip = null }) {
  const houses = [];
  let cursor = fromX;
  while (cursor < toX - 4) {
    const width = 4.6 + random() * 1.2;
    if (cursor + width > toX) break;
    const x = cursor + width / 2;
    const floors = random() < 0.45 ? 2 : 1;
    addHouse(parts, {
      x,
      frontZ,
      width,
      floors,
      color: HOUSE_COLORS[Math.floor(random() * HOUSE_COLORS.length)],
      facing,
      groundY: road.sidewalkY,
      random,
    });
    houses.push({ x, floors });
    // Uno o dos arbustos por casa, salvo donde está la entrada de auto.
    for (const dx of [-width * 0.32, width * 0.32]) {
      const sx = x + dx;
      if (skip && sx > skip.fromX - 0.5 && sx < skip.toX + 0.5) continue;
      if (random() < 0.7) {
        addShrub(parts, {
          x: sx,
          z: frontZ - facing * 0.7,
          scale: 0.8 + random() * 0.5,
          groundY: road.sidewalkY,
        });
      }
    }
    cursor += width + 0.6 + random() * 1.2;
  }
  return houses;
}

/** Postes de luz con cables entre sí (y hacia el tramo siguiente) y bajadas a dos casas. */
function addUtilities(parts, group, leftHouses) {
  const ground = road.sidewalkY;
  const poles = POLE_XS.map((x) => addUtilityPole(parts, { x, z: POLE_Z, groundY: ground }));
  const next = addUtilityPole([], { x: POLE_XS[0] + SEGMENT_LENGTH, z: POLE_Z, groundY: ground });
  const spans = [];
  for (let i = 0; i < 3; i += 1) {
    spans.push([poles[0][i], poles[1][i]]);
    spans.push([poles[1][i], next[i]]);
  }
  for (const pole of poles) {
    const poleX = pole[1].x;
    const house = leftHouses.reduce(
      (best, h) => (Math.abs(h.x - poleX) < Math.abs(best.x - poleX) ? h : best),
      leftHouses[0],
    );
    if (!house) continue;
    const y = ground + house.floors * 2.8 - 0.4;
    spans.push([pole[1], new THREE.Vector3(house.x + 1.2, y, LEFT_FENCE_Z - 2.7)]);
  }
  group.add(buildCables(spans));
}

function createCampusSignTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1d3557';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#f1f1f1';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 256, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Edificio de la facultad del lado derecho, con muchas aulas iluminadas. */
function addCampus(parts, random) {
  const ground = road.sidewalkY;
  const frontZ = 9;
  const width = 46;
  const height = 9.5;
  const depth = 16;
  const centerX = 30;
  parts.push(
    paint(box(width, height, depth, centerX, ground + height / 2, frontZ + depth / 2), 0xb8b0a2),
  );
  parts.push(
    paint(
      box(width + 1, 0.4, depth + 1, centerX, ground + height + 0.2, frontZ + depth / 2),
      0x8d8578,
    ),
  );
  for (let floor = 0; floor < 3; floor += 1) {
    for (let col = 0; col < 15; col += 1) {
      const x = centerX - width / 2 + 1.8 + col * 3.0;
      if (floor === 0 && Math.abs(x - centerX) < 3.5) continue; // entrada
      const lit = random() < 0.65;
      parts.push(
        paint(
          facadePlane(2.0, 1.4, x, ground + 1.6 + floor * 3.0, frontZ - 0.01, -1),
          lit ? 0xf3dc9a : 0x2f353c,
          {
            shaded: !lit,
          },
        ),
      );
    }
  }
  // Entrada vidriada con columnas.
  parts.push(paint(facadePlane(6, 2.8, centerX, ground + 1.4, frontZ - 0.02, -1), 0x3a4652));
  for (const dx of [-3.4, -1.1, 1.1, 3.4]) {
    parts.push(paint(box(0.35, 3.2, 0.35, centerX + dx, ground + 1.6, frontZ - 0.4), 0xd6d0c4));
  }
  parts.push(paint(box(9, 0.3, 2.2, centerX, ground + 3.3, frontZ - 1), 0xd6d0c4)); // alero
  // Muro bajo con el cartel de la ciudad universitaria.
  parts.push(paint(box(12, 0.9, 0.3, 14, ground + 0.45, RIGHT_FENCE_Z + 0.4), 0x9b9488));
  for (const x of [6, 22, 40, 50])
    addTree(parts, { x, z: 7, type: 'round', scale: 1.2, groundY: ground });
}

/** Poste de parada con el cartel a ambos lados (mismo que en la escena 2). */
function addStopSign(parts, group, signMaterial, x) {
  const z = road.rightCurbZ + 0.45;
  const pole = new THREE.CylinderGeometry(0.04, 0.04, 2.7, 12);
  pole.translate(x, road.sidewalkY + 1.35, z);
  parts.push(paint(pole, 0x9aa0a6));
  for (const direction of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.625), signMaterial);
    face.rotation.y = (direction * Math.PI) / 2;
    face.position.set(x + direction * 0.012, road.sidewalkY + 2.4, z + 0.33);
    group.add(face);
  }
  parts.push(paint(box(0.02, 0.66, 0.54, x, road.sidewalkY + 2.4, z + 0.33), 0x5a5f65));
}

function buildSegment(seed, signMaterial, glowMaterial, { campus = false } = {}) {
  const random = seededRandom(seed);
  const group = new THREE.Group();
  group.name = campus ? 'segment-campus' : `segment-${seed}`;
  const parts = [];
  const sidewalkTop = road.sidewalkY;
  const hasCorner = !campus;
  const runs = hasCorner
    ? [
        [0, INTERSECTION.from],
        [INTERSECTION.to, SEGMENT_LENGTH],
      ]
    : [[0, SEGMENT_LENGTH]];

  // Línea central discontinua.
  for (let x = 2; x < SEGMENT_LENGTH; x += 4) {
    parts.push(paint(box(1.6, 0.01, 0.12, x, road.surfaceY + 0.005, road.centerLineZ), 0xc9c4b0));
  }

  // Veredas (cortadas en la esquina) y cercos de los jardines.
  for (const [from, to] of runs) {
    const length = to - from;
    const centerX = (from + to) / 2;
    for (const z of [RIGHT_SIDEWALK_Z, LEFT_SIDEWALK_Z]) {
      parts.push(
        paint(box(length, 0.15, road.sidewalkWidth, centerX, sidewalkTop - 0.075, z), 0x7a7f84),
      );
    }
    if (!campus) addFence(parts, { fromX: from, toX: to, z: RIGHT_FENCE_Z, groundY: sidewalkTop });
    if (from < DRIVEWAY.fromX && to > DRIVEWAY.toX) {
      // Cerco izquierdo con el hueco de la entrada de auto.
      addFence(parts, { fromX: from, toX: DRIVEWAY.fromX, z: LEFT_FENCE_Z, groundY: sidewalkTop });
      addFence(parts, { fromX: DRIVEWAY.toX, toX: to, z: LEFT_FENCE_Z, groundY: sidewalkTop });
    } else {
      addFence(parts, { fromX: from, toX: to, z: LEFT_FENCE_Z, groundY: sidewalkTop });
    }
  }
  // Entrada de auto: portón de caños cerrado y auto estacionado paralelo a la calle.
  addBarGate(parts, { ...DRIVEWAY, z: LEFT_FENCE_Z, groundY: sidewalkTop });
  const drivewayX = (DRIVEWAY.fromX + DRIVEWAY.toX) / 2;
  parts.push(
    paint(box(5.0, 0.03, 2.6, drivewayX, sidewalkTop + 0.015, LEFT_FENCE_Z - 1.3), 0x8a8680),
  );
  addParkedCar(parts, {
    x: drivewayX,
    z: LEFT_FENCE_Z - 1.25,
    yaw: random() < 0.5 ? 0 : Math.PI,
    groundY: sidewalkTop,
    color: CAR_COLORS[Math.floor(random() * CAR_COLORS.length)],
  });

  if (hasCorner) {
    // Calle transversal, senda peatonal y semáforos.
    const crossWidth = INTERSECTION.to - INTERSECTION.from;
    const crossCenter = (INTERSECTION.from + INTERSECTION.to) / 2;
    for (const [nearZ, farZ] of [
      [road.rightCurbZ, 45],
      [road.leftCurbZ, -45],
    ]) {
      const street = new THREE.PlaneGeometry(crossWidth, Math.abs(farZ - nearZ));
      street.rotateX(-Math.PI / 2);
      street.translate(crossCenter, sidewalkTop + 0.004, (nearZ + farZ) / 2);
      parts.push(paint(street, 0x2c3136));
    }
    for (let z = road.leftCurbZ + 0.5; z < road.rightCurbZ - 0.3; z += 0.9) {
      parts.push(
        paint(box(2.4, 0.01, 0.45, INTERSECTION.from - 1.6, road.surfaceY + 0.006, z), 0xd9d6cc),
      );
    }
    addTrafficLight(parts, INTERSECTION.from - 0.6, road.rightCurbZ + 0.4);
    addTrafficLight(parts, INTERSECTION.to + 0.6, road.leftCurbZ - 0.4);
    // PARE para la calle transversal, en las dos esquinas.
    const ground = road.sidewalkY;
    addStopRoadSign(parts, {
      x: INTERSECTION.to + 0.5,
      z: road.rightCurbZ + 0.5,
      groundY: ground,
      yaw: Math.PI / 2,
    });
    addStopRoadSign(parts, {
      x: INTERSECTION.from - 0.5,
      z: road.leftCurbZ - 0.5,
      groundY: ground,
      yaw: Math.PI / 2,
    });
  }

  // Casas, o la facultad del lado derecho.
  const rightFront = RIGHT_FENCE_Z + 2.7;
  const leftFront = LEFT_FENCE_Z - 2.7;
  if (campus) {
    addCampus(parts, random);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 1.9),
      new THREE.MeshBasicMaterial({ map: createCampusSignTexture(config.viaje.paradaFinal) }),
    );
    sign.rotation.y = Math.PI; // mira a la calle (-z)
    sign.position.set(14, sidewalkTop + 0.45, RIGHT_FENCE_Z + 0.24);
    sign.scale.set(1, 0.42, 1);
    group.add(sign);
  } else {
    for (const [from, to] of runs)
      addHouseRow(parts, random, { fromX: from + 1, toX: to - 1, frontZ: rightFront, facing: -1 });
  }
  const leftHouses = runs.flatMap(([from, to]) =>
    addHouseRow(parts, random, {
      fromX: from + 1,
      toX: to - 1,
      frontZ: leftFront,
      facing: 1,
      skip: DRIVEWAY,
    }),
  );
  addUtilities(parts, group, leftHouses);

  // Edificios de departamentos detrás de las casas (del lado de la facultad, solo enfrente).
  const blockFloors = () => 5 + Math.floor(random() * 3);
  const blockColor = () => BLOCK_COLORS[Math.floor(random() * BLOCK_COLORS.length)];
  if (!campus) {
    for (const [x, width] of [
      [14, 14],
      [44, 12],
    ]) {
      addApartmentBlock(parts, {
        x,
        z: 22,
        width,
        floors: blockFloors(),
        color: blockColor(),
        facing: -1,
        groundY: sidewalkTop,
        random,
      });
    }
  }
  for (const [x, width] of [
    [8, 12],
    [36, 16],
  ]) {
    addApartmentBlock(parts, {
      x,
      z: -26,
      width,
      floors: blockFloors(),
      color: blockColor(),
      facing: 1,
      groundY: sidewalkTop,
      random,
    });
  }

  // Tachos y una señal en las veredas.
  addTrashBin(parts, { x: 22, z: road.rightCurbZ + 2.6, groundY: sidewalkTop });
  addTrashBin(parts, { x: 33, z: road.leftCurbZ - 2.6, groundY: sidewalkTop, color: 0x3d3d3d });
  addRoundSign(parts, { x: 37.5, z: road.rightCurbZ + 0.4, groundY: sidewalkTop });

  // Árboles y faroles junto al cordón.
  const stopX = campus ? CAMPUS_STOP_OFFSET : STOP_OFFSET;
  for (const x of [5, 30]) {
    for (const lamp of [
      { x: x + 3, z: road.rightCurbZ + 0.35, armDirZ: -1 },
      { x: x + 11, z: road.leftCurbZ - 0.35, armDirZ: 1 },
    ]) {
      addLampPost(parts, { ...lamp, groundY: sidewalkTop });
      addGlow(group, glowMaterial, lamp.x, sidewalkTop + 4.0, lamp.z + lamp.armDirZ * 0.85, 1.8);
    }
  }
  for (const x of [3 + random() * 4, 27 + random() * 6, 35 + random() * 4]) {
    if (Math.abs(x - stopX) > 3) {
      // Lejos del cordón y no muy grandes: la copa no puede meterse en el colectivo.
      addTree(parts, {
        x,
        z: road.rightCurbZ + 1.6,
        type: 'round',
        scale: 0.85 + random() * 0.15,
        groundY: sidewalkTop,
      });
    }
  }
  for (const x of [8 + random() * 6, 24 + random() * 8]) {
    addTree(parts, {
      x,
      z: road.leftCurbZ - 0.6,
      type: random() < 0.5 ? 'pine' : 'round',
      scale: 1 + random() * 0.3,
      groundY: sidewalkTop,
    });
  }

  addStopSign(parts, group, signMaterial, stopX);
  group.add(mergeParts(parts, `${group.name}-landscape`));
  return { group, stopOffset: stopX, isCampus: campus };
}

/**
 * Calzada fija (mojada: refleja la ciudad en `reflection`) y pasto con textura que se
 * desplaza con la velocidad del colectivo.
 */
function buildGround(reflection) {
  const group = new THREE.Group();
  group.name = 'ground';
  const asphalt = new THREE.PlaneGeometry(300, road.rightCurbZ - road.leftCurbZ);
  asphalt.rotateX(-Math.PI / 2);
  asphalt.translate(0, road.surfaceY, (road.rightCurbZ + road.leftCurbZ) / 2);
  const wetRoad = reflection.createSurface(asphalt, {
    color: 0x2c3136,
    reflectivity: 0.8,
    minReflect: 0.08,
    darken: 0.72,
    streak: 0.07,
    distortion: 0.008,
  });
  wetRoad.name = 'wet-road';
  group.add(wetRoad);

  const grassTexture = createWetGrassTexture();
  const width = 300;
  const depth = 60;
  grassTexture.repeat.set(100, 20);
  const grassMaterial = new THREE.MeshBasicMaterial({ map: grassTexture });
  for (const [edgeZ, side] of [
    [road.rightCurbZ + road.sidewalkWidth, 1],
    [road.leftCurbZ - road.sidewalkWidth, -1],
  ]) {
    const grass = new THREE.PlaneGeometry(width, depth);
    grass.rotateX(-Math.PI / 2);
    grass.translate(0, road.sidewalkY - 0.01, edgeZ + (side * depth) / 2);
    group.add(new THREE.Mesh(grass, grassMaterial));
  }
  return { group, grassTexture, repeatPerMeter: 100 / width };
}

/** `reflection`: el reflejo del plano de la calle (para la calzada mojada). */
export function createCityStrip({ reflection }) {
  const group = new THREE.Group();
  group.name = 'city';
  const signMaterial = new THREE.MeshBasicMaterial({
    map: createBusStopSignTexture(config.parada.linea),
  });
  const glowMaterial = createGlowMaterial(0xffd9a0, 0.75);

  const active = [11, 37, 59].map((seed) => buildSegment(seed, signMaterial, glowMaterial));
  active.forEach((segment, i) => {
    segment.group.position.x = -SEGMENT_LENGTH + i * SEGMENT_LENGTH;
    group.add(segment.group);
  });
  const campus = buildSegment(83, signMaterial, glowMaterial, { campus: true });
  campus.group.visible = false;
  group.add(campus.group);

  const ground = buildGround(reflection);
  group.add(ground.group);

  let campusPending = false;

  function farthest() {
    return active.reduce((a, b) => (a.group.position.x > b.group.position.x ? a : b));
  }

  function placeCampusInstead(index, x) {
    active[index].group.visible = false;
    active[index] = campus;
    campus.group.position.x = x;
    campus.group.visible = true;
    campusPending = false;
  }

  return {
    group,
    /** Mueve la ciudad `dx` metros hacia atrás (el colectivo avanzó `dx`). */
    scroll(dx) {
      for (const segment of active) segment.group.position.x -= dx;
      ground.grassTexture.offset.x += dx * ground.repeatPerMeter;
      active.forEach((segment, i) => {
        if (segment.group.position.x + SEGMENT_LENGTH >= -RECYCLE_BEHIND) return;
        const x = farthest().group.position.x + SEGMENT_LENGTH;
        if (campusPending) placeCampusInstead(i, x);
        else segment.group.position.x = x;
      });
    },
    /** Pide que aparezca la facultad: ya mismo si hay un tramo bien adelante, si no al reciclar. */
    requestCampus() {
      const ahead = farthest();
      if (ahead.group.position.x >= CAMPUS_MIN_AHEAD)
        placeCampusInstead(active.indexOf(ahead), ahead.group.position.x);
      else campusPending = true;
    },
    /** Distancia (m) desde `fromX` hasta la parada de la facultad, o null si todavía no apareció. */
    campusStopDistance(fromX) {
      if (!campus.group.visible) return null;
      return campus.group.position.x + campus.stopOffset - fromX;
    },
    /**
     * La próxima parada común a al menos `minDistance` de `fromX`. Devuelve una función
     * que da la distancia restante a medida que la ciudad se mueve.
     */
    nextStop(fromX, minDistance) {
      const candidates = active
        .filter((segment) => !segment.isCampus)
        .map((segment) => ({
          segment,
          distance: segment.group.position.x + segment.stopOffset - fromX,
        }))
        .filter((c) => c.distance >= minDistance)
        .sort((a, b) => a.distance - b.distance);
      if (candidates.length === 0) return null;
      const { segment } = candidates[0];
      return () => segment.group.position.x + segment.stopOffset - fromX;
    },
  };
}
