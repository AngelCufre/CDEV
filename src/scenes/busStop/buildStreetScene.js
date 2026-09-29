import * as THREE from 'three';
import { config } from '../../config.js';
import { createWetGrassTexture, createBusStopSignTexture } from '../../utils/textures.js';
import { paint, box, mergeParts, seededRandom } from '../../world/lowPoly.js';
import { addHouse, addTree, addLampPost, addFence } from '../../world/buildings.js';
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

const YARD_TREES = [
  { x: -16, z: 7.9, type: 'round', scale: 1.2 },
  { x: -3.4, z: 8.0, type: 'pine', scale: 1.1 },
  { x: 9.8, z: 7.9, type: 'round', scale: 1.1 },
  { x: 22.7, z: 8.0, type: 'pine', scale: 1.3 },
  { x: -20.5, z: -7.9, type: 'pine', scale: 1.3 },
  { x: -7.8, z: -8.0, type: 'round', scale: 1.1 },
  { x: 5.2, z: -7.9, type: 'round', scale: 1.2 },
  { x: 17.8, z: -8.0, type: 'pine', scale: 1.2 },
];

function buildRoadAndSidewalks(parts) {
  const asphalt = new THREE.PlaneGeometry(street.length, street.halfWidth * 2);
  asphalt.rotateX(-Math.PI / 2);
  asphalt.translate(0, street.surfaceY, 0);
  parts.push(paint(asphalt, 0x2c3136));

  const half = street.length / 2;
  for (let x = -half + 3; x <= half - 3; x += 4) {
    parts.push(paint(box(1.6, 0.01, 0.12, x, street.surfaceY + 0.005, 0), 0xc9c4b0));
  }

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
}

function buildFences(parts) {
  const fenceZ = sidewalk.farZ + 0.05;
  const gateHalf = home.gateWidth / 2;
  // Este lado: con el hueco del portón de la casa del estudiante.
  addFence(parts, { fromX: -40, toX: home.x - gateHalf, z: fenceZ, railOffsetZ: -0.06 });
  addFence(parts, { fromX: home.x + gateHalf, toX: 40, z: fenceZ, railOffsetZ: -0.06 });
  // Enfrente.
  addFence(parts, { fromX: -40, toX: 40, z: -fenceZ });
}

function buildHouses(parts) {
  const random = seededRandom(11);
  for (const house of NEAR_HOUSES) {
    addHouse(parts, { ...house, frontZ: housesFrontZ, facing: -1, random });
  }
  for (const house of FAR_HOUSES) {
    addHouse(parts, { ...house, frontZ: -housesFrontZ, facing: 1, random });
  }
}

function buildBusStopPole(parts) {
  const pole = new THREE.CylinderGeometry(0.04, 0.04, 2.7, 8);
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

  // Cordón (no se baja a la calle), cerco de los jardines y los extremos de la cuadra.
  add(-80, sidewalk.nearZ - 1, 80, sidewalk.nearZ);
  add(-80, sidewalk.farZ, 80, sidewalk.farZ + 1);
  add(walkableX.min - 1, sidewalk.nearZ, walkableX.min, sidewalk.farZ);
  add(walkableX.max, sidewalk.nearZ, walkableX.max + 1, sidewalk.farZ);

  const addPost = (x, z, half) => add(x - half, z - half, x + half, z + half);
  addPost(busStop.x, busStop.z, 0.06);
  for (const lamp of lampPosts) if (lamp.z > 0) addPost(lamp.x, lamp.z, 0.08);
  for (const tree of sidewalkTrees) addPost(tree.x, tree.z, 0.18 * tree.scale);
  return obstacles;
}

export function buildStreetScene() {
  const group = new THREE.Group();
  group.name = 'street-scene';

  const parts = [];
  buildRoadAndSidewalks(parts);
  buildFences(parts);
  buildHouses(parts);
  for (const tree of [...YARD_TREES, ...sidewalkTrees]) addTree(parts, tree);
  for (const lamp of lampPosts) addLampPost(parts, lamp);
  const sign = buildBusStopPole(parts);

  group.add(mergeParts(parts, 'street-landscape'), buildGrass(), sign);
  return { group, obstacles: buildObstacles() };
}
