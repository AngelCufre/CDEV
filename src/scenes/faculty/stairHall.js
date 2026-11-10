import * as THREE from 'three';
import { paint, box } from '../../world/lowPoly.js';
import { facade, fBox, fGlass } from './buildKit.js';
import { STORY_HEIGHT } from './layout.js';

/**
 * Caja vidriada de escalera, como la torre del patio o el hall del edificio de vidrio: un
 * tramo recto pegado a la pared oeste que sube hacia el norte (-z) de la planta baja al 1°
 * piso, el descanso de arriba, el resto del 1° piso como entrepiso (con baranda al hueco),
 * un depósito bajo el descanso y vidrio con parantes de acero en las caras. Arriba del
 * cielorraso del 1° piso solo se ven, de afuera, las losas y los tramos que siguen.
 */

const STEEL = 0x7d8389;
const SLAB = 0xb9b5ad;
const STEP = 0xb7b2a8;
const NOSING = 0x5b5852;
const RAIL = 0x3c3f42;
const FASCIA = 0x9aa0a6;
const CEILING = 0xe4e0d8;
const TUBE = 0xfdf8ec;

const FLOOR1 = STORY_HEIGHT;
const CEILING1 = STORY_HEIGHT + 3.3; // cielorraso del 1° piso
const DOOR_TOP = 2.4;
const OPENING_TOP = FLOOR1 + 2.6;

/** Tubo fluorescente prendido en un cielorraso a la altura `y`. */
export function tube(P, x, y, z, alongZ = false) {
  const [w, d] = alongZ ? [0.22, 1.3] : [1.3, 0.22];
  P.push(paint(box(w, 0.05, d, x, y - 0.025, z), 0xcfd2d4));
  P.push(paint(box(w * 0.92, 0.03, d * 0.55, x, y - 0.06, z), TUBE, { shaded: false }));
}

/** Escalones de un tramo a lo largo de z, de `fromZ` (abajo, altura `y0`) hacia `toZ`. */
function steps(P, { minX, maxX, fromZ, toZ, y0, count, solid }) {
  const run = (toZ - fromZ) / count; // negativo si sube hacia -z
  const rise = STORY_HEIGHT / count;
  const width = maxX - minX;
  const cx = (minX + maxX) / 2;
  for (let i = 0; i < count; i += 1) {
    const top = y0 + (i + 1) * rise;
    const z = fromZ + (i + 0.5) * run;
    // Macizo hasta el piso (el tramo de abajo) o escalón suelto sobre la losa inclinada.
    const height = solid ? top - y0 : rise * 2;
    P.push(paint(box(width, height, Math.abs(run), cx, top - height / 2, z), STEP));
    const nose = fromZ + i * run + Math.sign(run) * 0.025;
    P.push(paint(box(width, 0.012, 0.05, cx, top + 0.006, nose), NOSING));
  }
}

/** La coordenada u de una fachada para una coordenada de mundo sobre su eje. */
const toU = { 'z+': (x) => x, 'z-': (x) => -x, 'x-': (z) => z, 'x+': (z) => -z };

/**
 * Bordes de las columnas de vidrio de una cara, de `from` a `to` (en u), con paños de
 * ~1,25 m y la abertura `gap` ([desde, hasta] en u) como una columna propia.
 */
function columns(from, to, gap) {
  const split = (a, b) => {
    const count = Math.max(1, Math.round((b - a) / 1.25));
    return Array.from({ length: count }, (_, i) => a + ((b - a) * i) / count);
  };
  if (!gap) return [...split(from, to), to];
  return [...split(from, gap[0]), ...split(gap[0], gap[1]), ...split(gap[1], to), to];
}

/**
 * - `rect`: líneas de las paredes; `height`: hasta dónde llega el vidrio (el techo).
 * - `flight`: el tramo ({ minX, maxX, minZ, maxZ, steps }), pegado a la pared oeste.
 * - `door`: { minX, maxX } en la pared sur, en planta baja.
 * - `opening`: { face, from, to } abertura del 1° piso (coordenadas de mundo sobre la pared).
 * - `skipFaces`: caras que arma otro (sin vidrio ni colisión), por ejemplo una pared
 *   compartida con un pasillo.
 * - `sideGlassFromZ`: en las caras este y oeste, vidrio solo al sur de esta z (cuando el
 *   hall sobresale de un edificio, el resto de esas caras es pared del edificio).
 */
export function buildStairHall(
  ctx,
  { rect, height, flight, door, opening, skipFaces = [], sideGlassFromZ = -Infinity },
) {
  const P = ctx.parts;
  const cx = (rect.minX + rect.maxX) / 2;
  const cz = (rect.minZ + rect.maxZ) / 2;
  const w = rect.maxX - rect.minX;
  const d = rect.maxZ - rect.minZ;
  const inner = {
    minX: rect.minX + 0.1,
    maxX: rect.maxX - 0.1,
    minZ: rect.minZ + 0.1,
    maxZ: rect.maxZ - 0.1,
  };

  // Columnas de las esquinas, losas (con el canto a la vista en cada nivel) y techo.
  for (const x of [rect.minX, rect.maxX]) {
    for (const z of [rect.minZ, rect.maxZ]) {
      P.push(paint(box(0.26, height, 0.26, x, height / 2, z), STEEL));
    }
  }
  const slab = (minX, maxX, minZ, maxZ, y, color = SLAB) =>
    P.push(
      paint(
        box(maxX - minX, 0.3, maxZ - minZ, (minX + maxX) / 2, y - 0.15, (minZ + maxZ) / 2),
        color,
      ),
    );
  // 1° piso: el descanso de arriba y el entrepiso del este (el hueco queda abierto).
  slab(inner.minX, inner.maxX, inner.minZ, flight.minZ, FLOOR1);
  slab(flight.maxX, inner.maxX, flight.minZ, inner.maxZ, FLOOR1);
  slab(inner.minX, inner.maxX, inner.minZ, inner.maxZ, CEILING1 + 0.3, CEILING);
  if (height > 11) slab(inner.minX, inner.maxX, inner.minZ, flight.minZ, 10.8);
  slab(rect.minX - 0.15, rect.maxX + 0.15, rect.minZ - 0.15, rect.maxZ + 0.15, height, 0x6f7477);
  for (const y of [FLOOR1, 7.2, 10.8]) {
    if (y > height - 0.5) continue;
    for (const side of [-1, 1]) {
      P.push(paint(box(w + 0.1, 0.32, 0.12, cx, y - 0.16, cz + (side * d) / 2), FASCIA));
      P.push(paint(box(0.12, 0.32, d + 0.1, cx + (side * w) / 2, y - 0.16, cz), FASCIA));
    }
  }
  for (const side of [-1, 1]) {
    P.push(paint(box(w + 0.5, 0.9, 0.1, cx, height + 0.3, cz + side * (d / 2 + 0.2)), FASCIA));
    P.push(paint(box(0.1, 0.9, d + 0.5, cx + side * (w / 2 + 0.2), height + 0.3, cz), FASCIA));
  }

  // Cielorrasos, tubos y el piso de la planta baja.
  const eastCx = (flight.maxX + inner.maxX) / 2;
  const eastCz = (flight.minZ + inner.maxZ) / 2;
  P.push(
    paint(
      box(inner.maxX - flight.maxX, 0.02, inner.maxZ - flight.minZ, eastCx, FLOOR1 - 0.31, eastCz),
      CEILING,
    ),
  );
  tube(P, eastCx, FLOOR1 - 0.32, eastCz + 1, true);
  tube(P, eastCx, CEILING1, eastCz, true);
  tube(P, (inner.minX + flight.maxX) / 2 + 0.6, CEILING1, (inner.minZ + flight.minZ) / 2);
  P.push(
    paint(box(inner.maxX - inner.minX, 0.02, inner.maxZ - inner.minZ, cx, 0.01, cz), 0xa9a59d),
  );

  // Vidrios, salteando la puerta y la abertura del 1° piso.
  const faces = {
    'z+': { f: facade('z+', rect.maxZ), from: rect.minX, to: rect.maxX },
    'z-': { f: facade('z-', rect.minZ), from: -rect.maxX, to: -rect.minX },
    'x-': { f: facade('x-', rect.minX), from: Math.max(rect.minZ, sideGlassFromZ), to: rect.maxZ },
    'x+': {
      f: facade('x+', rect.maxX),
      from: -rect.maxZ,
      to: Math.min(-rect.minZ, -sideGlassFromZ),
    },
  };
  const baseRows = [0, 1.8, FLOOR1, 5.4, 7.2, 9, 10.8, 12.6].filter((v) => v < height - 0.6);
  for (const [name, { f, from, to }] of Object.entries(faces)) {
    if (skipFaces.includes(name)) continue;
    let gap = null;
    let rows = [...baseRows, height - 0.3];
    let holeRow = -1;
    if (name === 'z+') {
      gap = [door.minX, door.maxX];
      rows = rows.map((v) => (v === 1.8 ? DOOR_TOP : v));
      holeRow = 0;
    } else if (opening?.face === name) {
      const a = toU[name](opening.from);
      const b = toU[name](opening.to);
      gap = [Math.min(a, b), Math.max(a, b)];
      rows = rows.map((v) => (v === 5.4 ? OPENING_TOP : v));
      holeRow = rows.indexOf(FLOOR1);
    }
    const us = columns(from, to, gap);
    const holeCol = gap ? us.indexOf(gap[0]) : -1;
    for (let col = 0; col < us.length - 1; col += 1) {
      for (let row = 0; row < rows.length - 1; row += 1) {
        if (col === holeCol && row === holeRow) continue;
        const u = (us[col] + us[col + 1]) / 2;
        const v = (rows[row] + rows[row + 1]) / 2;
        fGlass(ctx, f, u, v, 0, us[col + 1] - us[col], rows[row + 1] - rows[row]);
      }
    }
    const top = rows[rows.length - 1];
    for (const u of us) fBox(P, f, u, top / 2, 0.02, 0.07, top, 0.1, STEEL);
    for (const v of rows) fBox(P, f, (from + to) / 2, v, 0.02, to - from, 0.07, 0.1, STEEL);
  }

  // Tramo (macizo) con pasamanos, y los tramos de arriba que se ven de afuera.
  const flightSpec = { minX: flight.minX, maxX: flight.maxX, count: flight.steps };
  steps(P, { ...flightSpec, fromZ: flight.maxZ, toZ: flight.minZ, y0: 0, solid: true });
  if (height >= 7.2 + STORY_HEIGHT) {
    steps(P, { ...flightSpec, fromZ: flight.maxZ, toZ: flight.minZ, y0: 7.2, solid: false });
  }
  if (height >= 10.8 + STORY_HEIGHT) {
    const east = { minX: inner.maxX - (flight.maxX - flight.minX), maxX: inner.maxX };
    steps(P, { ...east, count: flight.steps, fromZ: flight.minZ, toZ: flight.maxZ, y0: 10.8 });
  }
  const run = flight.maxZ - flight.minZ;
  const rail = (x) => {
    const geo = new THREE.BoxGeometry(0.05, 0.05, Math.hypot(run, FLOOR1));
    geo.rotateX(Math.atan2(FLOOR1, run));
    geo.translate(x, FLOOR1 / 2 + 0.9, (flight.minZ + flight.maxZ) / 2);
    P.push(paint(geo, RAIL));
  };
  rail(flight.minX + 0.05);
  rail(flight.maxX + 0.05);
  for (let i = 0; i < 5; i += 1) {
    const z = flight.maxZ - 0.2 - (i * (run - 0.4)) / 4;
    const ground = ((flight.maxZ - z) / run) * FLOOR1;
    P.push(paint(box(0.04, 0.9, 0.04, flight.maxX + 0.05, ground + 0.45, z), RAIL));
  }
  // Baranda del hueco en el 1° piso.
  const holeLength = inner.maxZ - flight.minZ;
  const holeCz = (flight.minZ + inner.maxZ) / 2;
  P.push(paint(box(0.05, 0.05, holeLength, flight.maxX + 0.05, FLOOR1 + 0.95, holeCz), RAIL));
  P.push(paint(box(0.03, 0.03, holeLength, flight.maxX + 0.05, FLOOR1 + 0.5, holeCz), RAIL));
  for (let z = flight.minZ; z <= inner.maxZ; z += 1.1) {
    P.push(paint(box(0.04, 0.95, 0.04, flight.maxX + 0.05, FLOOR1 + 0.475, z), RAIL));
  }
  // Depósito debajo del descanso de arriba.
  const closetDepth = flight.minZ - inner.minZ;
  const closetH = FLOOR1 - 0.3;
  const closetCx = (inner.minX + flight.maxX) / 2;
  const closetCz = (inner.minZ + flight.minZ) / 2;
  P.push(
    paint(
      box(flight.maxX - inner.minX, closetH, closetDepth, closetCx, closetH / 2, closetCz),
      0xd8d4cc,
    ),
  );
  P.push(paint(box(0.04, 2.0, 0.85, flight.maxX + 0.02, 1.0, closetCz), 0x8d969c));

  // Colisiones. Planta baja: paredes (con la puerta), costado del tramo y el depósito.
  const t = 0.1;
  const wall = (floor, name, gapFrom, gapTo) => {
    if (skipFaces.includes(name)) return;
    const alongX = name === 'z+' || name === 'z-';
    const at = { 'z+': rect.maxZ, 'z-': rect.minZ, 'x-': rect.minX, 'x+': rect.maxX }[name];
    const [a, b] = alongX ? [rect.minX, rect.maxX] : [rect.minZ, rect.maxZ];
    const pieces =
      gapFrom === undefined
        ? [[a, b]]
        : [
            [a, gapFrom],
            [gapTo, b],
          ];
    for (const [p, q] of pieces) {
      if (alongX) ctx.block(floor, p, at - t, q, at + t);
      else ctx.block(floor, at - t, p, at + t, q);
    }
  };
  wall(0, 'z+', door.minX, door.maxX);
  for (const name of ['z-', 'x-', 'x+']) wall(0, name);
  ctx.block(0, flight.maxX, flight.minZ, flight.maxX + 0.1, flight.maxZ);
  ctx.block(0, inner.minX, inner.minZ, flight.maxX + 0.1, flight.minZ);
  // 1° piso: paredes (con la abertura) y la baranda del hueco.
  for (const name of ['z+', 'z-', 'x-', 'x+']) {
    if (opening?.face === name) {
      wall(1, name, Math.min(opening.from, opening.to), Math.max(opening.from, opening.to));
    } else {
      wall(1, name);
    }
  }
  ctx.block(1, flight.maxX, flight.minZ, flight.maxX + 0.1, rect.maxZ);
}
