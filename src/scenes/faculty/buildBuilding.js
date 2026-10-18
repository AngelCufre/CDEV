import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paint, box, facadePlane, mergeParts, seededRandom } from '../../world/lowPoly.js';
import { addTree } from '../../world/buildings.js';
import {
  createRainOnGlassTexture,
  createTileFloorTexture,
  createWetGrassTexture,
} from '../../utils/textures.js';
import { createPanel, createRoomPlate, createWayfindingSign } from './signs.js';
import {
  STORY_HEIGHT,
  CEILING_HEIGHT,
  WALL_THICKNESS,
  hall,
  corridor,
  stairHall,
  flight,
  entranceDoor,
  classroomDoors,
  aula500Door,
  bedelia,
  elevator,
  directory,
  bench,
  wetFloorSign,
  bathroomDoorX,
  buildingName,
} from './layout.js';

/**
 * El edificio de la facultad (BOCETO). Como los exteriores, usa sombreado horneado en
 * vertex colors con MeshBasicMaterial: con tubos fluorescentes la luz de un pasillo es
 * pareja, y así todo lo fijo se fusiona en un solo mesh. El interior no lleva niebla
 * (`fog: false`): la niebla de la escena es solo para lo que se ve afuera por la puerta.
 */

const WALL = 0xd9d1c0;
const WAINSCOT = 0x7f8c86; // zócalo pintado
const WAINSCOT_HEIGHT = 1.1;
const CEILING = 0xe4e0d8;
const DOOR = 0x6b4f36;
const FRAME = 0x3c3f42;
const STEEL = 0x9aa0a6;
const WOOD = 0x6b5a48;
const TUBE = 0xfdf8ec;
const STEP = 0xb7b2a8;
const WINDOW_LIGHT = 0xb4bec6;
const LIT_ROOM = 0xf3dc9a;
const DARK_GLASS = 0x2f353c;
const PAPERS = [0xf5f2e8, 0xf3e48a, 0xf2b8c6, 0xbfe3f2];
const TILE_METERS = 0.8; // una repetición de la textura = 2×2 baldosas de 40 cm
const HALF_WALL = WALL_THICKNESS / 2;

const floorY = (floor) => floor * STORY_HEIGHT;

/** Caja de colisión en el plano XZ (Collision ignora la altura). */
function obstacle(minX, minZ, maxX, maxZ) {
  return new THREE.Box3(new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(maxX, 2.3, maxZ));
}

/**
 * Pared alineada a un eje de (x0, z0) a (x1, z1), con zócalo pintado. Se alarga media
 * pared en cada punta para cerrar esquinas y uniones en T.
 */
function addWall(ctx, floor, x0, z0, x1, z1) {
  const alongX = z0 === z1;
  const length = (alongX ? x1 - x0 : z1 - z0) + WALL_THICKNESS;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const y = floorY(floor);
  const [w, d] = alongX ? [length, WALL_THICKNESS] : [WALL_THICKNESS, length];
  ctx.parts.push(paint(box(w, CEILING_HEIGHT, d, cx, y + CEILING_HEIGHT / 2, cz), WALL));
  const [ww, wd] = alongX ? [length, WALL_THICKNESS + 0.03] : [WALL_THICKNESS + 0.03, length];
  ctx.parts.push(paint(box(ww, WAINSCOT_HEIGHT, wd, cx, y + WAINSCOT_HEIGHT / 2, cz), WAINSCOT));
  ctx.obstacles[floor].push(obstacle(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2));
}

/** Piso de mosaico con UVs en metros: la textura sigue igual de un tramo al otro. */
function floorTiles(area, y) {
  const geo = new THREE.PlaneGeometry(area.maxX - area.minX, area.maxZ - area.minZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate((area.minX + area.maxX) / 2, y + 0.002, (area.minZ + area.maxZ) / 2);
  const position = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < position.count; i += 1) {
    uv.setXY(i, position.getX(i) / TILE_METERS, position.getZ(i) / TILE_METERS);
  }
  return geo;
}

/** Losa entre `top - espesor` y `top`: de abajo es el cielorraso de la planta. */
function addSlab(ctx, area, top) {
  const thickness = STORY_HEIGHT - CEILING_HEIGHT;
  const w = area.maxX - area.minX;
  const d = area.maxZ - area.minZ;
  ctx.parts.push(
    paint(box(w, thickness, d, area.minX + w / 2, top - thickness / 2, area.minZ + d / 2), CEILING),
  );
}

/** Tubo fluorescente (prendido) en el cielorraso de una planta. */
function addTube(ctx, floor, x, z) {
  const y = floorY(floor) + CEILING_HEIGHT;
  ctx.parts.push(paint(box(1.3, 0.05, 0.22, x, y - 0.025, z), 0xcfd2d4));
  ctx.parts.push(paint(box(1.2, 0.03, 0.12, x, y - 0.06, z), TUBE, { shaded: false }));
}

/** Viga sobre una abertura del pasillo (de ahí cuelgan los carteles). */
function addBeam(ctx, floor, x) {
  const height = 0.45;
  const y = floorY(floor) + CEILING_HEIGHT - height / 2;
  ctx.parts.push(paint(box(WALL_THICKNESS, height, corridor.maxZ - corridor.minZ, x, y, 0), WALL));
  return y;
}

/** Baranda recta (pasamanos, travesaño y parantes) de (x0, z0) a (x1, z1) a la altura `y`. */
function addRailing(ctx, y, x0, z0, x1, z1) {
  const alongX = z0 === z1;
  const length = alongX ? x1 - x0 : z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  for (const [height, size] of [
    [0.9, 0.05],
    [0.45, 0.03],
  ]) {
    const [w, d] = alongX ? [length, size] : [size, length];
    ctx.parts.push(paint(box(w, size, d, cx, y + height, cz), FRAME));
  }
  const posts = Math.max(2, Math.round(length / 1.1) + 1);
  for (let i = 0; i < posts; i += 1) {
    const t = i / (posts - 1);
    const px = alongX ? x0 + t * length : x0;
    const pz = alongX ? z0 : z0 + t * length;
    ctx.parts.push(paint(box(0.04, 0.9, 0.04, px, y + 0.45, pz), FRAME));
  }
}

// ---------- Cáscara: paredes, losas, pisos y luces ----------

/** Las tres partes del piso del 1° piso en el hall de la escalera (sin el hueco). */
function upperStairHallAreas() {
  return [
    { minX: stairHall.minX, maxX: stairHall.maxX, minZ: stairHall.minZ, maxZ: flight.minZ },
    { minX: stairHall.minX, maxX: flight.minX, minZ: flight.minZ, maxZ: stairHall.maxZ },
    { minX: flight.maxX, maxX: stairHall.maxX, minZ: flight.minZ, maxZ: stairHall.maxZ },
  ];
}

function buildShell(ctx) {
  const upperStair = upperStairHallAreas();

  // Pisos de mosaico, losa entre plantas y techo.
  for (const area of [hall, corridor, stairHall]) ctx.floorGeos.push(floorTiles(area, 0));
  for (const area of [corridor, ...upperStair]) ctx.floorGeos.push(floorTiles(area, STORY_HEIGHT));
  for (const area of [hall, corridor, ...upperStair]) addSlab(ctx, area, STORY_HEIGHT);
  for (const area of [corridor, stairHall]) addSlab(ctx, area, 2 * STORY_HEIGHT);

  // Hall (solo planta baja; arriba está el aula 500). La pared de la calle tiene la puerta.
  addWall(ctx, 0, hall.minX, hall.minZ, hall.minX, entranceDoor.minZ);
  addWall(ctx, 0, hall.minX, entranceDoor.maxZ, hall.minX, hall.maxZ);
  addWall(ctx, 0, hall.minX, hall.maxZ, hall.maxX, hall.maxZ);
  addWall(ctx, 0, hall.minX, hall.minZ, hall.maxX, hall.minZ);
  addWall(ctx, 0, hall.maxX, hall.minZ, hall.maxX, corridor.minZ);
  addWall(ctx, 0, hall.maxX, corridor.maxZ, hall.maxX, hall.maxZ);
  // Frente del aula 500, al final del pasillo del 1° piso.
  addWall(ctx, 1, corridor.minX, corridor.minZ, corridor.minX, corridor.maxZ);

  for (const floor of [0, 1]) {
    addWall(ctx, floor, corridor.minX, corridor.maxZ, corridor.maxX, corridor.maxZ);
    addWall(ctx, floor, corridor.minX, corridor.minZ, corridor.maxX, corridor.minZ);
    addWall(ctx, floor, stairHall.minX, corridor.maxZ, stairHall.minX, stairHall.maxZ);
    addWall(ctx, floor, stairHall.minX, stairHall.minZ, stairHall.minX, corridor.minZ);
    addWall(ctx, floor, stairHall.minX, stairHall.maxZ, stairHall.maxX, stairHall.maxZ);
    addWall(ctx, floor, stairHall.minX, stairHall.minZ, stairHall.maxX, stairHall.minZ);
    addWall(ctx, floor, stairHall.maxX, stairHall.minZ, stairHall.maxX, stairHall.maxZ);

    for (let x = corridor.minX + 2; x < corridor.maxX - 1; x += 3) addTube(ctx, floor, x, 0);
    addTube(ctx, floor, 40, -2);
    addTube(ctx, floor, 44, -2);

    // Ventanal del hall de la escalera: afuera está nublado (plano claro sin sombrear).
    const y = floorY(floor);
    const faceX = stairHall.maxX - HALF_WALL;
    ctx.parts.push(
      paint(box(0.004, 1.6, 2.4, faceX - 0.003, y + 1.8, -2.4), WINDOW_LIGHT, { shaded: false }),
    );
    ctx.parts.push(paint(box(0.06, 1.7, 0.06, faceX - 0.03, y + 1.8, -2.4), FRAME));
    ctx.parts.push(paint(box(0.06, 0.06, 2.5, faceX - 0.03, y + 1.8, -2.4), FRAME));
    for (const yy of [1.0, 2.6]) {
      ctx.parts.push(paint(box(0.08, 0.06, 2.5, faceX - 0.03, y + yy, -2.4), FRAME));
    }
    for (const zz of [-3.6, -1.2]) {
      ctx.parts.push(paint(box(0.08, 1.7, 0.06, faceX - 0.03, y + 1.8, zz), FRAME));
    }
  }
  // Debajo del descanso del 1° piso: un depósito cerrado.
  addWall(ctx, 0, flight.maxX, flight.minZ, stairHall.maxX, flight.minZ);
  addTube(ctx, 1, (flight.minX + flight.maxX) / 2, (flight.minZ + flight.maxZ) / 2);

  for (const x of [2.5, 6, 9.5]) {
    for (const z of [-4, 0, 4]) addTube(ctx, 0, x, z);
  }
}

// ---------- Escalera ----------

function buildStairs(ctx) {
  const { minX, maxX, minZ, maxZ, steps } = flight;
  const run = (maxX - minX) / steps;
  const rise = STORY_HEIGHT / steps;
  const width = maxZ - minZ;
  const cz = (minZ + maxZ) / 2;
  for (let i = 0; i < steps; i += 1) {
    const top = (i + 1) * rise;
    const x = minX + (i + 0.5) * run;
    ctx.parts.push(paint(box(run, top, width, x, top / 2, cz), STEP));
    // Nariz de cada escalón, más oscura: ayuda a leer los escalones.
    ctx.parts.push(
      paint(box(0.05, 0.012, width, minX + i * run + 0.025, top + 0.006, cz), 0x5b5852),
    );
  }

  // Pasamanos inclinado del lado abierto, con parantes.
  const length = Math.hypot(maxX - minX, STORY_HEIGHT);
  const rail = new THREE.BoxGeometry(length, 0.05, 0.05);
  rail.rotateZ(Math.atan2(STORY_HEIGHT, maxX - minX));
  rail.translate((minX + maxX) / 2, STORY_HEIGHT / 2 + 0.9, minZ);
  ctx.parts.push(paint(rail, FRAME));
  for (let i = 0; i < 5; i += 1) {
    const x = minX + 0.15 + (i * (maxX - minX - 0.3)) / 4;
    const ground = ((x - minX) / (maxX - minX)) * STORY_HEIGHT;
    ctx.parts.push(paint(box(0.04, 0.9, 0.04, x, ground + 0.45, minZ), FRAME));
  }

  // Baranda alrededor del hueco en el 1° piso.
  addRailing(ctx, STORY_HEIGHT, minX, minZ, maxX, minZ);
  addRailing(ctx, STORY_HEIGHT, minX, minZ, minX, maxZ);

  // Colisiones: en planta baja el costado de la escalera es macizo; arriba, las barandas.
  ctx.obstacles[0].push(obstacle(minX, minZ - 0.1, maxX, minZ));
  ctx.obstacles[1].push(obstacle(minX, minZ - 0.1, maxX, minZ));
  ctx.obstacles[1].push(obstacle(minX - 0.1, minZ, minX, maxZ));
}

// ---------- Puertas de las aulas ----------

/** Cara de la pared del pasillo que da al pasillo, del lado `side` (±1 en z). */
const corridorFaceZ = (side) => side * (corridor.maxZ - HALF_WALL);

function addClassroomDoor(ctx, door, random) {
  const { floor, number, x, side } = door;
  const y = floorY(floor);
  const face = corridorFaceZ(side);
  const out = (d) => face - side * d; // d metros hacia el pasillo
  ctx.parts.push(paint(box(1.0, 2.1, 0.05, x, y + 1.05, out(0.025)), DOOR));
  for (const dx of [-0.54, 0.54]) {
    ctx.parts.push(paint(box(0.08, 2.18, 0.07, x + dx, y + 1.09, out(0.035)), FRAME));
  }
  ctx.parts.push(paint(box(1.16, 0.08, 0.07, x, y + 2.14, out(0.035)), FRAME));
  ctx.parts.push(paint(box(0.12, 0.03, 0.05, x - 0.35, y + 1.0, out(0.07)), STEEL));
  // Mirilla: algunas aulas ya tienen clase (luz prendida).
  const lit = random() < 0.6;
  ctx.parts.push(
    paint(
      facadePlane(0.22, 0.5, x + 0.22, y + 1.45, out(0.051), -side),
      lit ? LIT_ROOM : DARK_GLASS,
      {
        shaded: !lit,
      },
    ),
  );
  ctx.group.add(
    createRoomPlate({ number, x, y: y + 2.45, z: out(0.005), facing: side > 0 ? 'z-' : 'z+' }),
  );
}

/** Doble puerta del aula 500, en la pared -z del hall de la escalera (mira hacia +z). */
function addAula500Door(ctx) {
  const { floor, x, width, height } = aula500Door;
  const y = floorY(floor);
  const face = stairHall.minZ + HALF_WALL;
  const half = width / 2;
  const leaf = half - 0.02;
  for (const side of [-1, 1]) {
    const lx = x + side * (leaf / 2 + 0.01);
    ctx.parts.push(paint(box(leaf, height, 0.05, lx, y + height / 2, face + 0.025), DOOR));
    ctx.parts.push(
      paint(facadePlane(0.2, 0.5, x + side * 0.3, y + 1.45, face + 0.051, 1), LIT_ROOM, {
        shaded: false,
      }),
    );
    ctx.parts.push(paint(box(0.12, 0.03, 0.05, x + side * 0.12, y + 1.0, face + 0.07), STEEL));
    ctx.parts.push(
      paint(
        box(
          0.08,
          height + 0.08,
          0.07,
          x + side * (half + 0.04),
          y + height / 2 + 0.04,
          face + 0.035,
        ),
        FRAME,
      ),
    );
  }
  ctx.parts.push(paint(box(width + 0.16, 0.08, 0.07, x, y + height + 0.04, face + 0.035), FRAME));
  ctx.group.add(
    createPanel({
      width: 0.9,
      height: 0.3,
      x,
      y: y + 2.65,
      z: face + 0.005,
      facing: 'z+',
      background: '#1d3557',
      color: '#ffffff',
      lines: [{ text: 'AULA 500', size: 0.15, bold: true }],
    }),
  );
  return ctx.hitbox(width, height, 0.4, x, y + height / 2, face + 0.2);
}

/** Ventana al final del pasillo del 1° piso (arriba del hall no se puede entrar). */
function addCorridorEndWindow(ctx) {
  const y = floorY(1);
  const face = corridor.minX + HALF_WALL;
  ctx.parts.push(
    paint(box(0.004, 1.6, 2.4, face + 0.003, y + 1.8, 0), WINDOW_LIGHT, { shaded: false }),
  );
  ctx.parts.push(paint(box(0.06, 1.7, 0.06, face + 0.03, y + 1.8, 0), FRAME));
  for (const yy of [1.0, 2.6]) {
    ctx.parts.push(paint(box(0.08, 0.06, 2.5, face + 0.03, y + yy, 0), FRAME));
  }
  for (const zz of [-1.2, 1.2]) {
    ctx.parts.push(paint(box(0.08, 1.7, 0.06, face + 0.03, y + 1.8, zz), FRAME));
  }
}

function addBathroomDoor(ctx, floor) {
  const y = floorY(floor);
  const face = stairHall.minZ + HALF_WALL;
  const x = bathroomDoorX;
  ctx.parts.push(paint(box(0.9, 2.1, 0.05, x, y + 1.05, face + 0.025), 0x5f6f7a));
  ctx.parts.push(paint(box(1.04, 2.16, 0.03, x, y + 1.08, face + 0.012), FRAME));
  ctx.group.add(
    createWayfindingSign({
      text: 'BAÑOS',
      width: 0.8,
      x,
      y: y + 2.45,
      z: face + 0.005,
      facing: 'z+',
    }),
  );
}

/** Cartelera de corcho con papeles en la pared del pasillo. */
function addCorkBoard(ctx, floor, x, side, random) {
  const y = floorY(floor) + 1.55;
  const face = corridorFaceZ(side);
  ctx.parts.push(paint(box(1.3, 0.85, 0.03, x, y, face - side * 0.015), 0xa77b4f));
  for (let i = 0; i < 5; i += 1) {
    const w = 0.16 + random() * 0.12;
    const h = 0.2 + random() * 0.1;
    const px = x - 0.45 + random() * 0.9;
    const py = y - 0.2 + random() * 0.4;
    const color = PAPERS[Math.floor(random() * PAPERS.length)];
    ctx.parts.push(
      paint(facadePlane(w, h, px, py, face - side * (0.031 + i * 0.001), -side), color),
    );
  }
}

// ---------- Hall ----------

function buildEntrance(ctx) {
  const x = hall.minX;
  const { minZ, maxZ, height } = entranceDoor;
  const width = maxZ - minZ;
  // Dintel sobre la puerta, marcos y vidrios con gotas.
  ctx.parts.push(
    paint(
      box(WALL_THICKNESS, CEILING_HEIGHT - height, width, x, (height + CEILING_HEIGHT) / 2, 0),
      WALL,
    ),
  );
  ctx.parts.push(paint(box(0.12, 0.1, width, x, height - 0.05, 0), FRAME));
  for (const z of [minZ + 0.05, 0, maxZ - 0.05]) {
    ctx.parts.push(paint(box(0.12, height, 0.1, x, height / 2, z), FRAME));
  }
  for (const z of [-0.15, 0.15]) {
    ctx.parts.push(paint(box(0.04, 0.9, 0.04, x + 0.1, 1.1, z), STEEL));
  }
  const glassMaterial = new THREE.MeshBasicMaterial({
    map: createRainOnGlassTexture(),
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  for (const side of [-1, 1]) {
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(width / 2 - 0.1, height - 0.1),
      glassMaterial,
    );
    glass.rotation.y = Math.PI / 2; // mira hacia adentro (+x)
    glass.position.set(x, height / 2, (side * width) / 4);
    ctx.group.add(glass);
  }
  ctx.obstacles[0].push(obstacle(x - HALF_WALL, minZ, x + HALF_WALL, maxZ));

  // Carteles sobre la salida al pasillo: hacia el hall, y "SALIDA" del otro lado.
  const beamY = addBeam(ctx, 0, hall.maxX);
  ctx.group.add(
    createWayfindingSign({
      text: '↑ AULAS 501 – 508 · ESCALERA',
      width: 2.8,
      x: hall.maxX - HALF_WALL - 0.005,
      y: beamY,
      z: 0,
      facing: 'x-',
    }),
    createWayfindingSign({
      text: 'SALIDA ↑',
      width: 1.2,
      x: hall.maxX + HALF_WALL + 0.005,
      y: beamY,
      z: 0,
      facing: 'x+',
      background: '#1e7a3c',
    }),
  );
}

function buildBedelia(ctx) {
  const { x, width } = bedelia;
  const face = hall.maxZ - HALF_WALL;
  ctx.parts.push(paint(box(width, 1.05, 0.45, x, 0.525, face - 0.225), WOOD));
  ctx.parts.push(paint(box(width + 0.1, 0.04, 0.5, x, 1.07, face - 0.25), 0x8a7560));
  // Persiana metálica baja.
  ctx.parts.push(paint(box(width - 0.2, 1.2, 0.03, x, 1.69, face - 0.015), 0x8b9096));
  for (let i = 0; i < 12; i += 1) {
    ctx.parts.push(paint(box(width - 0.2, 0.015, 0.02, x, 1.14 + i * 0.1, face - 0.035), 0x6f757b));
  }
  ctx.parts.push(paint(box(width, 0.08, 0.06, x, 2.33, face - 0.03), FRAME));
  ctx.group.add(
    createWayfindingSign({ text: 'BEDELÍA', width: 1.3, x, y: 2.7, z: face - 0.005, facing: 'z-' }),
    createPanel({
      width: 0.21,
      height: 0.15,
      x: x + 0.9,
      y: 1.75,
      z: face - 0.05,
      facing: 'z-',
      tilt: -0.05,
      background: '#fbfbf7',
      lines: [
        { text: 'ATENCIÓN', size: 0.022, bold: true },
        { text: 'Lunes a viernes', size: 0.016 },
        { text: '9 a 12 hs', size: 0.026, bold: true },
      ],
    }),
  );
  ctx.obstacles[0].push(obstacle(x - width / 2, face - 0.5, x + width / 2, face));
  return ctx.hitbox(width, 1.4, 0.4, x, 1.6, face - 0.2);
}

function buildElevator(ctx) {
  const { x, width } = elevator;
  const face = hall.minZ + HALF_WALL;
  ctx.parts.push(paint(box(width + 0.2, 2.35, 0.06, x, 1.175, face + 0.03), 0x6f757b));
  for (const side of [-1, 1]) {
    ctx.parts.push(
      paint(box(width / 2 - 0.01, 2.15, 0.04, x + (side * width) / 4, 1.075, face + 0.07), STEEL),
    );
  }
  ctx.parts.push(paint(box(0.4, 0.14, 0.03, x, 2.5, face + 0.015), 0x111111));
  ctx.parts.push(paint(box(0.1, 0.22, 0.03, x + width / 2 + 0.35, 1.2, face + 0.015), STEEL));
  ctx.parts.push(paint(box(0.04, 0.04, 0.02, x + width / 2 + 0.35, 1.22, face + 0.035), 0x555555));
  ctx.group.add(
    createPanel({
      width: 0.3,
      height: 0.21,
      x: x - 0.05,
      y: 1.5,
      z: face + 0.092,
      facing: 'z+',
      tilt: 0.03,
      background: '#fbfbf7',
      lines: [
        { text: 'FUERA DE', size: 0.04, bold: true, color: '#b3261e' },
        { text: 'SERVICIO', size: 0.04, bold: true, color: '#b3261e' },
      ],
    }),
  );
  return ctx.hitbox(width + 0.2, 2.2, 0.4, x, 1.1, face + 0.2);
}

function buildDirectory(ctx) {
  const { z, width, height } = directory;
  const face = hall.maxX - HALF_WALL;
  const y = 1.75;
  ctx.parts.push(paint(box(0.05, height + 0.1, width + 0.1, face - 0.025, y, z), FRAME));
  ctx.group.add(
    createPanel({
      width,
      height,
      x: face - 0.052,
      y,
      z,
      facing: 'x-',
      align: 'left',
      header: {
        text: buildingName,
        size: 0.075,
        background: '#1d3557',
        color: '#ffffff',
      },
      lines: [
        { text: 'PLANTA BAJA', size: 0.07, bold: true, color: '#1d3557' },
        { text: 'Bedelía · Aulas 501 – 508 · Baños', size: 0.065 },
        { text: ' ', size: 0.03 },
        { text: '1° PISO', size: 0.07, bold: true, color: '#1d3557' },
        { text: 'Aulas 511 – 518 · Baños', size: 0.065 },
      ],
    }),
  );
  return ctx.hitbox(0.4, height, width, face - 0.2, y, z);
}

function buildHallProps(ctx) {
  // Banco largo contra la pared.
  const benchX = (bench.minX + bench.maxX) / 2;
  const benchLength = bench.maxX - bench.minX;
  ctx.parts.push(paint(box(benchLength, 0.06, 0.42, benchX, 0.45, bench.z), WOOD));
  for (const dx of [-benchLength / 2 + 0.2, 0, benchLength / 2 - 0.2]) {
    ctx.parts.push(paint(box(0.06, 0.42, 0.36, benchX + dx, 0.21, bench.z), FRAME));
  }
  ctx.obstacles[0].push(obstacle(bench.minX, bench.z - 0.21, bench.maxX, bench.z + 0.21));

  // Cartel amarillo de piso mojado (todos entran empapados).
  const cone = new THREE.ConeGeometry(0.22, 0.62, 4);
  cone.rotateY(Math.PI / 4);
  cone.translate(wetFloorSign.x, 0.31, wetFloorSign.z);
  ctx.parts.push(paint(cone, 0xf2c230));
  const { x, z } = wetFloorSign;
  ctx.obstacles[0].push(obstacle(x - 0.2, z - 0.2, x + 0.2, z + 0.2));
}

// ---------- Señalética de la escalera ----------

function buildStairSigns(ctx) {
  const beamY0 = addBeam(ctx, 0, stairHall.minX);
  const beamY1 = addBeam(ctx, 1, stairHall.minX);
  ctx.group.add(
    createWayfindingSign({
      text: 'ESCALERA → 1° PISO · AULAS 511 – 518',
      width: 2.9,
      x: stairHall.minX - HALF_WALL - 0.005,
      y: beamY0,
      z: 0,
      facing: 'x-',
    }),
    createWayfindingSign({
      text: '↑ AULAS 511 – 518',
      width: 1.7,
      x: stairHall.minX + HALF_WALL + 0.005,
      y: beamY1,
      z: 0,
      facing: 'x+',
    }),
    // En el descanso del 1° piso, de frente al que llega por la escalera.
    createPanel({
      width: 1.8,
      height: 0.62,
      x: stairHall.maxX - HALF_WALL - 0.005,
      y: STORY_HEIGHT + 2.0,
      z: (flight.minZ + flight.maxZ) / 2,
      facing: 'x-',
      background: '#1d3557',
      color: '#ffffff',
      lines: [
        { text: '← AULAS 511 – 518', size: 0.15, bold: true },
        { text: 'Aulas 500 – 508: planta baja', size: 0.1 },
      ],
    }),
  );
}

// ---------- Afuera (lo que se ve por la puerta vidriada) ----------

function buildOutside() {
  const group = new THREE.Group();
  group.name = 'outside';
  const ground = new THREE.PlaneGeometry(40, 80);
  ground.rotateX(-Math.PI / 2);
  ground.translate(-20 - HALF_WALL, -0.03, 0);
  group.add(new THREE.Mesh(ground, new THREE.MeshBasicMaterial({ color: 0x50565b })));

  const grass = new THREE.PlaneGeometry(31, 80);
  grass.rotateX(-Math.PI / 2);
  grass.translate(-24.5, -0.02, 0);
  group.add(new THREE.Mesh(grass, new THREE.MeshBasicMaterial({ map: createWetGrassTexture() })));

  const parts = [];
  for (const [x, z, scale] of [
    [-11, -7, 1.2],
    [-13, 6, 1.3],
    [-19, -1, 1.1],
    [-16, 12, 1.2],
    [-22, -12, 1.4],
  ]) {
    addTree(parts, { x, z, type: 'round', scale, groundY: -0.02 });
  }
  group.add(mergeParts(parts, 'outside-trees'));
  return group;
}

export function buildBuilding({ anisotropy = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'faculty';
  const ctx = {
    group,
    parts: [],
    floorGeos: [],
    obstacles: [[], []],
    /** Caja invisible para apuntarle con la mira a algo interactuable. */
    hitbox(w, h, d, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
      mesh.position.set(x, y, z);
      mesh.visible = false;
      group.add(mesh);
      return mesh;
    },
  };
  const random = seededRandom(312);

  buildShell(ctx);
  buildStairs(ctx);
  buildEntrance(ctx);
  buildHallProps(ctx);
  buildStairSigns(ctx);
  const hitboxes = {
    bedelia: buildBedelia(ctx),
    elevator: buildElevator(ctx),
    directory: buildDirectory(ctx),
    aula500: addAula500Door(ctx),
  };

  addCorridorEndWindow(ctx);

  for (const door of classroomDoors) addClassroomDoor(ctx, door, random);
  for (const floor of [0, 1]) {
    addBathroomDoor(ctx, floor);
    for (let i = 0; i < 4; i += 1) {
      const from = corridor.minX + i * 6.25;
      if (i % 2 === 0) addCorkBoard(ctx, floor, from + 3.9, 1, random);
      else addCorkBoard(ctx, floor, from + 2.2, -1, random);
    }
  }

  group.add(
    mergeParts(
      ctx.parts,
      'faculty-static',
      new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    ),
  );

  const tiles = createTileFloorTexture();
  tiles.anisotropy = anisotropy;
  const floors = new THREE.Mesh(
    mergeGeometries(ctx.floorGeos),
    new THREE.MeshBasicMaterial({ map: tiles, color: 0xe2ded6, fog: false }),
  );
  floors.name = 'faculty-floors';
  for (const geo of ctx.floorGeos) geo.dispose();
  group.add(floors);

  group.add(buildOutside());

  return { group, obstacles: ctx.obstacles, hitboxes };
}
