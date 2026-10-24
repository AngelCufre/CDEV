import * as THREE from 'three';
import { config } from '../../config.js';
import {
  createTileFloorTexture,
  createRainOnGlassTexture,
  createChalkboardTexture,
  createWallClockTexture,
} from '../../utils/textures.js';
import {
  paint,
  box,
  roundedBox,
  facadePlane,
  mergeParts,
  seededRandom,
} from '../../world/lowPoly.js';
import { addSeatedPerson, randomPersonStyle } from '../../world/people.js';
import { addApartmentBlock, addTree } from '../../world/buildings.js';
import { buildSky, buildRain } from '../../world/weather.js';
import {
  room,
  windows,
  windowSill,
  windowHead,
  door,
  board,
  teacherDesk,
  deskColumns,
  deskRows,
  desk,
  chairOffsetZ,
  playerDesk,
  emptyDesks,
} from './layout.js';

const WALL = 0xd9d1c0;
const WAINSCOT = 0x7f8c86;
const WAINSCOT_HEIGHT = 1.1;
const CEILING = 0xe4e0d8;
const FRAME = 0x3c3f42;
const DESK_TOP = 0xc8b48e;
const CHAIR = 0x2f5d8a;
const TUBE = 0xfdf8ec;
const T = 0.2; // espesor de las paredes
const TILE_METERS = 0.8;

const isEmpty = (x, z) =>
  (x === playerDesk.x && z === playerDesk.z) || emptyDesks.some((d) => d.x === x && d.z === z);

/** Pared a lo largo de X (en z) o de Z (en x), de `from` a `to`, entre `fromY` y `toY`. */
function wallX(parts, z, from, to, fromY, toY, color = WALL) {
  parts.push(paint(box(to - from, toY - fromY, T, (from + to) / 2, (fromY + toY) / 2, z), color));
}
function wallZ(parts, x, from, to, fromY, toY, color = WALL) {
  parts.push(paint(box(T, toY - fromY, to - from, x, (fromY + toY) / 2, (from + to) / 2), color));
}

/** Zócalo pintado (franja baja más oscura), apenas delante de la pared. */
function wainscotX(parts, z, from, to) {
  const inward = z < 0 ? 1 : -1;
  parts.push(
    paint(
      box(
        to - from,
        WAINSCOT_HEIGHT,
        0.02,
        (from + to) / 2,
        WAINSCOT_HEIGHT / 2,
        z + inward * (T / 2 + 0.01),
      ),
      WAINSCOT,
    ),
  );
}
function wainscotZ(parts, x, from, to) {
  const inward = x < 0 ? 1 : -1;
  parts.push(
    paint(
      box(
        0.02,
        WAINSCOT_HEIGHT,
        to - from,
        x + inward * (T / 2 + 0.01),
        WAINSCOT_HEIGHT / 2,
        (from + to) / 2,
      ),
      WAINSCOT,
    ),
  );
}

function buildShell(parts) {
  const { minX, maxX, minZ, maxZ, height } = room;
  // Frente y fondo, enteros.
  wallX(parts, minZ - T / 2, minX - T, maxX + T, 0, height);
  wallX(parts, maxZ + T / 2, minX - T, maxX + T, 0, height);
  wainscotX(parts, minZ - T / 2, minX, maxX);
  wainscotX(parts, maxZ + T / 2, minX, maxX);

  // Pared derecha, con el hueco de la puerta.
  const rightX = maxX + T / 2;
  wallZ(parts, rightX, minZ, door.fromZ, 0, height);
  wallZ(parts, rightX, door.toZ, maxZ, 0, height);
  wallZ(parts, rightX, door.fromZ, door.toZ, door.height, height);
  wainscotZ(parts, rightX, minZ, door.fromZ);
  wainscotZ(parts, rightX, door.toZ, maxZ);

  // Pared izquierda, con los huecos de las ventanas (antepecho y dintel en cada una).
  const leftX = minX - T / 2;
  let cursor = minZ;
  for (const win of windows) {
    wallZ(parts, leftX, cursor, win.fromZ, 0, height);
    wainscotZ(parts, leftX, cursor, win.fromZ);
    wallZ(parts, leftX, win.fromZ, win.toZ, 0, windowSill);
    wallZ(parts, leftX, win.fromZ, win.toZ, windowHead, height);
    wainscotZ(parts, leftX, win.fromZ, win.toZ);
    cursor = win.toZ;
  }
  wallZ(parts, leftX, cursor, maxZ, 0, height);
  wainscotZ(parts, leftX, cursor, maxZ);

  // Techo y tubos de luz.
  parts.push(
    paint(box(maxX - minX + 2 * T, 0.12, maxZ - minZ + 2 * T, 0, height + 0.06, 0), CEILING),
  );
  for (const x of [-2.5, 0, 2.5]) {
    for (const z of [-2.6, 0, 2.6]) {
      parts.push(paint(box(0.22, 0.05, 1.3, x, height - 0.025, z), 0xcfd2d4));
      parts.push(paint(box(0.12, 0.03, 1.2, x, height - 0.06, z), TUBE, { shaded: false }));
    }
  }
}

function buildFloor(maxAnisotropy) {
  const width = room.maxX - room.minX;
  const depth = room.maxZ - room.minZ;
  const texture = createTileFloorTexture();
  texture.repeat.set(width / TILE_METERS, depth / TILE_METERS);
  texture.anisotropy = maxAnisotropy;
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, color: 0xe2ded6 }));
  floor.name = 'classroom-floor';
  return floor;
}

/** Marcos y vidrios de las ventanas; la del medio con la banderola abierta hacia adentro. */
function buildWindows(parts, group) {
  const glassMaterial = new THREE.MeshBasicMaterial({
    map: createRainOnGlassTexture(),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const x = room.minX - T / 2;
  const transomBottom = windowHead - 0.5;
  for (const win of windows) {
    const width = win.toZ - win.fromZ;
    const centerZ = (win.fromZ + win.toZ) / 2;
    // Marco perimetral, parteluz vertical y travesaño de la banderola.
    for (const y of [windowSill + 0.03, windowHead - 0.03, transomBottom]) {
      parts.push(paint(box(0.08, 0.06, width, x, y, centerZ), FRAME));
    }
    for (const z of [win.fromZ + 0.03, win.toZ - 0.03, centerZ]) {
      parts.push(
        paint(
          box(0.08, transomBottom - windowSill, 0.06, x, (windowSill + transomBottom) / 2, z),
          FRAME,
        ),
      );
    }
    // Antepecho interior.
    parts.push(paint(box(0.3, 0.04, width + 0.1, x + 0.12, windowSill - 0.02, centerZ), 0xcfcac0));

    const lower = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.1, transomBottom - windowSill - 0.06),
      glassMaterial,
    );
    lower.rotation.y = Math.PI / 2;
    lower.position.set(x, (windowSill + transomBottom) / 2, centerZ);
    group.add(lower);

    // Banderola: cerrada, o abierta (girada sobre su borde de abajo hacia adentro).
    const transomHeight = windowHead - transomBottom - 0.06;
    const pivot = new THREE.Group();
    pivot.position.set(x, transomBottom + 0.03, centerZ);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.1, transomHeight), glassMaterial);
    pane.rotation.y = Math.PI / 2;
    pane.position.y = transomHeight / 2;
    pivot.add(pane);
    if (win.open) {
      pivot.rotation.z = -0.55; // la parte de arriba se inclina hacia la habitación (+x)
      const frame = mergeParts(
        [
          paint(box(0.04, transomHeight, 0.04, 0, transomHeight / 2, -(width - 0.1) / 2), FRAME),
          paint(box(0.04, transomHeight, 0.04, 0, transomHeight / 2, (width - 0.1) / 2), FRAME),
          paint(box(0.04, 0.04, width - 0.1, 0, transomHeight, 0), FRAME),
        ],
        'open-transom-frame',
      );
      pivot.add(frame);
    }
    group.add(pivot);
  }
}

/** Pizarrón con lo escrito en tiza, bandeja con tizas y borrador, y el reloj arriba. */
function buildBoard(parts, group) {
  const z = room.minZ + 0.02;
  const y = board.bottomY + board.height / 2;
  const texture = createChalkboardTexture([
    { text: `${config.facultad.aula.toUpperCase()} · DISEÑO DE SISTEMAS`, size: 40 },
    { text: '1er PARCIAL', size: 58 },
    { text: `Entrega: ${config.parcial.horaEntrega} hs`, size: 44 },
    { text: 'Celulares apagados · Sin apuntes', size: 34 },
  ]);
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(board.width, board.height),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  surface.position.set(0, y, z + 0.015);
  group.add(surface);
  const frameZ = z + 0.01;
  parts.push(
    paint(box(board.width + 0.1, 0.05, 0.04, 0, y + board.height / 2 + 0.025, frameZ), 0x9aa0a6),
  );
  parts.push(
    paint(box(board.width + 0.1, 0.05, 0.04, 0, y - board.height / 2 - 0.025, frameZ), 0x9aa0a6),
  );
  for (const side of [1, -1]) {
    parts.push(
      paint(
        box(0.05, board.height + 0.1, 0.04, side * (board.width / 2 + 0.025), y, frameZ),
        0x9aa0a6,
      ),
    );
  }
  // Bandeja, tizas y borrador.
  parts.push(paint(box(board.width, 0.03, 0.09, 0, board.bottomY - 0.06, z + 0.05), 0x9aa0a6));
  for (const [x, color] of [
    [-1.2, 0xf2f2ee],
    [-1.05, 0xf2f2ee],
    [0.7, 0xf2d36b],
  ]) {
    const chalk = new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8);
    chalk.rotateZ(Math.PI / 2);
    chalk.translate(x, board.bottomY - 0.035, z + 0.05);
    parts.push(paint(chalk, color));
  }
  parts.push(
    paint(roundedBox(0.14, 0.04, 0.05, 1.3, board.bottomY - 0.025, z + 0.05, 0.01), 0x6b4a2e),
  );

  // Reloj de pared, arriba del pizarrón.
  const clock = createWallClockTexture();
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.21, 40),
    new THREE.MeshBasicMaterial({ map: clock.texture }),
  );
  const clockY = board.bottomY + board.height + 0.55;
  face.position.set(0, clockY, room.minZ + 0.045);
  group.add(face);
  const rim = new THREE.TorusGeometry(0.215, 0.022, 10, 40);
  rim.translate(0, clockY, room.minZ + 0.045);
  parts.push(paint(rim, 0x2a2c2f));
  return clock;
}

function buildTeacherDesk(parts) {
  const { x, z, width, depth, height } = teacherDesk;
  parts.push(paint(roundedBox(width, 0.04, depth, x, height, z, 0.015), 0x7a5a3c));
  parts.push(paint(box(width - 0.1, 0.6, 0.03, x, height - 0.34, z + depth / 2 - 0.05), 0x6b4f36));
  for (const side of [1, -1]) {
    parts.push(
      paint(
        box(
          0.05,
          height - 0.02,
          depth - 0.1,
          x + side * (width / 2 - 0.06),
          (height - 0.02) / 2,
          z,
        ),
        0x6b4f36,
      ),
    );
  }
  // Silla de la profesora (de frente al aula, del lado del pizarrón).
  parts.push(paint(roundedBox(0.44, 0.05, 0.42, x + 0.2, 0.47, z - 0.62, 0.02), 0x1d1d1f));
  parts.push(paint(roundedBox(0.44, 0.45, 0.04, x + 0.2, 0.75, z - 0.84, 0.02), 0x1d1d1f));
  // Pila de parciales sin repartir, un bolso y un termo.
  for (let i = 0; i < 6; i += 1) {
    parts.push(
      paint(
        box(0.21, 0.006, 0.297, x - 0.35 + (i % 2) * 0.01, height + 0.023 + i * 0.006, z + 0.05),
        0xf5f2e8,
      ),
    );
  }
  parts.push(
    paint(roundedBox(0.36, 0.26, 0.14, x + 0.42, height + 0.15, z - 0.12, 0.04), 0x6a2e3a),
  );
  const thermos = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 16);
  thermos.translate(x + 0.12, height + 0.17, z - 0.18);
  parts.push(paint(thermos, 0x3a6b4a));
}

/** Banco escolar: tabla laminada sobre estructura de caño, y la silla de plástico detrás. */
function addStudentDesk(parts, x, z) {
  const { width, depth, height } = desk;
  parts.push(paint(roundedBox(width, 0.025, depth, x, height, z, 0.01), DESK_TOP));
  // Patas y travesaño de caño.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.014, 0.014, height - 0.01, 8);
      leg.translate(x + sx * (width / 2 - 0.04), (height - 0.01) / 2, z + sz * (depth / 2 - 0.04));
      parts.push(paint(leg, FRAME));
    }
  }
  parts.push(paint(box(0.02, 0.02, depth - 0.08, x - width / 2 + 0.04, 0.2, z), FRAME));
  parts.push(paint(box(0.02, 0.02, depth - 0.08, x + width / 2 - 0.04, 0.2, z), FRAME));
  parts.push(paint(box(width - 0.1, 0.02, depth - 0.1, x, height - 0.13, z), FRAME)); // parrilla

  const cz = z + chairOffsetZ;
  parts.push(paint(roundedBox(0.4, 0.035, 0.38, x, 0.45, cz, 0.015), CHAIR));
  parts.push(paint(roundedBox(0.38, 0.28, 0.03, x, 0.74, cz + 0.2, 0.012), CHAIR));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.011, 0.011, 0.44, 8);
      leg.translate(x + sx * 0.17, 0.22, cz + sz * 0.16);
      parts.push(paint(leg, FRAME));
    }
    parts.push(paint(box(0.02, 0.32, 0.02, x + sx * 0.17, 0.6, cz + 0.2), FRAME));
  }
}

/** Compañeros rindiendo: sentados, con las hojas y una birome en el banco. */
function buildClassmates(parts, random) {
  for (const x of deskColumns) {
    for (const z of deskRows) {
      addStudentDesk(parts, x, z);
      if (isEmpty(x, z)) continue;
      addSeatedPerson(parts, {
        x: x + (random() - 0.5) * 0.04,
        z: z + chairOffsetZ - 0.02,
        yaw: Math.PI / 2 + (random() - 0.5) * 0.25,
        style: randomPersonStyle(random),
      });
      const top = desk.height + 0.013;
      for (let i = 0; i < 2; i += 1) {
        const sheet = box(0.21, 0.002, 0.297, 0, 0, 0);
        sheet.rotateY((random() - 0.5) * 0.5);
        sheet.translate(x + (i - 0.5) * 0.14, top + i * 0.002, z + 0.02);
        parts.push(paint(sheet, 0xf5f2e8));
      }
      const pen = new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6);
      pen.rotateZ(Math.PI / 2);
      pen.rotateY(random() * Math.PI);
      pen.translate(x + 0.18, top + 0.006, z + 0.1);
      parts.push(paint(pen, 0x2b4a9a));
    }
  }
}

/** Puerta del aula (cerrada) con su marco, en la pared derecha. */
function buildDoor(parts) {
  const x = room.maxX + T / 2;
  const width = door.toZ - door.fromZ;
  const centerZ = (door.fromZ + door.toZ) / 2;
  parts.push(
    paint(
      box(0.05, door.height - 0.02, width - 0.04, x - 0.02, (door.height - 0.02) / 2, centerZ),
      0x6b4f36,
    ),
  );
  parts.push(paint(box(0.06, 0.08, width + 0.12, x - 0.08, door.height + 0.04, centerZ), FRAME));
  for (const z of [door.fromZ - 0.03, door.toZ + 0.03]) {
    parts.push(paint(box(0.06, door.height, 0.06, x - 0.08, door.height / 2, z), FRAME));
  }
  parts.push(paint(box(0.04, 0.03, 0.12, x - 0.07, 1.0, door.fromZ + 0.12), 0x9aa0a6));
}

/** Cartelera de corcho en el fondo, con avisos. */
function buildCorkBoard(parts, random) {
  const z = room.maxZ - 0.02;
  parts.push(paint(box(1.6, 0.9, 0.03, 2.6, 1.7, z), 0x9c7a52));
  const colors = [0xf5f2e8, 0xf3e48a, 0xf2b8c6, 0xbfe3f2];
  for (let i = 0; i < 6; i += 1) {
    const w = 0.18 + random() * 0.12;
    const h = 0.22 + random() * 0.1;
    parts.push(
      paint(
        facadePlane(
          w,
          h,
          2.0 + (i % 3) * 0.5 + random() * 0.1,
          1.5 + Math.floor(i / 3) * 0.35,
          z - 0.017,
          -1,
        ),
        colors[i % colors.length],
      ),
    );
  }
}

/** Lo que se ve por las ventanas: cielo, lluvia, edificios y árboles mojados. */
function buildOutside(parts, group) {
  const sky = buildSky(40);
  sky.material.depthWrite = false;
  sky.renderOrder = -1;
  group.add(sky);
  const rain = buildRain({
    count: 1400,
    area: { minX: -22, maxX: room.minX - 0.3, minY: -1, maxY: 9, minZ: -12, maxZ: 12 },
  });
  group.add(rain.mesh);
  const random = seededRandom(91);
  for (const [z, width, floors] of [
    [-8, 12, 5],
    [6, 14, 6],
  ]) {
    addApartmentBlock(parts, {
      x: -20,
      z,
      width,
      depth: 9,
      floors,
      color: floors > 5 ? 0x9a948c : 0x8c8f93,
      facing: 1,
      groundY: -3.6,
      random,
    });
  }
  for (const [x, z] of [
    [-9, -4],
    [-10, 2.5],
    [-8.5, 7],
  ]) {
    addTree(parts, { x, z, type: 'round', scale: 1.6, groundY: -3.6 });
  }
  const ground = new THREE.PlaneGeometry(40, 40);
  ground.rotateX(-Math.PI / 2);
  ground.translate(-24, -3.6, 0);
  parts.push(paint(ground, 0x4b5a46));
  return rain;
}

/**
 * Arma el aula 500. Devuelve el grupo, el reloj de pared (`clock.setTime(minutos)`) y la
 * lluvia de afuera (para actualizarla cada frame).
 */
export function buildClassroom({ maxAnisotropy }) {
  const group = new THREE.Group();
  group.name = 'classroom';
  const random = seededRandom(500);
  const parts = [];
  buildShell(parts);
  buildWindows(parts, group);
  const clock = buildBoard(parts, group);
  buildTeacherDesk(parts);
  buildClassmates(parts, random);
  buildDoor(parts);
  buildCorkBoard(parts, random);
  const rain = buildOutside(parts, group);
  group.add(mergeParts(parts, 'classroom-static'), buildFloor(maxAnisotropy));
  return { group, clock, rain, deskTopY: desk.height + 0.0125 };
}
