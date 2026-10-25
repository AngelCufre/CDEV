import { paint, box, corrugatedPanel } from '../../world/lowPoly.js';
import { facade, fBox, fGeometry, fGlass } from './buildKit.js';
import { buildStairHall, tube } from './stairHall.js';
import { createBanner, createPanel } from './signs.js';
import {
  STORY_HEIGHT,
  stairTower,
  towerDoor,
  flight,
  bridge,
  bridgeOpening,
  booth,
} from './layout.js';

/**
 * La torre de la escalera vidriada del patio (con el pasacalle), el puente techado que
 * sale de su 1° piso hacia el pasillo del Edificio Central, y el kiosco de avisos al pie.
 */

const STEEL = 0x7d8389;
const SLAB = 0xb9b5ad;
const RAIL = 0x3c3f42;
const SILVER = 0xb8bdc1;

const T = stairTower;
const FLOOR1 = STORY_HEIGHT;

function buildTower(ctx) {
  buildStairHall(ctx, {
    rect: T,
    height: T.height,
    flight,
    door: towerDoor,
    opening: { face: 'x+', from: bridgeOpening.minZ, to: bridgeOpening.maxZ },
  });

  // Cartel sobre la puerta y el pasacalle de afuera.
  const doorX = (towerDoor.minX + towerDoor.maxX) / 2;
  ctx.group.add(
    createPanel({
      width: 2.0,
      height: 0.42,
      x: doorX,
      y: 2.95,
      z: T.maxZ + 0.06,
      facing: 'z+',
      fog: true,
      background: '#1d3557',
      color: '#ffffff',
      lines: [
        { text: 'ESCALERA · 1° PISO', size: 0.11, bold: true },
        { text: 'Puente al Edificio Central', size: 0.08 },
      ],
    }),
    createBanner({
      width: 1.5,
      height: 5.2,
      x: 3.6,
      y: 7.6,
      z: T.maxZ + 0.12,
      facing: 'z+',
      lines: ['ELEGIMOS', 'ESTAR', 'TODO EL', 'AÑO', 'JUNTO A', 'VOS'],
    }),
  );
}

function buildBridge(ctx) {
  const P = ctx.parts;
  const b = bridge;
  const length = b.maxX - b.minX;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const width = b.maxZ - b.minZ;
  P.push(paint(box(length, 0.4, width + 0.2, cx, FLOOR1 - 0.2, cz), SLAB));
  P.push(paint(box(length, 0.25, 0.3, cx, FLOOR1 - 0.52, cz), 0x9d998f));
  P.push(paint(box(length, 0.02, width, cx, FLOOR1 + 0.01, cz), 0xa9a59d));
  P.push(paint(box(length, 0.25, width + 0.5, cx, 6.45, cz), 0x6f7477));
  tube(P, cx - 1.8, 6.32, cz);
  tube(P, cx + 1.8, 6.32, cz);
  // Costados: antepecho de chapa plateada, vidrio arriba y parantes.
  for (const [facing, z] of [
    ['z+', b.maxZ],
    ['z-', b.minZ],
  ]) {
    const f = facade(facing, z);
    const u = facing === 'z+' ? cx : -cx;
    const panel = corrugatedPanel(length, 1.0, { ribs: 'horizontal', pitch: 0.11, depth: 0.03 });
    P.push(paint(fGeometry(f, panel, u, FLOOR1 + 0.5, 0.02), SILVER));
    fBox(P, f, u, FLOOR1 + 0.5, -0.04, length, 1.0, 0.04, 0xa9adb0); // cara de adentro
    const panes = Math.round(length / 1.5);
    for (let i = 0; i < panes; i += 1) {
      fGlass(ctx, f, u - length / 2 + (i + 0.5) * (length / panes), 5.45, 0, length / panes, 1.7);
    }
    for (let i = 0; i <= panes; i += 1) {
      fBox(P, f, u - length / 2 + i * (length / panes), 4.95, 0.03, 0.08, 2.7, 0.08, STEEL);
    }
    fBox(P, f, u, FLOOR1 + 1.0, 0.06, length, 0.06, 0.12, RAIL);
    ctx.block(1, b.minX - 0.1, z - 0.15, b.maxX + 0.1, z + 0.15);
  }
}

function buildBooth(ctx) {
  const P = ctx.parts;
  const b = booth;
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const height = 2.5;
  P.push(paint(box(w, height, d, cx, height / 2, cz), 0xd8c3b4));
  P.push(paint(box(w + 0.6, 0.15, d + 0.6, cx, height + 0.075, cz), 0x9a948b));
  P.push(paint(box(0.04, 2.0, 0.85, b.minX - 0.02, 1.0, cz + 0.6), 0x8d969c));
  // Avisos pegados en la cara sur (la que se ve llegando por la calle interna).
  P.push(paint(box(1.7, 1.0, 0.03, cx, 1.55, b.maxZ + 0.015), 0xa77b4f));
  const papers = [
    {
      x: cx - 0.42,
      y: 1.62,
      width: 0.6,
      height: 0.78,
      tilt: 0.02,
      background: '#fbfbf7',
      lines: [
        { text: 'PARCIALES', size: 0.07, bold: true, color: '#b3261e' },
        { text: 'Diseño de Sistemas', size: 0.045, bold: true },
        { text: '3K5 · hoy 8 hs', size: 0.04 },
        { text: 'AULA 411', size: 0.08, bold: true, color: '#1d3557' },
        { text: '1° piso · aulas 400', size: 0.04 },
        { text: '(al lado del UTN FRC)', size: 0.04 },
      ],
    },
    {
      x: cx + 0.3,
      y: 1.78,
      width: 0.42,
      height: 0.3,
      tilt: -0.06,
      background: '#f3e48a',
      lines: [
        { text: 'SE BUSCA GRUPO', size: 0.04, bold: true },
        { text: 'para el TPI', size: 0.035 },
      ],
    },
    {
      x: cx + 0.55,
      y: 1.3,
      width: 0.36,
      height: 0.36,
      tilt: 0.05,
      background: '#bfe3f2',
      lines: [
        { text: 'BECAS', size: 0.06, bold: true },
        { text: 'inscripción', size: 0.035 },
        { text: 'abierta', size: 0.035 },
      ],
    },
    {
      x: cx + 0.12,
      y: 1.3,
      width: 0.3,
      height: 0.26,
      tilt: -0.03,
      background: '#f2b8c6',
      lines: [
        { text: 'Clases de apoyo', size: 0.032, bold: true },
        { text: 'Análisis Mat.', size: 0.03 },
      ],
    },
  ];
  papers.forEach((paper, i) => {
    ctx.group.add(
      createPanel({ ...paper, z: b.maxZ + 0.035 + i * 0.002, facing: 'z+', fog: true }),
    );
  });
  ctx.block(0, b.minX, b.minZ, b.maxX, b.maxZ);
  ctx.hitboxes.notices = ctx.hitbox(1.8, 1.2, 0.4, cx, 1.55, b.maxZ + 0.2);
}

/** La torre vidriada, el puente y el kiosco. */
export function buildStairTower(ctx) {
  buildTower(ctx);
  buildBridge(ctx);
  buildBooth(ctx);
}
