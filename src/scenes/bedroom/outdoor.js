import * as THREE from 'three';
import { config } from '../../config.js';
import { room } from './roomLayout.js';
import { createWetGrassTexture } from '../../utils/textures.js';
import { paint, box, mergeParts, mergePartsGeometry, seededRandom } from '../../world/lowPoly.js';
import { addHouse, addTree, addLampPost, addFence } from '../../world/buildings.js';
import { buildSky, buildRain } from '../../world/weather.js';
import { WetReflection } from '../../world/wetReflection.js';
import { createGlowMaterial, addGlow } from '../../world/glow.js';

/**
 * Paisaje exterior que se ve por la ventana (pared norte, z negativo): día nublado
 * con lluvia. Calle, veredas, casas de enfrente, árboles, cerros difusos y el cielo.
 *
 * Usa las piezas low-poly compartidas de src/world (sombreado horneado, sin luces):
 * las luces de la escena están pensadas para el interior y no iluminarían bien las
 * fachadas que miran a la habitación.
 * La calzada está mojada: refleja el paisaje (WetReflection) y los faroles tienen halo.
 */

const GROUND_Y = -0.3;
const ROAD_Y = GROUND_Y + 0.02;
const STREET_Z = -10;
const STREET_DEPTH = 5.5;
const LAMP_XS = [-6, 6.5];
// Muro norte exterior: la lluvia y el paisaje arrancan del otro lado.
const WALL_OUTER_Z = -(room.depth / 2 + room.wallThickness);

/** Calzada con la línea central: la parte mojada que refleja. */
function buildRoad() {
  const length = 80;
  const parts = [];
  const asphalt = new THREE.PlaneGeometry(length, STREET_DEPTH);
  asphalt.rotateX(-Math.PI / 2);
  asphalt.translate(0, ROAD_Y, STREET_Z);
  parts.push(paint(asphalt, 0x34393e));
  // Línea central discontinua.
  for (let x = -38; x <= 38; x += 4) {
    parts.push(paint(box(1.6, 0.01, 0.12, x, GROUND_Y + 0.03, STREET_Z), 0xc9c4b0));
  }
  return mergePartsGeometry(parts);
}

function buildStreet(parts) {
  const streetZ = STREET_Z;
  const streetDepth = STREET_DEPTH;
  const length = 80;

  // Veredas con cordón a ambos lados de la calle.
  for (const side of [-1, 1]) {
    const z = streetZ + side * (streetDepth / 2 + 0.8);
    parts.push(paint(box(length, 0.12, 1.6, 0, GROUND_Y + 0.06, z), 0x767b80));
  }

  // Faroles sobre la vereda de este lado, con la lámpara prendida (día oscuro).
  for (const x of LAMP_XS) {
    addLampPost(parts, { x, z: streetZ + streetDepth / 2 + 0.5, groundY: GROUND_Y, armDirZ: -1 });
  }
}

function buildLampGlows() {
  const group = new THREE.Group();
  group.name = 'lamp-glows';
  const material = createGlowMaterial(0xffd9a0, 0.75);
  const lampZ = STREET_Z + STREET_DEPTH / 2 + 0.5 - 0.85;
  for (const x of LAMP_XS) addGlow(group, material, x, GROUND_Y + 4.0, lampZ, 1.8);
  return group;
}

function buildHouses(parts) {
  const houses = [
    { x: -16, width: 4.6, floors: 1, color: 0x9c8f86 },
    { x: -10.5, width: 5.0, floors: 2, color: 0xb9a58c },
    { x: -5, width: 4.4, floors: 1, color: 0x8f9aa3 },
    { x: 0.5, width: 5.2, floors: 2, color: 0xc4b9a3 },
    { x: 6, width: 4.2, floors: 1, color: 0xa88c7a },
    { x: 11.5, width: 5.0, floors: 2, color: 0x7f8a7c },
    { x: 17, width: 4.6, floors: 1, color: 0xb0a89c },
  ];
  // Semilla fija para que las ventanas encendidas no cambien entre recargas.
  const random = seededRandom(7);
  for (const house of houses) {
    addHouse(parts, { ...house, frontZ: -14.2, facing: 1, groundY: GROUND_Y, random });
  }
}

function buildTrees(parts) {
  const trees = [
    { x: -4.4, z: -4.3, type: 'round', scale: 1.1 },
    { x: 4.0, z: -4.9, type: 'pine', scale: 1.0 },
    { x: -13.2, z: -13.6, type: 'round', scale: 1.2 },
    { x: -2.3, z: -13.8, type: 'pine', scale: 1.3 },
    { x: 8.8, z: -13.7, type: 'round', scale: 1.0 },
    { x: 14.5, z: -22, type: 'pine', scale: 1.6 },
    { x: -7.5, z: -23, type: 'pine', scale: 1.5 },
    { x: 3.5, z: -24, type: 'round', scale: 1.7 },
  ];
  for (const tree of trees) addTree(parts, { ...tree, groundY: GROUND_Y });
}

function buildHills(parts) {
  // Siluetas lejanas: la niebla las lleva casi al color del horizonte.
  const hills = [
    { x: -18, z: -32, sx: 16, sy: 5 },
    { x: 6, z: -34, sx: 20, sy: 6.5 },
    { x: 26, z: -30, sx: 12, sy: 4 },
  ];
  for (const hill of hills) {
    const geo = new THREE.SphereGeometry(1, 16, 8);
    geo.scale(hill.sx, hill.sy, 7);
    geo.translate(hill.x, GROUND_Y - 0.5, hill.z);
    parts.push(paint(geo, 0x5d6b5f));
  }
}

function buildGround() {
  const geo = new THREE.PlaneGeometry(80, 80);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, GROUND_Y, 0);
  const ground = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: createWetGrassTexture() }));
  ground.name = 'ground';
  return ground;
}

export function buildOutdoor() {
  const group = new THREE.Group();
  group.name = 'outdoor';

  const parts = [];
  buildStreet(parts);
  addFence(parts, { fromX: -15, toX: 15, z: -6.2, groundY: GROUND_Y });
  buildHouses(parts);
  buildTrees(parts);
  buildHills(parts);
  const landscape = mergeParts(parts, 'landscape');

  // Más gotas cerca de la ventana, que es donde se distinguen.
  const nearZ = WALL_OUTER_Z - 0.2;
  const rain = buildRain({
    area: { minX: -12, maxX: 12, minY: GROUND_Y, maxY: 9, minZ: nearZ - 22, maxZ: nearZ },
    zBias: 1.6,
  });

  const reflection = new WetReflection({ y: ROAD_Y });
  const road = reflection.createSurface(buildRoad(), {
    reflectivity: 0.8,
    minReflect: 0.08,
    darken: 0.72,
    streak: 0.07,
    distortion: 0.008,
  });
  road.name = 'wet-road';

  group.add(
    buildSky(config.exterior.radioCielo),
    buildGround(),
    landscape,
    road,
    buildLampGlows(),
    rain.mesh,
  );

  return {
    group,
    reflection,
    update(delta) {
      rain.update(delta);
    },
  };
}
