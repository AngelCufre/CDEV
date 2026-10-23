import * as THREE from 'three';
import { config } from '../../config.js';
import { createWetGrassTexture, createBusStopSignTexture } from '../../utils/textures.js';
import { paint, box, mergeParts, mergePartsGeometry, seededRandom } from '../../world/lowPoly.js';
import {
  addHouse,
  addTree,
  addLampPost,
  addFence,
  addBarGate,
  addApartmentBlock,
  addShrub,
  addHedge,
  addUtilityPole,
  buildCables,
  addTrashBin,
  addMailbox,
  addBench,
  addRoundSign,
} from '../../world/buildings.js';
import { addParkedCar } from '../../world/vehicles.js';
import { createGlowMaterial, addGlow } from '../../world/glow.js';
import {
  street,
  sidewalk,
  housesFrontZ,
  home,
  busStop,
  walkableX,
  lampPosts,
  sidewalkTrees,
} from './layout.js';

const SIDEWALK_COLOR = 0x7a7f84;
// Separación entre el poste de la parada y el centro del cartel.
const SIGN_OFFSET_Z = 0.33;
const CURB_COLOR = 0x8d9195;

/** Casas de este lado (x, ancho, pisos, color). La del estudiante es la de `home.x`. */
const NEAR_HOUSES = [
  { x: -31, width: 5.0, floors: 1, color: 0xa39485 },
  { x: -25, width: 5.4, floors: 2, color: 0x8f9aa3 },
  { x: -19, width: 4.8, floors: 1, color: 0xb9a58c },
  { x: -13, width: 5.2, floors: 2, color: 0x9c8f86 },
  { x: home.x, width: 6.0, floors: 1, color: 0xc8b89a },
  { x: 0, width: 5.0, floors: 2, color: 0x7f8a7c },
  { x: 6.5, width: 5.2, floors: 1, color: 0xb0a89c },
  { x: 13, width: 5.0, floors: 2, color: 0xa88c7a },
  { x: 19.5, width: 5.4, floors: 1, color: 0x94a0a8 },
  { x: 26, width: 5.0, floors: 2, color: 0xbfae94 },
  { x: 32, width: 4.6, floors: 1, color: 0x9d9087 },
];

const FAR_HOUSES = [
  { x: -30, width: 5.2, floors: 2, color: 0xb3a38f },
  { x: -23.5, width: 4.8, floors: 1, color: 0x8b969f },
  { x: -17.5, width: 5.4, floors: 2, color: 0xc4b9a3 },
  { x: -11, width: 5.0, floors: 1, color: 0xa88c7a },
  { x: -4.5, width: 5.2, floors: 2, color: 0x9c8f86 },
  { x: 2, width: 4.6, floors: 1, color: 0x8f9aa3 },
  { x: 8, width: 5.4, floors: 2, color: 0xb9a58c },
  { x: 14.5, width: 5.0, floors: 1, color: 0x7f8a7c },
  { x: 21, width: 5.2, floors: 2, color: 0xb0a89c },
  { x: 27.5, width: 4.8, floors: 1, color: 0xa39485 },
];

/**
 * Entradas de auto (hueco en el cerco con portón de caños y un auto estacionado en el
 * jardín, paralelo a la calle). `side` = 1 es la vereda del jugador.
 */
const DRIVEWAYS = [
  { x: 6.5, side: 1, yaw: 0, color: 0x1f3f66 },
  { x: 19.5, side: 1, yaw: Math.PI, color: 0xb9b9b4 },
  { x: -11, side: -1, yaw: 0, color: 0x8e1b1b },
  { x: 14.5, side: -1, yaw: Math.PI, color: 0x3f5e3a },
];
const DRIVEWAY_HALF = 2.6;

/** Banco y señal en la vereda del jugador (también son obstáculos). */
const BENCH = { x: 4.6, z: 6.0, halfLength: 0.8, minZ: 5.72, maxZ: 6.3 };
const SIGN = { x: -10.5, z: 3.78 };
const MAILBOX = { x: home.x - 0.85, z: sidewalk.farZ + 0.35 };
/** Arbustos dentro del jardín de la casa del estudiante (ahí sí se puede caminar). */
const HOME_SHRUBS = [-8.3, -4.7];

/** Edificios de departamentos detrás de las casas, de este lado y de enfrente. */
const NEAR_BLOCKS = [
  { x: -22, width: 14, floors: 6, color: 0x9a948c },
  { x: -4, width: 12, floors: 5, color: 0x8c8f93 },
  { x: 12, width: 16, floors: 7, color: 0xa39b90 },
  { x: 30, width: 12, floors: 5, color: 0x8f8a84 },
];
const FAR_BLOCKS = [
  { x: -28, width: 14, floors: 5, color: 0x8f8a84 },
  { x: -10, width: 12, floors: 7, color: 0x9a948c },
  { x: 8, width: 16, floors: 6, color: 0x8c8f93 },
  { x: 26, width: 12, floors: 5, color: 0xa39b90 },
];
const BLOCKS_Z = 27;

const YARD_TREES = [
  { x: -16, z: 7.9, type: 'round', scale: 1.2 },
  { x: -1.9, z: 8.0, type: 'pine', scale: 1.1 },
  { x: 9.8, z: 7.9, type: 'round', scale: 1.1 },
  { x: 22.7, z: 8.0, type: 'pine', scale: 1.3 },
  { x: -20.5, z: -7.9, type: 'pine', scale: 1.3 },
  { x: -7.8, z: -8.0, type: 'round', scale: 1.1 },
  { x: 5.2, z: -7.9, type: 'round', scale: 1.2 },
  { x: 17.8, z: -8.0, type: 'pine', scale: 1.2 },
];

/** Calzada y marcas pintadas: todo sobre el plano de la calle. */
function buildRoad() {
  const parts = [];
  const asphalt = new THREE.PlaneGeometry(street.length, street.halfWidth * 2);
  asphalt.rotateX(-Math.PI / 2);
  asphalt.translate(0, street.surfaceY, 0);
  parts.push(paint(asphalt, 0x2c3136));

  const half = street.length / 2;
  for (let x = -half + 3; x <= half - 3; x += 4) {
    parts.push(paint(box(1.6, 0.01, 0.12, x, street.surfaceY + 0.005, 0), 0xc9c4b0));
  }
  return mergePartsGeometry(parts);
}

/** Veredas, cordones y el camino de la casa: todo a la altura de la vereda (y = 0). */
function buildSidewalks() {
  const parts = [];
  const sidewalkCenter = (sidewalk.nearZ + sidewalk.farZ) / 2;
  for (const side of [1, -1]) {
    parts.push(
      paint(
        box(street.length, 0.15, sidewalk.width, 0, -0.075, side * sidewalkCenter),
        SIDEWALK_COLOR,
      ),
    );
    parts.push(
      paint(box(street.length, 0.16, 0.15, 0, -0.07, side * (sidewalk.nearZ + 0.075)), CURB_COLOR),
    );
  }

  // Cordón pintado de amarillo frente a la parada (apenas más grande que el gris
  // para que lo envuelva y no haya z-fighting).
  parts.push(paint(box(9, 0.17, 0.16, busStop.x - 3.5, -0.07, sidewalk.nearZ + 0.075), 0xc9a227));

  // Camino de baldosas del portón a la puerta de la casa del estudiante.
  const pathLength = housesFrontZ - sidewalk.farZ;
  parts.push(
    paint(box(1.2, 0.02, pathLength, home.x, 0.01, sidewalk.farZ + pathLength / 2), 0x8a8680),
  );
  return mergePartsGeometry(parts);
}

/** Halo de cada farol prendido, debajo de la lámpara. */
function buildLampGlows() {
  const group = new THREE.Group();
  group.name = 'lamp-glows';
  const material = createGlowMaterial(0xffd9a0, 0.75);
  for (const lamp of lampPosts) {
    addGlow(group, material, lamp.x, 4.0, lamp.z + lamp.armDirZ * 0.85, 1.8);
  }
  return group;
}

/** Tramos de cerco de un lado, salteando las entradas de auto (y el portón de la casa). */
function fenceRuns(side) {
  const gaps = DRIVEWAYS.filter((d) => d.side === side).map((d) => [
    d.x - DRIVEWAY_HALF,
    d.x + DRIVEWAY_HALF,
  ]);
  if (side === 1) gaps.push([home.x - home.gateWidth / 2, home.x + home.gateWidth / 2]);
  gaps.sort((a, b) => a[0] - b[0]);
  const runs = [];
  let cursor = -40;
  for (const [from, to] of gaps) {
    runs.push([cursor, from]);
    cursor = to;
  }
  runs.push([cursor, 40]);
  return runs;
}

function buildFences(parts) {
  const fenceZ = sidewalk.farZ + 0.05;
  const gateHalf = home.gateWidth / 2;
  // Este lado: con el hueco del portón de la casa del estudiante y las entradas de auto.
  for (const [fromX, toX] of fenceRuns(1)) {
    addFence(parts, { fromX, toX, z: fenceZ, railOffsetZ: -0.06 });
  }
  // Postes del portón (quedó abierto: salió apurado).
  for (const x of [home.x - gateHalf, home.x + gateHalf]) {
    parts.push(paint(box(0.13, 1.15, 0.13, x, 0.575, fenceZ), 0x3b3029));
  }
  // Cercos laterales del jardín, para separarlo de los vecinos.
  for (const x of [home.x - home.lotHalfWidth, home.x + home.lotHalfWidth]) {
    addFenceAlongZ(parts, x, fenceZ, housesFrontZ);
  }
  // Enfrente.
  for (const [fromX, toX] of fenceRuns(-1)) addFence(parts, { fromX, toX, z: -fenceZ });
  // Portones (cerrados) de las entradas de auto.
  for (const d of DRIVEWAYS) {
    addBarGate(parts, {
      fromX: d.x - DRIVEWAY_HALF,
      toX: d.x + DRIVEWAY_HALF,
      z: d.side * fenceZ,
    });
  }
}

/** Jardines: entradas con auto estacionado, arbustos junto a las fachadas y cercos vivos. */
function buildYards(parts, random) {
  for (const d of DRIVEWAYS) {
    const z = d.side * (sidewalk.farZ + 1.5);
    parts.push(paint(box(DRIVEWAY_HALF * 2 - 0.2, 0.03, 3.0, d.x, 0.015, z), 0x8a8680));
    addParkedCar(parts, { x: d.x, z, yaw: d.yaw, color: d.color });
  }
  const nearShrubs = [
    -30,
    -27.5,
    -20.5,
    -17.5,
    -14.5,
    -11.5,
    ...HOME_SHRUBS,
    -1.6,
    1.8,
    11.2,
    14.8,
    24.3,
    27.6,
    30.6,
    33.6,
  ];
  const farShrubs = [
    -31.5, -28, -24.5, -21, -17, -14.6, -6.6, -2.4, 0.6, 3.4, 6.4, 9.6, 19, 22.4, 25.6, 29,
  ];
  const shrubZ = housesFrontZ - 0.7;
  for (const x of nearShrubs) {
    addShrub(parts, { x, z: shrubZ + (random() - 0.5) * 0.3, scale: 0.8 + random() * 0.5 });
  }
  for (const x of farShrubs) {
    addShrub(parts, { x, z: -shrubZ + (random() - 0.5) * 0.3, scale: 0.8 + random() * 0.5 });
  }
  const hedgeZ = sidewalk.farZ + 0.6;
  addHedge(parts, { fromX: 10.6, toX: 15.4, z: hedgeZ });
  addHedge(parts, { fromX: -27.6, toX: -22.4, z: hedgeZ });
  addHedge(parts, { fromX: -0.2, toX: 4.2, z: -hedgeZ });
  addHedge(parts, { fromX: -32.5, toX: -27.6, z: -hedgeZ });
}

/**
 * Postes de luz de madera con sus cables: a lo largo de la vereda de enfrente, dos de
 * este lado, cruces de calle y bajadas a algunas casas. Devuelve el mesh de los cables.
 */
function buildUtilities(parts) {
  const farZ = -(sidewalk.nearZ + 0.4);
  const nearZ = sidewalk.nearZ + 0.4;
  const farPoles = [-36, -16, 4, 24, 44].map((x) => addUtilityPole(parts, { x, z: farZ }));
  const nearPoles = [-18, 22].map((x) => addUtilityPole(parts, { x, z: nearZ }));
  const spans = [];
  const link = (a, b) => {
    for (let i = 0; i < 3; i += 1) spans.push([a[i], b[i]]);
  };
  for (let i = 0; i + 1 < farPoles.length; i += 1) link(farPoles[i], farPoles[i + 1]);
  link(nearPoles[0], nearPoles[1]);
  link(farPoles[1], nearPoles[0]);
  link(farPoles[3], nearPoles[1]);
  // Bajadas a las casas, desde el aislador del medio hasta arriba de la fachada.
  const feed = (pole, x, y, z) => spans.push([pole[1], new THREE.Vector3(x, y, z)]);
  feed(farPoles[1], -16.3, 5.2, -housesFrontZ);
  feed(farPoles[2], 3.2, 2.7, -housesFrontZ);
  feed(farPoles[3], 22.2, 5.2, -housesFrontZ);
  feed(nearPoles[0], -17.8, 2.7, housesFrontZ);
  feed(nearPoles[1], 20.7, 2.7, housesFrontZ);
  return buildCables(spans);
}

/** Banco, tachos, buzones, señales y rejillas del cordón. */
function buildStreetFurniture(parts) {
  addBench(parts, { x: BENCH.x, z: BENCH.z, length: BENCH.halfLength * 2 });
  addTrashBin(parts, { x: 0.3, z: 6.05 });
  addTrashBin(parts, { x: -14.2, z: -4.1, color: 0x3d3d3d });
  addTrashBin(parts, { x: 10.2, z: -6.05 });
  addMailbox(parts, { x: MAILBOX.x, z: MAILBOX.z, facing: -1 });
  addMailbox(parts, { x: -2.6, z: -(sidewalk.farZ + 0.35), facing: 1, color: 0x2b4a7a });
  addMailbox(parts, { x: 6.2, z: -(sidewalk.farZ + 0.35), facing: 1 });
  addRoundSign(parts, { x: SIGN.x, z: SIGN.z });
  addRoundSign(parts, { x: 16.5, z: -(sidewalk.nearZ + 0.3) });
  // Rejillas de desagüe en la cara del cordón.
  const drainZ = sidewalk.nearZ - 0.005;
  for (const x of [-12, -4, 4, 12]) {
    parts.push(paint(box(0.7, 0.09, 0.03, x, -0.09, drainZ), 0x1b1d20));
  }
  for (const x of [-8, 0, 8]) parts.push(paint(box(0.7, 0.09, 0.03, x, -0.09, -drainZ), 0x1b1d20));
}

/** Edificios de departamentos detrás de las casas, perdiéndose en la niebla. */
function buildBackground(parts, random) {
  for (const block of NEAR_BLOCKS) {
    addApartmentBlock(parts, { ...block, z: BLOCKS_Z, facing: -1, random });
  }
  for (const block of FAR_BLOCKS) {
    addApartmentBlock(parts, { ...block, z: -BLOCKS_Z, facing: 1, random });
  }
}

/** Cerco perpendicular a la calle (a lo largo de Z), mismo estilo que `addFence`. */
function addFenceAlongZ(parts, x, fromZ, toZ) {
  const color = 0x4e4036;
  for (let z = fromZ; z <= toZ + 0.001; z += 1.5) {
    parts.push(paint(box(0.08, 1.0, 0.08, x, 0.5, z), color));
  }
  const length = toZ - fromZ;
  for (const y of [0.35, 0.75]) {
    parts.push(paint(box(0.04, 0.07, length, x, y, (fromZ + toZ) / 2), color));
  }
}

function buildHouses(parts, random) {
  for (const house of NEAR_HOUSES) {
    addHouse(parts, { ...house, frontZ: housesFrontZ, facing: -1, random });
  }
  for (const house of FAR_HOUSES) {
    addHouse(parts, { ...house, frontZ: -housesFrontZ, facing: 1, random });
  }
}

function buildBusStopPole(parts) {
  const pole = new THREE.CylinderGeometry(0.04, 0.04, 2.7, 12);
  pole.translate(busStop.x, 1.35, busStop.z);
  parts.push(paint(pole, 0x9aa0a6));

  // El cartel mira a lo largo de la calle (a los colectivos que llegan y a la gente
  // que camina por la vereda): dos planos espalda con espalda para que se lea de ambos lados.
  const texture = createBusStopSignTexture(config.parada.linea);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const sign = new THREE.Group();
  sign.name = 'bus-stop-sign';
  for (const direction of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.625), material);
    face.rotation.y = (direction * Math.PI) / 2;
    face.position.x = direction * 0.012;
    sign.add(face);
  }
  // Montado al costado del poste (del lado de la vereda) con abrazaderas, como las
  // paradas reales: si estuviera centrado, el caño lo atravesaría.
  const signZ = busStop.z + SIGN_OFFSET_Z;
  sign.position.set(busStop.x, 2.4, signZ);
  // Plaquita de chapa detrás del cartel.
  parts.push(paint(box(0.02, 0.66, 0.54, busStop.x, 2.4, signZ), 0x5a5f65));
  for (const y of [2.2, 2.6]) {
    parts.push(
      paint(box(0.05, 0.04, SIGN_OFFSET_Z, busStop.x, y, busStop.z + SIGN_OFFSET_Z / 2), 0x5a5f65),
    );
  }
  return sign;
}

function buildGrass() {
  const texture = createWetGrassTexture();
  texture.repeat.set(56, 15);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const depth = 40;
  const group = new THREE.Group();
  group.name = 'grass';
  for (const side of [1, -1]) {
    const geo = new THREE.PlaneGeometry(street.length, depth);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, side * (sidewalk.farZ + depth / 2));
    group.add(new THREE.Mesh(geo, material));
  }
  return group;
}

/** Cajas de colisión: la vereda es la zona caminable y lo demás la rodea. */
function buildObstacles() {
  const obstacles = [];
  const add = (minX, minZ, maxX, maxZ) =>
    obstacles.push(
      new THREE.Box3(new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(maxX, 3, maxZ)),
    );

  // Cordón (no se baja a la calle) y los extremos de la cuadra.
  add(-80, sidewalk.nearZ - 1, 80, sidewalk.nearZ);
  add(walkableX.min - 1, sidewalk.nearZ, walkableX.min, sidewalk.farZ);
  add(walkableX.max, sidewalk.nearZ, walkableX.max + 1, sidewalk.farZ);

  // Cerco de los jardines, abierto en el portón de la casa del estudiante.
  const gateHalf = home.gateWidth / 2;
  const fenceMaxZ = sidewalk.farZ + 0.12;
  const gatePostHalf = 0.07; // los postes del portón son más gruesos que el cerco
  add(-80, sidewalk.farZ, home.x - gateHalf + gatePostHalf, fenceMaxZ);
  add(home.x + gateHalf - gatePostHalf, sidewalk.farZ, 80, fenceMaxZ);

  // Jardín de la casa: cercos laterales y la fachada.
  const lotMinX = home.x - home.lotHalfWidth;
  const lotMaxX = home.x + home.lotHalfWidth;
  add(lotMinX - 0.1, sidewalk.farZ, lotMinX, housesFrontZ);
  add(lotMaxX, sidewalk.farZ, lotMaxX + 0.1, housesFrontZ);
  add(lotMinX - 0.1, housesFrontZ, lotMaxX + 0.1, housesFrontZ + 1);

  const addPost = (x, z, half) => add(x - half, z - half, x + half, z + half);
  addPost(busStop.x, busStop.z, 0.06);
  for (const lamp of lampPosts) if (lamp.z > 0) addPost(lamp.x, lamp.z, 0.08);
  for (const tree of sidewalkTrees) addPost(tree.x, tree.z, 0.18 * tree.scale);
  add(BENCH.x - BENCH.halfLength, BENCH.minZ, BENCH.x + BENCH.halfLength, BENCH.maxZ);
  addPost(SIGN.x, SIGN.z, 0.05);
  addPost(MAILBOX.x, MAILBOX.z, 0.2);
  for (const x of HOME_SHRUBS) addPost(x, housesFrontZ - 0.7, 0.45);
  return obstacles;
}

/**
 * Arma la cuadra. La calle y las veredas son superficies mojadas que reflejan, cada una
 * en su plano (`reflections.street` a la altura de la calzada, `reflections.sidewalk` a
 * la de la vereda).
 */
export function buildStreetScene(reflections) {
  const group = new THREE.Group();
  group.name = 'street-scene';

  const road = reflections.street.createSurface(buildRoad(), {
    reflectivity: 0.8,
    minReflect: 0.08,
    darken: 0.72,
    streak: 0.07,
    distortion: 0.008,
  });
  road.name = 'wet-road';
  const sidewalks = reflections.sidewalk.createSurface(buildSidewalks(), {
    reflectivity: 0.3,
    minReflect: 0.03,
    darken: 0.7,
    streak: 0.04,
    distortion: 0.014,
  });
  sidewalks.name = 'wet-sidewalks';
  group.add(road, sidewalks, buildLampGlows());

  const random = seededRandom(11);
  const parts = [];
  buildFences(parts);
  buildHouses(parts, random);
  buildYards(parts, random);
  buildBackground(parts, random);
  buildStreetFurniture(parts);
  const cables = buildUtilities(parts);
  for (const tree of [...YARD_TREES, ...sidewalkTrees]) addTree(parts, tree);
  for (const lamp of lampPosts) addLampPost(parts, lamp);
  const sign = buildBusStopPole(parts);

  group.add(mergeParts(parts, 'street-landscape'), buildGrass(), sign, cables);
  return { group, obstacles: buildObstacles() };
}
