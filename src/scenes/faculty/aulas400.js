import * as THREE from 'three';
import { paint, box, seededRandom } from '../../world/lowPoly.js';
import { createBuildContext, mergeTransformed, facade, fBox, fPlane, fGlass } from './buildKit.js';
import { buildStairHall } from './stairHall.js';
import { createPanel } from './signs.js';
import {
  wallBox,
  addFloorTiles,
  addTube,
  classroomDoor,
  doubleDoor,
  stuckPaper,
  corkBoard,
  wallSign,
  hangingSign,
  WAINSCOT,
  WAINSCOT_HEIGHT,
  CEILING,
  FRAME,
} from './interiorKit.js';
import {
  STORY_HEIGHT,
  CEILING_HEIGHT,
  WALL_THICKNESS,
  aulas400,
  aulas400Placement,
} from './layout.js';

/**
 * El edificio de aulas 400, sobre Maestro López y pegado al UTN FRC: tres plantas con
 * ventanas corridas, la faja de chapa gris y el borde celeste del techo, y el hall vidriado
 * de la escalera que sobresale de la fachada hacia el patio (ahí está la entrada). Por
 * dentro: el hall (planta baja y descanso del 1° piso) y el pasillo del 1° piso con las
 * aulas 406 a 412; el aula 411, la del parcial, está al fondo, del lado de la calle.
 *
 * Todo se arma en el marco local de `aulas400` (fachada en z = 0 mirando a +z) y al final
 * se gira y se ubica con `aulas400Placement`.
 */

const WALL_COLOR = 0xdccaa2;
const BAND = 0x8a9096;
const ROOF_EDGE = 0x6c9bb8;
const GLASS_SKY = 0x8d9aa5;
const WHITE = 0xe9e7e0;

const B = aulas400.building;
const H = aulas400.hall;
const C = aulas400.corridor;
const HALF_WALL = WALL_THICKNESS / 2;
const GROUND_TOP = STORY_HEIGHT - 0.1; // techo de la planta baja (abajo de la losa)
const FLOOR_Y = STORY_HEIGHT;
const CEILING_Y = STORY_HEIGHT + CEILING_HEIGHT;
const OPENING_TOP = FLOOR_Y + 2.6;
const NORTH_FACE = C.minZ + HALF_WALL; // cara del pasillo de la pared de las aulas del norte
const SOUTH_FACE = C.maxZ - HALF_WALL;
const WEST_END = C.minX + HALF_WALL;
const EAST_END = C.maxX - HALF_WALL;

/** Caja sólida pintada entre (x0, z0) y (x1, z1), de y0 a y1. */
function solid(P, x0, z0, x1, z1, y0, y1, color = WALL_COLOR) {
  P.push(paint(box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), color));
}

function buildShell(ctx) {
  const P = ctx.parts;
  const hallBack = H.minZ + HALF_WALL; // cara del muro del fondo del hall
  // Planta baja: a los costados del hall y detrás de él.
  solid(P, B.minX, B.minZ, H.minX, B.maxZ, 0, GROUND_TOP);
  solid(P, H.maxX, B.minZ, B.maxX, B.maxZ, 0, GROUND_TOP);
  solid(P, H.minX, B.minZ, H.maxX, hallBack, 0, GROUND_TOP);
  ctx.block(0, B.minX, B.minZ, H.minX, B.maxZ);
  ctx.block(0, H.maxX, B.minZ, B.maxX, B.maxZ);
  ctx.block(0, H.minX, B.minZ, H.maxX, hallBack);
  // 1° piso: las aulas del norte y las del sur (el pasillo y el hall quedan libres).
  const upperTop = CEILING_Y;
  solid(P, B.minX, B.minZ, B.maxX, C.minZ - HALF_WALL, GROUND_TOP, upperTop);
  solid(P, B.minX, C.maxZ + HALF_WALL, H.minX, B.maxZ, GROUND_TOP, upperTop);
  solid(P, H.maxX, C.maxZ + HALF_WALL, B.maxX, B.maxZ, GROUND_TOP, upperTop);
  // 2° piso entero (salvo el hall), con la faja gris y el borde celeste del techo.
  solid(P, B.minX, B.minZ, H.minX, B.maxZ, upperTop, B.height);
  solid(P, H.maxX, B.minZ, B.maxX, B.maxZ, upperTop, B.height);
  solid(P, H.minX, B.minZ, H.maxX, hallBack, upperTop, B.height);
  solid(
    P,
    B.minX - 0.15,
    B.minZ - 0.15,
    B.maxX + 0.15,
    B.maxZ + 0.15,
    B.height,
    B.height + 1,
    BAND,
  );
  solid(
    P,
    B.minX - 0.3,
    B.minZ - 0.3,
    B.maxX + 0.3,
    B.maxZ + 0.3,
    B.height + 1,
    B.height + 1.25,
    ROOF_EDGE,
  );

  // Ventanas corridas en la fachada (a los dos lados del hall) y en las puntas.
  const south = facade('z+', B.maxZ);
  for (const [x0, x1] of [
    [B.minX + 0.4, H.minX - 0.4],
    [H.maxX + 0.4, B.maxX - 0.4],
  ]) {
    for (let floor = 0; floor < 3; floor += 1) {
      const v = floor * STORY_HEIGHT + 1.9;
      fPlane(P, south, (x0 + x1) / 2, v, 0.01, x1 - x0, 1.2, GLASS_SKY);
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.round((x1 - x0) / 1.15)) {
        fBox(P, south, x, v, 0.03, 0.06, 1.2, 0.06, WHITE);
      }
      fBox(P, south, (x0 + x1) / 2, v - 0.68, 0.06, x1 - x0 + 0.3, 0.08, 0.14, WHITE);
    }
  }
  for (const [facing, at] of [
    ['x-', B.minX],
    ['x+', B.maxX],
  ]) {
    const f = facade(facing, at);
    const sign = facing === 'x-' ? 1 : -1;
    for (const floor of [0, 2]) {
      fPlane(P, f, sign * -7, floor * STORY_HEIGHT + 1.9, 0.01, 11, 1.2, GLASS_SKY);
    }
  }

  // Cartel sobre la puerta del hall.
  ctx.group.add(
    createPanel({
      width: 2.2,
      height: 0.42,
      x: (aulas400.hallDoor.minX + aulas400.hallDoor.maxX) / 2,
      y: 2.95,
      z: H.maxZ + 0.06,
      facing: 'z+',
      fog: true,
      background: '#1d3557',
      color: '#ffffff',
      lines: [
        { text: 'EDIFICIO DE AULAS', size: 0.1, bold: true },
        { text: 'Aulas 401 – 412', size: 0.085 },
      ],
    }),
  );
}

/** El fondo del hall en planta baja: la pared con la puerta a las aulas de abajo. */
function buildLobby(ctx) {
  const hallBack = facade('z+', H.minZ + HALF_WALL);
  const I = ctx.interior;
  wallBox(
    ctx,
    H.minX + 0.1,
    H.minZ + HALF_WALL,
    H.maxX - 0.1,
    H.minZ + HALF_WALL + 0.02,
    0,
    WAINSCOT_HEIGHT,
    WAINSCOT,
  );
  ctx.hitboxes.lobby400Door = doubleDoor(ctx, hallBack, aulas400.lobbyDoorX, 0, {
    label: 'AULAS 401 – 405',
    width: 1.6,
  });
  // Cartel en el costado del depósito, de frente a quien entra.
  ctx.group.add(
    createPanel({
      width: 1.3,
      height: 0.5,
      x: aulas400.flight.maxX + 0.05,
      y: 2.55,
      z: (H.minZ + aulas400.flight.minZ) / 2,
      facing: 'x+',
      background: '#1d3557',
      color: '#ffffff',
      lines: [
        { text: '1° PISO ↑', size: 0.11, bold: true },
        { text: 'Aulas 406 – 412', size: 0.085 },
      ],
    }),
  );
  // Banco y un cesto en el hall.
  I.push(paint(box(1.6, 0.06, 0.42, 2.6, 0.45, -3.6), 0x6b5a48));
  for (const dx of [-0.65, 0.65]) I.push(paint(box(0.06, 0.42, 0.36, 2.6 + dx, 0.21, -3.6), FRAME));
  ctx.block(0, 1.75, -3.85, 3.45, -3.35);
}

function buildCorridor(ctx, random) {
  const { minX, maxX, minZ, maxZ } = C;
  const north0 = minZ - HALF_WALL;
  const north1 = minZ + HALF_WALL;
  const south0 = maxZ - HALF_WALL;
  const south1 = maxZ + HALF_WALL;

  // Pared norte (las aulas 407 a 411).
  wallBox(ctx, minX, north0, maxX, north1, FLOOR_Y, CEILING_Y);
  wallBox(
    ctx,
    WEST_END,
    north1,
    EAST_END,
    north1 + 0.02,
    FLOOR_Y,
    FLOOR_Y + WAINSCOT_HEIGHT,
    WAINSCOT,
  );
  ctx.block(1, minX, north0, maxX, north1);
  // Pared sur, con la abertura al hall de la escalera.
  const { minX: gap0, maxX: gap1 } = aulas400.hallOpening;
  for (const [x0, x1] of [
    [minX, gap0],
    [gap1, maxX],
  ]) {
    wallBox(ctx, x0, south0, x1, south1, FLOOR_Y, CEILING_Y);
    wallBox(
      ctx,
      Math.max(x0, WEST_END),
      south0 - 0.02,
      Math.min(x1, EAST_END),
      south0,
      FLOOR_Y,
      FLOOR_Y + WAINSCOT_HEIGHT,
      WAINSCOT,
    );
    ctx.block(1, x0, south0, x1, south1);
  }
  wallBox(ctx, gap0, south0, gap1, south1, OPENING_TOP, CEILING_Y);
  wallBox(ctx, gap0, south0, gap1, south1, FLOOR_Y - 0.05, FLOOR_Y + 0.012, 0x8d8a84);
  for (const x of [gap0, gap1]) {
    wallBox(ctx, x - 0.05, south0 - 0.05, x + 0.05, south1 + 0.05, FLOOR_Y, OPENING_TOP, FRAME);
  }
  // Las puntas, con una ventana cada una.
  for (const x of [minX, maxX]) {
    const inward = x === minX ? 1 : -1;
    const x0 = x - HALF_WALL;
    const x1 = x + HALF_WALL;
    wallBox(ctx, x0, north0, x1, south1, FLOOR_Y, FLOOR_Y + 0.9);
    wallBox(ctx, x0, north0, x1, south1, FLOOR_Y + 2.5, CEILING_Y);
    for (const z of [north1 + 0.3, south0 - 0.3]) {
      wallBox(ctx, x0, z - 0.3, x1, z + 0.3, FLOOR_Y + 0.9, FLOOR_Y + 2.5);
    }
    const f = facade(inward > 0 ? 'x-' : 'x+', x);
    fGlass(
      ctx,
      f,
      inward > 0 ? (minZ + maxZ) / 2 : -(minZ + maxZ) / 2,
      FLOOR_Y + 1.7,
      0,
      maxZ - minZ - 1.4,
      1.6,
    );
    ctx.block(1, x0, north0, x1, south1);
  }

  // Cielorraso, tubos y piso.
  wallBox(ctx, WEST_END, NORTH_FACE, EAST_END, SOUTH_FACE, CEILING_Y - 0.01, CEILING_Y, CEILING);
  for (let x = minX + 2; x < maxX - 1; x += 3) addTube(ctx, x, CEILING_Y, (minZ + maxZ) / 2, false);
  addFloorTiles(
    ctx,
    { minX: WEST_END, maxX: EAST_END, minZ: NORTH_FACE, maxZ: SOUTH_FACE },
    FLOOR_Y,
  );

  // Puertas de las aulas (u = x en la pared norte, u = -x en la sur).
  const north = facade('z+', NORTH_FACE);
  const south = facade('z-', SOUTH_FACE);
  const onWall = (side) => (side < 0 ? [north, 1] : [south, -1]);
  ctx.hitboxes.aulas400Classrooms = aulas400.classrooms.map(({ number, x, side }) => {
    const [f, sign] = onWall(side);
    return { number, mesh: classroomDoor(ctx, f, sign * x, FLOOR_Y, { number, random }) };
  });
  const { aula411 } = aulas400;
  const [f411, sign411] = onWall(aula411.side);
  ctx.hitboxes.aula411 = classroomDoor(ctx, f411, sign411 * aula411.x, FLOOR_Y, {
    number: aula411.number,
    random,
    lit: true,
  });
  stuckPaper(ctx, f411, sign411 * aula411.x + 0.12, FLOOR_Y + 1.6, [
    { text: 'PARCIAL', size: 0.035, bold: true, color: '#b3261e' },
    { text: 'Diseño de Sistemas 3K5', size: 0.02 },
    { text: 'NO PASAR', size: 0.028, bold: true },
  ]);
  for (const x of [-7.85, 3.3]) corkBoard(ctx, north, x, FLOOR_Y, random);
  corkBoard(ctx, south, 6.5, FLOOR_Y, random);

  // Carteles: frente a la abertura y uno colgado a cada lado.
  wallSign(ctx, north, (aulas400.hallOpening.minX + aulas400.hallOpening.maxX) / 2, FLOOR_Y + 2.0, {
    width: 1.9,
    height: 0.62,
    lines: [
      { text: '← Aulas 406 – 408', size: 0.1, bold: true },
      { text: 'Aulas 409 – 412 →', size: 0.1, bold: true },
    ],
  });
  hangingSign(ctx, {
    x: 3.6,
    z: (minZ + maxZ) / 2,
    ceilingY: CEILING_Y,
    facing: 'x-',
    front: '↑ AULAS 410 – 412',
    back: '↑ ESCALERA · 406 – 409',
  });
  hangingSign(ctx, {
    x: -7.4,
    z: (minZ + maxZ) / 2,
    ceilingY: CEILING_Y,
    facing: 'x+',
    front: '↑ AULAS 406 – 407',
    back: '↑ ESCALERA · 408 – 412',
  });

  // Del lado del hall, sobre la abertura.
  ctx.group.add(
    createPanel({
      width: 1.6,
      height: 0.34,
      x: (gap0 + gap1) / 2,
      y: OPENING_TOP + 0.3,
      z: south1 + 0.01,
      facing: 'z+',
      background: '#1d3557',
      color: '#ffffff',
      lines: [{ text: 'AULAS 406 – 412', size: 0.12, bold: true }],
    }),
  );
}

/**
 * Arma el edificio de aulas 400 (afuera, el hall de la escalera y el pasillo del 1° piso)
 * en su marco local y lo suma a `ctx` girado y ubicado.
 */
export function buildAulas400(ctx) {
  const local = createBuildContext(new THREE.Group());
  local.group.name = 'aulas-400';
  const random = seededRandom(411);
  buildShell(local);
  buildStairHall(local, {
    rect: H,
    height: H.height,
    flight: aulas400.flight,
    door: aulas400.hallDoor,
    opening: { face: 'z-', from: aulas400.hallOpening.minX, to: aulas400.hallOpening.maxX },
    skipFaces: ['z-'],
    sideGlassFromZ: B.maxZ,
  });
  buildLobby(local);
  buildCorridor(local, random);
  mergeTransformed(ctx, local, aulas400Placement);
}
