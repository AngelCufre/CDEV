import * as THREE from 'three';
import { paint, box } from '../../world/lowPoly.js';
import { fBox, fPlane, facadePoint } from './buildKit.js';
import { createPanel, createRoomPlate, createWayfindingSign } from './signs.js';

/**
 * Piezas de los pasillos de aulas (el del Central y el del edificio de vidrio): paredes con
 * zócalo, piso de mosaico, tubos, puertas de aula con mirilla y chapa, la doble puerta,
 * carteleras y carteles colgados. Las puertas y carteleras se ubican con un marco de
 * fachada (buildKit) sobre la cara de la pared que da al pasillo. Todo va a `ctx.interior`.
 */

export const WALL = 0xd9d1c0;
export const WAINSCOT = 0x7f8c86; // zócalo pintado
export const WAINSCOT_HEIGHT = 1.1;
export const CEILING = 0xe4e0d8;
const DOOR = 0x6b4f36;
export const FRAME = 0x3c3f42;
export const STEEL = 0x9aa0a6;
export const WOOD = 0x6b5a48;
const TUBE = 0xfdf8ec;
const LIT_ROOM = 0xf3dc9a;
const DARK_GLASS = 0x2f353c;
const PAPERS = [0xf5f2e8, 0xf3e48a, 0xf2b8c6, 0xbfe3f2];
const TILE_METERS = 0.8; // una repetición de la textura = 2×2 baldosas de 40 cm

/** Caja de pared de (x0, z0) a (x1, z1) en planta, entre las alturas y0 e y1. */
export function wallBox(ctx, x0, z0, x1, z1, y0, y1, color = WALL) {
  ctx.interior.push(
    paint(box(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), color),
  );
}

/** Piso de mosaico con UV en metros (la textura sigue igual de un tramo al otro). */
export function addFloorTiles(ctx, area, y) {
  const geo = new THREE.PlaneGeometry(area.maxX - area.minX, area.maxZ - area.minZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate((area.minX + area.maxX) / 2, y + 0.002, (area.minZ + area.maxZ) / 2);
  const position = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < position.count; i += 1) {
    uv.setXY(i, position.getX(i) / TILE_METERS, position.getZ(i) / TILE_METERS);
  }
  ctx.floorGeos.push(geo);
}

/** Tubo fluorescente (prendido) en un cielorraso a la altura `y`. */
export function addTube(ctx, x, y, z, alongZ = true) {
  const [w, d] = alongZ ? [0.22, 1.3] : [1.3, 0.22];
  ctx.interior.push(paint(box(w, 0.05, d, x, y - 0.025, z), 0xcfd2d4));
  ctx.interior.push(paint(box(w * 0.55, 0.03, d * 0.92, x, y - 0.06, z), TUBE, { shaded: false }));
}

/** Caja invisible de interacción delante de una pared (a `u` de la fachada `f`). */
function hitboxOn(ctx, f, u, y, width, height) {
  const [x, z] = facadePoint(f, u, 0.2);
  const [w, d] = f.ux ? [width, 0.4] : [0.4, width];
  return ctx.hitbox(w, height, d, x, y, z);
}

/**
 * Puerta de aula sobre la cara `f` de una pared, centrada en `u`, con el piso en `floorY`:
 * hoja, marco, manija, mirilla (con luz o a oscuras) y la chapa con el número. `lit` fuerza
 * la luz de la mirilla. Devuelve su caja de interacción.
 */
export function classroomDoor(ctx, f, u, floorY, { number, random, lit = random() < 0.65 }) {
  const I = ctx.interior;
  fBox(I, f, u, floorY + 1.05, 0.025, 1.0, 2.1, 0.05, DOOR);
  for (const du of [-0.54, 0.54]) fBox(I, f, u + du, floorY + 1.09, 0.035, 0.08, 2.18, 0.07, FRAME);
  fBox(I, f, u, floorY + 2.14, 0.035, 1.16, 0.08, 0.07, FRAME);
  fBox(I, f, u + 0.35, floorY + 1.0, 0.07, 0.12, 0.03, 0.05, STEEL);
  fPlane(I, f, u - 0.22, floorY + 1.45, 0.051, 0.22, 0.5, lit ? LIT_ROOM : DARK_GLASS, {
    shaded: !lit,
  });
  const [x, z] = facadePoint(f, u, 0.005);
  ctx.group.add(createRoomPlate({ number, x, y: floorY + 2.45, z, facing: f.facing }));
  return hitboxOn(ctx, f, u, floorY + 1.05, 1.0, 2.1);
}

/** Doble puerta con un cartel arriba (`label`). Devuelve su caja de interacción. */
export function doubleDoor(ctx, f, u, floorY, { label, width = 1.8, height = 2.2 }) {
  const I = ctx.interior;
  const half = width / 2;
  const leaf = half - 0.02;
  for (const side of [-1, 1]) {
    fBox(I, f, u + side * (leaf / 2 + 0.01), floorY + height / 2, 0.025, leaf, height, 0.05, DOOR);
    fPlane(I, f, u + side * 0.3, floorY + 1.45, 0.051, 0.2, 0.5, LIT_ROOM, { shaded: false });
    fBox(I, f, u + side * 0.12, floorY + 1.0, 0.07, 0.12, 0.03, 0.05, STEEL);
    fBox(
      I,
      f,
      u + side * (half + 0.04),
      floorY + height / 2 + 0.04,
      0.035,
      0.08,
      height + 0.08,
      0.07,
      FRAME,
    );
  }
  fBox(I, f, u, floorY + height + 0.04, 0.035, width + 0.16, 0.08, 0.07, FRAME);
  const [x, z] = facadePoint(f, u, 0.005);
  ctx.group.add(
    createPanel({
      width: 0.9,
      height: 0.3,
      x,
      y: floorY + 2.65,
      z,
      facing: f.facing,
      background: '#1d3557',
      color: '#ffffff',
      lines: [{ text: label, size: 0.15, bold: true }],
    }),
  );
  return hitboxOn(ctx, f, u, floorY + height / 2, width, height);
}

/** Papel pegado sobre una puerta o pared (por ejemplo, el aviso del parcial). */
export function stuckPaper(ctx, f, u, y, lines) {
  const [x, z] = facadePoint(f, u, 0.056);
  ctx.group.add(
    createPanel({
      width: 0.3,
      height: 0.21,
      x,
      y,
      z,
      facing: f.facing,
      tilt: 0.04,
      background: '#fbfbf7',
      lines,
    }),
  );
}

/** Cartelera de corcho con papeles de colores. */
export function corkBoard(ctx, f, u, floorY, random) {
  const I = ctx.interior;
  const y = floorY + 1.55;
  fBox(I, f, u, y, 0.015, 1.3, 0.85, 0.03, 0xa77b4f);
  for (let i = 0; i < 5; i += 1) {
    const w = 0.16 + random() * 0.12;
    const h = 0.2 + random() * 0.1;
    const color = PAPERS[Math.floor(random() * PAPERS.length)];
    fPlane(
      I,
      f,
      u - 0.45 + random() * 0.9,
      y - 0.2 + random() * 0.4,
      0.031 + i * 0.001,
      w,
      h,
      color,
    );
  }
}

/** Cartel azul plano sobre una pared (de frente a quien llega). */
export function wallSign(ctx, f, u, y, { lines, width = 1.9, height = 0.62, header = null }) {
  const [x, z] = facadePoint(f, u, 0.01);
  ctx.group.add(
    createPanel({
      width,
      height,
      x,
      y,
      z,
      facing: f.facing,
      header,
      background: '#1d3557',
      color: '#ffffff',
      lines,
    }),
  );
}

/**
 * Cartel colgado del cielorraso con dos varillas, atravesado al pasillo en (x, z): `front`
 * se lee mirando hacia `facing` ('z-', 'z+', 'x-' o 'x+' según de qué lado mira la cara) y
 * `back` del otro lado.
 */
export function hangingSign(ctx, { x, z, ceilingY, facing, front, back, width = 1.9 }) {
  const y = ceilingY - 0.55;
  const alongX = facing === 'z+' || facing === 'z-';
  for (const d of [-width / 2 + 0.15, width / 2 - 0.15]) {
    const [rx, rz] = alongX ? [x + d, z] : [x, z + d];
    ctx.interior.push(paint(box(0.015, 0.35, 0.015, rx, ceilingY - 0.18, rz), STEEL));
  }
  const opposite = { 'z+': 'z-', 'z-': 'z+', 'x+': 'x-', 'x-': 'x+' }[facing];
  const offset = (dir) => {
    const sign = dir.endsWith('+') ? 1 : -1;
    return alongX ? [x, z + sign * 0.006] : [x + sign * 0.006, z];
  };
  const [fx, fz] = offset(facing);
  const [bx, bz] = offset(opposite);
  ctx.group.add(
    createWayfindingSign({ text: front, width, x: fx, y, z: fz, facing }),
    createWayfindingSign({ text: back, width, x: bx, y, z: bz, facing: opposite }),
  );
}
