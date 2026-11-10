import * as THREE from 'three';
import { config } from '../../config.js';
import { room } from './roomLayout.js';
import { createWetGrassTexture } from '../../utils/textures.js';
import { paint, box, mergeParts, mergePartsGeometry, seededRandom } from '../../world/lowPoly.js';
import {
  addHouse,
  addTree,
  addLampPost,
  addFence,
  addApartmentBlock,
  addShrub,
  addUtilityPole,
  buildCables,
  addTrashBin,
} from '../../world/buildings.js';
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
 * Detrás de las casas de enfrente, edificios de departamentos entre la niebla.
 */

const GROUND_Y = -0.3;
const ROAD_Y = GROUND_Y + 0.02;
const STREET_Z = -10;
const STREET_DEPTH = 5.5;
const LAMP_XS = [-6, 6.5];
const HOUSES_FRONT_Z = -14.2;
/** Vereda de enfrente, junto al cordón: postes de luz con cables. */
const POLE_Z = STREET_Z - STREET_DEPTH / 2 - 0.35;
const POLE_XS = [-32, -12, 8, 28];
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

function buildHouses(parts, random) {
  const houses = [
    { x: -16, width: 4.6, floors: 1, color: 0x9c8f86 },
    { x: -10.5, width: 5.0, floors: 2, color: 0xb9a58c },
    { x: -5, width: 4.4, floors: 1, color: 0x8f9aa3 },
    { x: 0.5, width: 5.2, floors: 2, color: 0xc4b9a3 },
    { x: 6, width: 4.2, floors: 1, color: 0xa88c7a },
    { x: 11.5, width: 5.0, floors: 2, color: 0x7f8a7c },
    { x: 17, width: 4.6, floors: 1, color: 0xb0a89c },
  ];
  for (const house of houses) {
    addHouse(parts, { ...house, frontZ: HOUSES_FRONT_Z, facing: 1, groundY: GROUND_Y, random });
  }
  // Arbustos entre casa y casa, y algunos de este lado junto al cerco.
  const shrubs = [
    { x: -13.35, z: -14.9, scale: 1.3 },
    { x: -7.6, z: -14.9, scale: 1.1 },
    { x: -2.45, z: -14.9, scale: 1.4 },
    { x: 3.5, z: -14.9, scale: 1.2 },
    { x: 8.55, z: -14.9, scale: 1.3 },
    { x: 14.35, z: -14.9, scale: 1.1 },
    { x: -8, z: -5.4, scale: 1.0 },
    { x: -3, z: -5.5, scale: 1.2 },
    { x: 2.6, z: -5.6, scale: 0.9 },
    { x: 7.5, z: -5.4, scale: 1.1 },
  ];
  for (const shrub of shrubs) addShrub(parts, { ...shrub, groundY: GROUND_Y });
  addTrashBin(parts, { x: -7.9, z: -13.1, groundY: GROUND_Y });

  // Edificios de departamentos detrás de las casas.
  const blocks = [
    { x: -14, width: 14, floors: 5, color: 0x8f8a84 },
    { x: 2, width: 12, floors: 6, color: 0x9a948c },
    { x: 16, width: 12, floors: 5, color: 0x8c8f93 },
  ];
  for (const block of blocks) {
    addApartmentBlock(parts, { ...block, z: -27, facing: 1, groundY: GROUND_Y, random });
  }
}

/** Postes de luz de la vereda de enfrente, con cables entre sí y bajadas a dos casas. */
function buildUtilities(parts) {
  const poles = POLE_XS.map((x) => addUtilityPole(parts, { x, z: POLE_Z, groundY: GROUND_Y }));
  const spans = [];
  for (let i = 0; i + 1 < poles.length; i += 1) {
    for (let w = 0; w < 3; w += 1) spans.push([poles[i][w], poles[i + 1][w]]);
  }
  spans.push([poles[1][1], new THREE.Vector3(-9.3, GROUND_Y + 5.2, HOUSES_FRONT_Z)]);
  spans.push([poles[2][1], new THREE.Vector3(7.2, GROUND_Y + 2.7, HOUSES_FRONT_Z)]);
  return buildCables(spans);
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

  // Semilla fija para que las ventanas encendidas (y los techos) no cambien entre recargas.
  const random = seededRandom(7);
  const parts = [];
  buildStreet(parts);
  addFence(parts, { fromX: -15, toX: 15, z: -6.2, groundY: GROUND_Y });
  buildHouses(parts, random);
  buildTrees(parts);
  buildHills(parts);
  const cables = buildUtilities(parts);
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
    cables,
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
