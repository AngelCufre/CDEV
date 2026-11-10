import * as THREE from 'three';
import { paint, box, seededRandom } from '../../world/lowPoly.js';
import { facade } from './buildKit.js';
import { createPanel, createWayfindingSign } from './signs.js';
import {
  wallBox,
  addFloorTiles,
  addTube,
  classroomDoor,
  doubleDoor,
  corkBoard,
  wallSign,
  hangingSign,
  WAINSCOT,
  WAINSCOT_HEIGHT,
  CEILING,
  FRAME,
  WOOD,
} from './interiorKit.js';
import {
  STORY_HEIGHT,
  CEILING_HEIGHT,
  WALL_THICKNESS,
  corridor,
  bridgeOpening,
  classroomDoors,
  endDoor,
  coreDoorZ,
  emergencyCore,
} from './layout.js';

/**
 * El pasillo del 1° piso del Edificio Central, por dentro: ventanales al patio (los vidrios
 * y parantes son de la fachada), las aulas 201 a 208 del lado este, la doble puerta del
 * aula 209 al fondo (sur) y los baños en la otra punta. Se llega por el puente desde la
 * torre vidriada: es un desvío, el aula 411 está en el edificio de vidrio.
 */

const HALF_WALL = WALL_THICKNESS / 2;
const FLOOR_Y = STORY_HEIGHT;
const CEILING_Y = STORY_HEIGHT + CEILING_HEIGHT;
const SILL_Y = FLOOR_Y + 0.8; // antepecho de los ventanales
const OPENING_TOP = FLOOR_Y + 2.6; // dintel de la abertura del puente
const CX = (corridor.minX + corridor.maxX) / 2;
const WEST_FACE = corridor.minX + HALF_WALL; // cara interior de la pared de los ventanales
const EAST_FACE = corridor.maxX - HALF_WALL; // cara interior de la pared de las aulas
const SOUTH_FACE = corridor.maxZ - HALF_WALL;
const NORTH_FACE = corridor.minZ + HALF_WALL;

function buildWalls(ctx) {
  const { minX, maxX, minZ, maxZ } = corridor;
  const west0 = minX - HALF_WALL;
  const west1 = minX + HALF_WALL;

  // Pared de los ventanales: antepecho y dintel, con la abertura del puente.
  for (const [z0, z1] of [
    [minZ, bridgeOpening.minZ],
    [bridgeOpening.maxZ, emergencyCore.minZ],
  ]) {
    wallBox(ctx, west0, z0, west1, z1, FLOOR_Y, SILL_Y);
    wallBox(ctx, west1, z0, west1 + 0.02, z1, FLOOR_Y, SILL_Y - 0.05, WAINSCOT);
    wallBox(ctx, west0 + 0.05, z0, west1 + 0.16, z1, SILL_Y, SILL_Y + 0.04, 0xcfc8b8);
    ctx.block(1, west0, z0, west1, z1);
  }
  wallBox(ctx, west0, minZ, west1, emergencyCore.minZ, CEILING_Y - 0.2, CEILING_Y);
  wallBox(ctx, west0, bridgeOpening.minZ, west1, bridgeOpening.maxZ, OPENING_TOP, CEILING_Y);
  // Umbral y marco de la abertura del puente.
  wallBox(
    ctx,
    west0,
    bridgeOpening.minZ,
    west1,
    bridgeOpening.maxZ,
    FLOOR_Y - 0.05,
    FLOOR_Y + 0.012,
    0x8d8a84,
  );
  for (const z of [bridgeOpening.minZ, bridgeOpening.maxZ]) {
    wallBox(ctx, west0 - 0.05, z - 0.05, west1 + 0.05, z + 0.05, FLOOR_Y, OPENING_TOP, FRAME);
  }
  // Tramo contra la torre de hormigón: pared entera con la puerta de emergencia.
  wallBox(ctx, west0, emergencyCore.minZ, west1, maxZ, FLOOR_Y, CEILING_Y);
  wallBox(
    ctx,
    west1,
    emergencyCore.minZ,
    west1 + 0.02,
    maxZ,
    FLOOR_Y,
    FLOOR_Y + WAINSCOT_HEIGHT,
    WAINSCOT,
  );
  ctx.block(1, west0, emergencyCore.minZ, west1, maxZ);

  // Pared de las aulas y las dos puntas.
  const east0 = maxX - HALF_WALL;
  const east1 = maxX + HALF_WALL;
  wallBox(ctx, east0, minZ, east1, maxZ, FLOOR_Y, CEILING_Y);
  wallBox(ctx, east0 - 0.02, minZ, east0, maxZ, FLOOR_Y, FLOOR_Y + WAINSCOT_HEIGHT, WAINSCOT);
  ctx.block(1, east0, minZ, east1, maxZ);
  for (const [z, inward] of [
    [minZ, 1],
    [maxZ, -1],
  ]) {
    wallBox(ctx, west0, z - HALF_WALL, east1, z + HALF_WALL, FLOOR_Y, CEILING_Y);
    const face = z + inward * HALF_WALL;
    const [a, b] = [face, face + inward * 0.02].sort((p, q) => p - q);
    wallBox(ctx, west1, a, east0, b, FLOOR_Y, FLOOR_Y + WAINSCOT_HEIGHT, WAINSCOT);
    ctx.block(1, west0, z - HALF_WALL, east1, z + HALF_WALL);
  }

  // Cielorraso, tubos y piso.
  wallBox(ctx, west1, minZ, east0, maxZ, CEILING_Y - 0.01, CEILING_Y, CEILING);
  for (let z = minZ + 2; z < maxZ - 1; z += 3) addTube(ctx, CX, CEILING_Y, z);
  addFloorTiles(ctx, { minX: west1, maxX: east0, minZ: NORTH_FACE, maxZ: SOUTH_FACE }, FLOOR_Y);
}

function buildDoors(ctx, random) {
  const east = facade('x-', EAST_FACE);
  ctx.hitboxes.centralClassrooms = classroomDoors.map(({ number, z }) => ({
    number,
    mesh: classroomDoor(ctx, east, z, FLOOR_Y, { number, random }),
  }));
  for (const z of [-8.5, -22.5, -44.8]) corkBoard(ctx, east, z, FLOOR_Y, random);
  ctx.hitboxes.centralEndDoor = doubleDoor(ctx, facade('z-', SOUTH_FACE), -CX, FLOOR_Y, {
    label: `AULA ${endDoor.number}`,
    width: endDoor.width,
    height: endDoor.height,
  });

  // Baños, en la punta norte.
  const I = ctx.interior;
  I.push(paint(box(0.9, 2.1, 0.05, CX, FLOOR_Y + 1.05, NORTH_FACE + 0.025), 0x5f6f7a));
  I.push(paint(box(1.04, 2.16, 0.03, CX, FLOOR_Y + 1.08, NORTH_FACE + 0.012), FRAME));
  ctx.group.add(
    createWayfindingSign({
      text: 'BAÑOS',
      width: 0.8,
      x: CX,
      y: FLOOR_Y + 2.45,
      z: NORTH_FACE + 0.005,
      facing: 'z+',
    }),
  );
  // Salida de emergencia hacia la torre de hormigón.
  I.push(paint(box(0.05, 2.1, 1.0, WEST_FACE + 0.025, FLOOR_Y + 1.05, coreDoorZ), 0x5d6b62));
  I.push(paint(box(0.06, 0.05, 0.6, WEST_FACE + 0.08, FLOOR_Y + 1.0, coreDoorZ), 0x9aa0a6));
  ctx.group.add(
    createWayfindingSign({
      text: 'SALIDA DE EMERGENCIA',
      width: 1.4,
      x: WEST_FACE + 0.005,
      y: FLOOR_Y + 2.45,
      z: coreDoorZ,
      facing: 'x+',
      background: '#1e7a3c',
    }),
  );
}

function buildSignsAndProps(ctx) {
  const I = ctx.interior;
  const openingZ = (bridgeOpening.minZ + bridgeOpening.maxZ) / 2;
  // De frente a quien entra desde el puente: acá se entera de que es el Central.
  wallSign(ctx, facade('x-', EAST_FACE), openingZ, FLOOR_Y + 2.0, {
    width: 1.9,
    height: 0.8,
    header: { text: 'EDIFICIO CENTRAL', size: 0.07, background: '#f4f1e8', color: '#1d3557' },
    lines: [
      { text: '← Aulas 207 – 208 · Baños', size: 0.09, bold: true },
      { text: 'Aulas 201 – 206 · 209 →', size: 0.1, bold: true },
    ],
  });
  hangingSign(ctx, {
    x: CX,
    z: -24,
    ceilingY: CEILING_Y,
    facing: 'z-',
    front: '↑ AULAS 201 – 205 · 209',
    back: '↑ AULAS 206 – 208 · BAÑOS',
  });
  hangingSign(ctx, {
    x: CX,
    z: -6,
    ceilingY: CEILING_Y,
    facing: 'z-',
    front: '↑ AULAS 201 – 202 · 209',
    back: '↑ PUENTE A LA ESCALERA',
  });

  // Banco bajo los ventanales, matafuego, cesto y el cartel de piso mojado.
  const benchZ = -29;
  const benchX = WEST_FACE + 0.3;
  I.push(paint(box(0.42, 0.06, 2.4, benchX, FLOOR_Y + 0.45, benchZ), WOOD));
  for (const dz of [-1, 0, 1])
    I.push(paint(box(0.36, 0.42, 0.06, benchX, FLOOR_Y + 0.21, benchZ + dz), FRAME));
  ctx.block(1, WEST_FACE, benchZ - 1.2, WEST_FACE + 0.52, benchZ + 1.2);

  const extinguisher = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12);
  extinguisher.translate(EAST_FACE - 0.1, FLOOR_Y + 1.0, openingZ + 2.6);
  I.push(paint(extinguisher, 0xb3261e));
  ctx.group.add(
    createPanel({
      width: 0.2,
      height: 0.26,
      x: EAST_FACE - 0.005,
      y: FLOOR_Y + 1.55,
      z: openingZ + 2.6,
      facing: 'x-',
      background: '#b3261e',
      color: '#ffffff',
      lines: [
        { text: 'MATA', size: 0.04, bold: true },
        { text: 'FUEGO', size: 0.04, bold: true },
      ],
    }),
  );

  const bin = new THREE.CylinderGeometry(0.2, 0.17, 0.6, 12);
  bin.translate(EAST_FACE - 0.25, FLOOR_Y + 0.3, -15.5);
  I.push(paint(bin, 0x2f4a2c));
  ctx.block(1, EAST_FACE - 0.45, -15.7, EAST_FACE, -15.3);

  const cone = new THREE.ConeGeometry(0.22, 0.62, 4);
  cone.rotateY(Math.PI / 4);
  cone.translate(13.5, FLOOR_Y + 0.31, -12.6);
  I.push(paint(cone, 0xf2c230));
  ctx.block(1, 13.3, -12.8, 13.7, -12.4);
}

/** Arma el pasillo del Central en `ctx` (piezas, colisiones, cajas de interacción). */
export function buildUpperFloor(ctx) {
  const random = seededRandom(312);
  buildWalls(ctx);
  buildDoors(ctx, random);
  buildSignsAndProps(ctx);
}
