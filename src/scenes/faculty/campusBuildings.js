import * as THREE from 'three';
import { paint, box, corrugatedPanel } from '../../world/lowPoly.js';
import { buildCables } from '../../world/buildings.js';
import { facade, fBox, fPlane, fGeometry, fGlass } from './buildKit.js';
import { createPanel, createLogoSign, createWayfindingSign } from './signs.js';
import {
  STORY_HEIGHT,
  longBuilding,
  upperFacadeX,
  gallery,
  labDoorsZ,
  emergencyCore,
  emergencyDoorZ,
  corridor,
  bridgeOpening,
  bridge,
  frcBuilding,
  frcEntrance,
  solarBuilding,
  concreteBlock,
  pavilion,
  auditorium,
  madders,
  maddersGlass,
  antenna,
} from './layout.js';

/**
 * Los edificios del campus vistos desde afuera, sacados de las fotos: el edificio largo
 * (galería con columnas, faja de chapa plateada, parasoles y la chapa ocre arriba), la
 * torre de hormigón de la escalera de emergencia, el edificio UTN FRC (panel negro, logo),
 * el de una planta con paneles solares, el bloque de hormigón con ventanitas cuadradas y
 * los del fondo. Todo con sombreado horneado (`paint`) en `ctx.parts`.
 */

const CREAM = 0xe2d2ad; // revoque de la planta baja
const CREAM_SHADE = 0xcbb991;
const CONCRETE = 0xc9c4b8; // hormigón visto
const CONCRETE_DARK = 0xa8a297;
const OCHRE = 0xc7a65c;
const SILVER = 0xb8bdc1;
const GLASS_DARK = 0x39424a;
const GLASS_SKY = 0x8d9aa5; // vidrio que refleja el cielo nublado
const FRAME = 0x3c3f42;
const GRILLE = 0x707a80;
const BLACK_PANEL = 0x26282b;
const WHITE = 0xe9e7e0;
const ROOF_DARK = 0x55595c;
const STONE = 0x9c9a94;

const GROUND_TOP = 3.5; // techo de la planta baja del edificio largo (abajo de la losa)
const SLAB_TOP = 3.58; // losa de la galería: apenas debajo del piso del pasillo
const UPPER_TOP = STORY_HEIGHT + 3.2; // cielorraso del 1° piso

// ---------- Piezas de fachada ----------

/** Ventana con marco y parteluces: vidrio, marco y antepecho. */
function framedWindow(P, f, u, v, width, height, options = {}) {
  const { glass = GLASS_SKY, frame = WHITE, panes = 2, sill = CREAM_SHADE } = options;
  fPlane(P, f, u, v, 0.01, width, height, glass);
  const t = 0.06;
  fBox(P, f, u, v + height / 2, 0.03, width + t, t, 0.06, frame);
  fBox(P, f, u, v - height / 2, 0.03, width + t, t, 0.06, frame);
  for (const side of [-1, 1]) fBox(P, f, u + (side * width) / 2, v, 0.03, t, height, 0.06, frame);
  for (let i = 1; i < panes; i += 1) {
    fBox(P, f, u - width / 2 + (i * width) / panes, v, 0.025, 0.04, height, 0.04, frame);
  }
  if (sill !== null) fBox(P, f, u, v - height / 2 - 0.05, 0.07, width + 0.2, 0.06, 0.14, sill);
}

/** Ventana de planta baja con reja de barrotes. */
function grilledWindow(P, f, u, v, width, height) {
  fPlane(P, f, u, v, 0.01, width, height, GLASS_DARK);
  for (let x = -width / 2 + 0.11; x < width / 2; x += 0.22) {
    fBox(P, f, u + x, v, 0.06, 0.025, height, 0.025, GRILLE);
  }
  for (const dv of [-height / 2, 0, height / 2]) {
    fBox(P, f, u, v + dv, 0.06, width, 0.04, 0.03, GRILLE);
  }
  fBox(P, f, u, v - height / 2 - 0.06, 0.06, width + 0.16, 0.07, 0.12, CREAM_SHADE);
}

/** Rejilla de ventilación con lamas. */
function louverVent(P, f, u, v, width, height) {
  fBox(P, f, u, v, 0.04, width + 0.08, height + 0.08, 0.08, GRILLE);
  for (let y = -height / 2 + 0.07; y < height / 2; y += 0.12) {
    const slat = new THREE.BoxGeometry(width, 0.02, 0.1);
    slat.rotateX(-0.6);
    P.push(paint(fGeometry(f, slat, u, v + y, 0.1), SILVER));
  }
}

/** Chapa trapezoidal sobre una fachada; `lean` la inclina hacia afuera arriba (m). */
function corrugated(P, f, u, v, length, height, color, options = {}) {
  const { lean = 0, w = 0, ...panel } = options;
  const geo = corrugatedPanel(length, height, panel);
  if (lean) {
    const position = geo.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const t = position.getY(i) / height + 0.5;
      position.setZ(i, position.getZ(i) + t * lean);
    }
    geo.computeVertexNormals();
  }
  P.push(paint(fGeometry(f, geo, u, v, w), color));
}

/** Caño (cilindro) entre dos puntos. */
function strut(P, a, b, radius, color, segments = 6) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const geo = new THREE.CylinderGeometry(radius, radius, direction.length(), segments);
  geo.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
  );
  geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  P.push(paint(geo, color));
}

/** Techo a dos aguas con la cumbrera a lo largo de z: prisma triangular + dos faldones. */
function gableRoofAlongZ(P, { minX, maxX, minZ, maxZ, y, rise, wall, roof }) {
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const prism = new THREE.CylinderGeometry(1, 1, depth, 3);
  prism.rotateX(Math.PI / 2);
  prism.rotateZ(Math.PI); // un vértice hacia arriba
  // Del triángulo equilátero de radio 1 al de base `width` y alto `rise`.
  prism.scale(width / Math.sqrt(3), rise / 1.5, 1);
  prism.translate(cx, y + rise / 3, cz);
  P.push(paint(prism, wall));
  const slope = Math.hypot(width / 2, rise);
  const angle = Math.atan2(rise, width / 2);
  for (const side of [-1, 1]) {
    const sheet = new THREE.BoxGeometry(slope + 0.5, 0.06, depth + 0.6);
    sheet.rotateZ(-side * angle);
    sheet.translate(cx + (side * width) / 4 + side * 0.12, y + rise / 2 + 0.05, cz);
    P.push(paint(sheet, roof));
  }
}

// ---------- Edificio largo ----------

function buildLongBuilding(ctx) {
  const P = ctx.parts;
  const b = longBuilding;
  const length = b.maxZ - b.minZ;
  const midZ = (b.minZ + b.maxZ) / 2;
  const backX = corridor.maxX + 0.1; // atrás de la pared de las aulas
  const sx = b.maxX - b.minX;

  // Volúmenes: planta baja, aulas del 1° piso (detrás del pasillo) y el 2° piso entero.
  P.push(paint(box(sx, GROUND_TOP, length, (b.minX + b.maxX) / 2, GROUND_TOP / 2, midZ), CREAM));
  const upperHeight = UPPER_TOP - GROUND_TOP;
  P.push(
    paint(
      box(
        b.maxX - backX,
        upperHeight,
        length,
        (backX + b.maxX) / 2,
        GROUND_TOP + upperHeight / 2,
        midZ,
      ),
      CONCRETE,
    ),
  );
  for (const [z0, z1] of [
    [corridor.maxZ, b.maxZ],
    [b.minZ, corridor.minZ],
  ]) {
    P.push(
      paint(
        box(
          backX - upperFacadeX,
          upperHeight,
          z1 - z0,
          (upperFacadeX + backX) / 2,
          GROUND_TOP + upperHeight / 2,
          (z0 + z1) / 2,
        ),
        CONCRETE,
      ),
    );
  }
  const topX = 12.4;
  P.push(
    paint(box(b.maxX - topX, 4.6, length, (topX + b.maxX) / 2, UPPER_TOP + 2.3, midZ), CONCRETE),
  );
  P.push(
    paint(box(b.maxX - topX - 0.3, 0.1, length - 0.3, (topX + b.maxX) / 2, 11.45, midZ), ROOF_DARK),
  );
  ctx.block(0, b.minX, b.minZ, b.maxX, b.maxZ);

  // Planta baja, cara oeste: pilastras cada 4 m, ventanas enrejadas, puertas y rejillas.
  const west = facade('x-', b.minX);
  for (let z = b.minZ; z <= b.maxZ + 0.01; z += 4) {
    fBox(P, west, z, GROUND_TOP / 2, 0.06, 0.32, GROUND_TOP, 0.12, CREAM_SHADE);
  }
  for (let z = b.minZ + 2; z < emergencyCore.minZ; z += 4) {
    if (labDoorsZ.some((door) => Math.abs(door - z) < 1)) continue;
    if (z === -30 || z === -10) louverVent(P, west, z, 2.2, 1.6, 1.0);
    else grilledWindow(P, west, z, 1.75, 2.6, 1.5);
  }
  ctx.hitboxes.labDoors = labDoorsZ.map((z) => {
    fBox(P, west, z, 1.15, 0.03, 1.6, 2.3, 0.06, 0x5f6f7a);
    fPlane(P, west, z, 1.75, 0.065, 1.3, 0.7, GLASS_DARK);
    fBox(P, west, z, 2.36, 0.05, 1.8, 0.1, 0.1, FRAME);
    for (const side of [-1, 1]) fBox(P, west, z + side * 0.85, 1.18, 0.05, 0.1, 2.36, 0.1, FRAME);
    fBox(P, west, z + 0.55, 1.0, 0.09, 0.14, 0.03, 0.05, SILVER);
    return ctx.hitbox(0.4, 2.3, 1.6, b.minX - 0.2, 1.15, z);
  });
  // Caño de gas amarillo que sube por la pared (como en la foto de la galería).
  const gasZ = -27.6;
  strut(P, new THREE.Vector3(13.9, 0.2, gasZ), new THREE.Vector3(13.9, 2.9, gasZ), 0.035, 0xd2a12a);
  strut(
    P,
    new THREE.Vector3(13.9, 2.9, gasZ),
    new THREE.Vector3(13.9, 2.9, gasZ + 3),
    0.035,
    0xd2a12a,
  );

  // Galería: losa con nervios a la vista, viga de borde con paletas colgando y columnas.
  const galleryLength = gallery.maxZ - gallery.minZ;
  const galleryMidZ = (gallery.minZ + gallery.maxZ) / 2;
  const slabFrom = gallery.edgeX - 0.1;
  P.push(
    paint(
      box(
        b.minX - slabFrom,
        0.3,
        galleryLength,
        (slabFrom + b.minX) / 2,
        SLAB_TOP - 0.15,
        galleryMidZ,
      ),
      CONCRETE,
    ),
  );
  for (let z = gallery.minZ + 0.5; z < gallery.maxZ; z += 1) {
    P.push(
      paint(
        box(
          b.minX - gallery.edgeX - 0.1,
          0.3,
          0.12,
          (gallery.edgeX + b.minX) / 2,
          SLAB_TOP - 0.45,
          z,
        ),
        CONCRETE_DARK,
      ),
    );
    const paddle = new THREE.BoxGeometry(0.34, 0.62, 0.05);
    paddle.rotateZ(0.28);
    paddle.translate(gallery.edgeX - 0.02, 2.5, z);
    P.push(paint(paddle, 0xd9d4c8));
  }
  P.push(
    paint(
      box(0.3, 0.85, galleryLength, gallery.edgeX + 0.05, SLAB_TOP - 0.42, galleryMidZ),
      CONCRETE,
    ),
  );
  for (let z = gallery.minZ + 2; z < gallery.maxZ; z += 4) {
    P.push(
      paint(box(0.36, SLAB_TOP - 0.85, 0.6, gallery.edgeX + 0.3, (SLAB_TOP - 0.85) / 2, z), CREAM),
    );
    ctx.block(0, gallery.edgeX + 0.1, z - 0.32, gallery.edgeX + 0.5, z + 0.32);
  }
  // Alero del 1° piso donde no hay galería (hasta la torre de hormigón).
  const eaveLength = emergencyCore.minZ - gallery.maxZ;
  const eaveMidZ = (gallery.maxZ + emergencyCore.minZ) / 2;
  P.push(
    paint(
      box(
        b.minX - upperFacadeX + 0.1,
        0.3,
        eaveLength,
        (upperFacadeX - 0.1 + b.minX) / 2,
        SLAB_TOP - 0.15,
        eaveMidZ,
      ),
      CONCRETE,
    ),
  );

  // Faja de chapa plateada (persiana) en el borde de la galería (cortada donde pasa el
  // puente) y del alero.
  for (const [z0, z1] of [
    [gallery.minZ, bridge.minZ],
    [bridge.maxZ, gallery.maxZ],
  ]) {
    corrugated(P, facade('x-', gallery.edgeX - 0.1), (z0 + z1) / 2, 3.8, z1 - z0, 1.1, SILVER, {
      ribs: 'horizontal',
      pitch: 0.11,
      depth: 0.035,
    });
    P.push(paint(box(0.12, 0.06, z1 - z0, gallery.edgeX - 0.08, 4.38, (z0 + z1) / 2), SILVER));
  }
  corrugated(P, facade('x-', upperFacadeX - 0.1), eaveMidZ, 3.8, eaveLength, 1.1, SILVER, {
    ribs: 'horizontal',
    pitch: 0.11,
    depth: 0.035,
  });
  corrugated(
    P,
    facade('z+', gallery.maxZ),
    (gallery.edgeX - 0.1 + upperFacadeX - 0.1) / 2,
    3.8,
    upperFacadeX - gallery.edgeX,
    1.1,
    SILVER,
    { ribs: 'horizontal', pitch: 0.11, depth: 0.035 },
  );

  // 1° piso, cara oeste: vidrios (transparentes: se ve el pasillo) entre parantes, y los
  // parasoles de hormigón colgando de la losa de arriba.
  const upper = facade('x-', upperFacadeX);
  const windowBottom = STORY_HEIGHT + 0.8;
  const windowTop = UPPER_TOP - 0.2;
  const windowHeight = windowTop - windowBottom;
  const windowV = (windowBottom + windowTop) / 2;
  for (const [from, to] of [
    [corridor.minZ, bridgeOpening.minZ],
    [bridgeOpening.maxZ, emergencyCore.minZ],
  ]) {
    const count = Math.round((to - from) / 1.6);
    const pane = (to - from) / count;
    for (let i = 0; i < count; i += 1) {
      fGlass(ctx, upper, from + (i + 0.5) * pane, windowV, 0, pane, windowHeight);
    }
    for (let i = 0; i <= count; i += 1) {
      const z = from + i * pane;
      fBox(P, upper, z, windowV, 0, 0.08, windowHeight, 0.12, FRAME);
      // Sin parasol en los bordes del puente: quedaría metido en el paso.
      if (z > bridgeOpening.minZ - 0.3 && z < bridgeOpening.maxZ + 0.3) continue;
      const finHeight = UPPER_TOP - windowBottom;
      fBox(P, upper, z, windowBottom + finHeight / 2, 0.45, 0.12, finHeight, 0.5, CONCRETE);
    }
    for (const v of [windowBottom, windowTop]) {
      fBox(P, upper, (from + to) / 2, v, 0, to - from, 0.08, 0.12, FRAME);
    }
  }

  // 2° piso: ventanas corridas altas y la faja de chapa ocre inclinada, que da la vuelta.
  const top = facade('x-', topX);
  fPlane(P, top, midZ, 8.6, 0.01, length - 0.4, 0.9, GLASS_DARK);
  for (let z = b.minZ + 0.2; z <= b.maxZ - 0.2; z += 1.2) {
    fBox(P, top, z, 8.6, 0.03, 0.06, 0.9, 0.06, FRAME);
  }
  fBox(P, top, midZ, 8.1, 0.06, length, 0.1, 0.16, CONCRETE_DARK);
  fBox(P, top, midZ, 9.1, 0.06, length, 0.1, 0.16, CONCRETE_DARK);
  const fascia = { ribs: 'vertical', pitch: 0.24, depth: 0.06, lean: 0.4, w: 0.05 };
  corrugated(P, top, midZ, 10.4, length + 0.6, 2.0, OCHRE, fascia);
  corrugated(
    P,
    facade('z+', b.maxZ),
    (topX + b.maxX) / 2,
    10.4,
    b.maxX - topX + 0.6,
    2.0,
    OCHRE,
    fascia,
  );
  corrugated(
    P,
    facade('z-', b.minZ),
    -(topX + b.maxX) / 2,
    10.4,
    b.maxX - topX + 0.6,
    2.0,
    OCHRE,
    fascia,
  );

  // Punta sur (la que se ve desde el portón).
  const south = facade('z+', b.maxZ);
  for (const x of [16.5, 19.5, 47, 50]) {
    grilledWindow(P, south, x, 1.75, 2.4, 1.5);
    framedWindow(P, south, x, 5.3, 2.6, 1.6, { glass: GLASS_DARK, frame: FRAME, sill: null });
  }
  fPlane(P, south, (topX + b.maxX) / 2, 8.6, 0.01, b.maxX - topX - 1, 0.9, GLASS_DARK);

  // Equipos de aire en la terraza.
  for (const [x, z] of [
    [20, -40],
    [22, -12],
    [19, 4],
  ]) {
    P.push(paint(box(1.6, 1.1, 1.0, x, 12.05, z), 0xb4b7b5));
    P.push(paint(box(1.3, 0.04, 0.7, x, 12.62, z), 0x3c3f42));
  }
}

// ---------- Torre de hormigón (escalera de emergencia) ----------

function buildEmergencyCore(ctx) {
  const P = ctx.parts;
  const c = emergencyCore;
  const w = c.maxX - c.minX;
  const d = c.maxZ - c.minZ;
  const cx = (c.minX + c.maxX) / 2;
  const cz = (c.minZ + c.maxZ) / 2;
  P.push(paint(box(w, c.height, d, cx, c.height / 2, cz), CONCRETE));
  // Relleno de planta baja entre la torre y el edificio (bajo el alero).
  P.push(
    paint(
      box(
        longBuilding.minX - c.maxX,
        GROUND_TOP,
        d,
        (c.maxX + longBuilding.minX) / 2,
        GROUND_TOP / 2,
        cz,
      ),
      CONCRETE_DARK,
    ),
  );
  ctx.block(0, c.minX, c.minZ, longBuilding.minX, c.maxZ);

  // Marcas del encofrado y ventanitas cuadradas.
  const west = facade('x-', c.minX);
  const south = facade('z+', c.maxZ);
  for (let y = 1.2; y < c.height; y += 1.2) {
    fBox(P, west, cz, y, 0.005, d, 0.03, 0.01, CONCRETE_DARK);
    fBox(P, south, cx, y, 0.005, w, 0.03, 0.01, CONCRETE_DARK);
  }
  for (let y = 4.4; y < c.height - 1; y += 3.6) {
    for (const z of [c.minZ + 1.4, c.maxZ - 1.6]) {
      fPlane(P, west, z, y, 0.01, 0.4, 0.4, 0x24272a);
      fBox(P, west, z, y - 0.24, 0.04, 0.56, 0.08, 0.08, CONCRETE_DARK);
    }
    fPlane(P, south, c.minX + 1.2, y, 0.01, 0.4, 0.4, 0x24272a);
  }
  // Faja vidriada en la cara sur, de arriba abajo.
  const glassU = c.maxX - 1.1;
  fPlane(P, south, glassU, c.height / 2 + 0.2, 0.01, 1.4, c.height - 1.2, GLASS_SKY);
  for (let y = 0.8; y < c.height; y += 1.8) fBox(P, south, glassU, y, 0.03, 1.5, 0.06, 0.06, FRAME);
  fBox(P, west, cz, c.height + 0.25, 0.02, d + 0.1, 0.5, 0.12, CONCRETE_DARK);

  // Puerta de emergencia (cerrada desde afuera).
  const z = emergencyDoorZ;
  fBox(P, west, z, 1.05, 0.03, 1.0, 2.1, 0.06, 0x5d6b62);
  fBox(P, west, z, 2.15, 0.05, 1.2, 0.1, 0.1, FRAME);
  for (const side of [-1, 1]) fBox(P, west, z + side * 0.55, 1.08, 0.05, 0.1, 2.16, 0.1, FRAME);
  fBox(P, west, z - 0.3, 1.0, 0.08, 0.5, 0.05, 0.05, SILVER); // barral antipánico
  ctx.group.add(
    createWayfindingSign({
      text: 'SALIDA DE EMERGENCIA',
      width: 1.5,
      x: c.minX - 0.01,
      y: 2.55,
      z,
      facing: 'x-',
      background: '#1e7a3c',
      fog: true,
    }),
  );
  ctx.hitboxes.emergencyDoor = ctx.hitbox(0.4, 2.1, 1.0, c.minX - 0.2, 1.05, z);
}

// ---------- Edificio UTN FRC ----------

function buildFrcBuilding(ctx) {
  const P = ctx.parts;
  const b = frcBuilding;
  const fh = b.floorHeight;
  const top = fh * b.floors;
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const e = frcEntrance;
  const color = 0xe6d7b3;

  // Pisos de arriba enteros; planta baja con la entrada retirada bajo el voladizo.
  P.push(paint(box(w, top - fh, d, cx, (top + fh) / 2, cz), color));
  P.push(paint(box(w + 0.2, 0.8, d + 0.2, cx, top + 0.4, cz), CREAM_SHADE));
  for (const [z0, z1] of [
    [b.minZ, e.minZ],
    [e.maxZ, b.maxZ],
  ]) {
    P.push(paint(box(w, fh, z1 - z0, cx, fh / 2, (z0 + z1) / 2), color));
    ctx.block(0, b.minX, z0, b.maxX, z1);
  }
  P.push(
    paint(
      box(
        e.doorX - b.minX,
        fh,
        e.maxZ - e.minZ,
        (b.minX + e.doorX) / 2,
        fh / 2,
        (e.minZ + e.maxZ) / 2,
      ),
      color,
    ),
  );
  ctx.block(0, b.minX, e.minZ, e.doorX, e.maxZ);

  // Cara este (a la calle interna): u = -z.
  const east = facade('x+', b.maxX);
  // Planta baja: vidriera con perfiles oscuros a los costados de la entrada.
  for (const [z0, z1] of [
    [b.minZ + 0.4, e.minZ - 0.2],
    [e.maxZ + 0.2, b.maxZ - 0.4],
  ]) {
    const u0 = -z1;
    const u1 = -z0;
    fPlane(P, east, (u0 + u1) / 2, 1.55, 0.01, u1 - u0, 2.5, GLASS_DARK);
    for (let u = u0; u <= u1 + 0.01; u += (u1 - u0) / Math.round((u1 - u0) / 1.2)) {
      fBox(P, east, u, 1.55, 0.03, 0.07, 2.5, 0.06, FRAME);
    }
    for (const v of [0.3, 2.2, 2.8])
      fBox(P, east, (u0 + u1) / 2, v, 0.03, u1 - u0, 0.07, 0.06, FRAME);
  }
  // Pisos de arriba: ventanas a los costados y el panel negro sobre la entrada.
  for (let floor = 1; floor < b.floors; floor += 1) {
    const v = floor * fh + 1.55;
    for (const z of [-28.6, -26.6, -24.6, -12.4, -10.2]) {
      framedWindow(P, east, -z, v, 1.6, 1.3, { panes: 3 });
    }
  }
  const panelU0 = -(e.maxZ + 0.2);
  const panelU1 = -(e.minZ - 0.2);
  const panelV0 = fh;
  const panelV1 = top + 0.7;
  fBox(
    P,
    east,
    (panelU0 + panelU1) / 2,
    (panelV0 + panelV1) / 2,
    0.08,
    panelU1 - panelU0,
    panelV1 - panelV0,
    0.16,
    BLACK_PANEL,
  );
  for (let u = panelU0 + 0.3; u < panelU1; u += 0.6) {
    fBox(P, east, u, (panelV0 + panelV1) / 2, 0.17, 0.035, panelV1 - panelV0, 0.03, 0x1b1c1e);
  }
  fBox(
    P,
    east,
    (panelU0 + panelU1) / 2,
    fh + 0.05,
    0.1,
    panelU1 - panelU0 + 0.1,
    0.12,
    0.2,
    0x1b1c1e,
  );

  // Entrada: dos puertas vidriadas y el logo en el muro del medio, columnas y escalón.
  const entry = facade('x+', e.doorX);
  for (const z of [-20.6, -16.4]) {
    fPlane(P, entry, -z, 1.25, 0.01, 1.7, 2.5, GLASS_DARK);
    for (const du of [-0.85, 0, 0.85]) fBox(P, entry, -z + du, 1.25, 0.03, 0.08, 2.5, 0.06, SILVER);
    fBox(P, entry, -z, 2.5, 0.03, 1.8, 0.08, 0.06, SILVER);
    fBox(P, entry, -z, 2.95, 0.02, 1.8, 0.8, 0.04, GLASS_DARK);
    for (const du of [-0.3, 0.3]) fBox(P, entry, -z + du, 1.05, 0.08, 0.03, 0.8, 0.03, SILVER);
  }
  fBox(P, entry, 18.5, fh / 2, 0.02, 2.4, fh, 0.04, 0xbca784);
  ctx.group.add(
    createLogoSign({
      width: 1.8,
      height: 1.0,
      x: e.doorX + 0.045,
      y: 1.75,
      z: -18.5,
      facing: 'x+',
    }),
  );
  for (const z of [e.minZ + 0.4, e.maxZ - 0.4]) {
    const column = new THREE.CylinderGeometry(0.25, 0.25, fh, 20);
    column.translate(b.maxX - 0.35, fh / 2, z);
    P.push(paint(column, CREAM_SHADE));
    ctx.block(0, b.maxX - 0.62, z - 0.27, b.maxX - 0.08, z + 0.27);
  }
  P.push(
    paint(
      box(
        b.maxX - e.doorX + 0.4,
        0.1,
        e.maxZ - e.minZ,
        (e.doorX + b.maxX + 0.4) / 2,
        0.05,
        (e.minZ + e.maxZ) / 2,
      ),
      STONE,
    ),
  );
  ctx.hitboxes.frcDoors = ctx.hitbox(0.4, 2.5, 6.4, e.doorX + 0.25, 1.25, -18.5);

  // Rampa con baranda al sur de la entrada, y equipos de aire tras un murete al norte.
  railedLowWall(ctx, b.maxX, -13.6, b.maxX + 1.6, -8.6);
  railedLowWall(ctx, b.maxX, -29.6, b.maxX + 1.8, -24.4);
  for (const z of [-28.6, -27.2, -25.8]) {
    P.push(paint(box(0.7, 0.9, 1.1, b.maxX + 0.9, 0.45, z), 0xd9dad6));
    const fan = new THREE.CircleGeometry(0.28, 16);
    fan.rotateY(Math.PI / 2);
    fan.translate(b.maxX + 1.26, 0.48, z);
    P.push(paint(fan, 0x2a2c2e));
  }

  // Cara norte (al patio): ventanas corridas en todos los pisos. u = -x.
  const north = facade('z-', b.minZ);
  for (let floor = 0; floor < b.floors; floor += 1) {
    const v = floor * fh + 1.55;
    for (let x = b.minX + 1.4; x < b.maxX - 1; x += 2) {
      framedWindow(P, north, -x, v, 1.6, floor === 0 ? 1.6 : 1.3, { panes: 3 });
    }
  }
  // Cara sur (a la explanada): ventanas y parasoles negros verticales en la esquina.
  const south = facade('z+', b.maxZ);
  for (let floor = 0; floor < b.floors; floor += 1) {
    const v = floor * fh + 1.55;
    for (let x = b.minX + 1.4; x < b.maxX - 5; x += 2) {
      framedWindow(P, south, x, v, 1.6, 1.3, { panes: 3 });
    }
  }
  for (let x = b.maxX - 4.2; x < b.maxX - 0.2; x += 0.35) {
    fBox(P, south, x, (fh + top) / 2 + 0.3, 0.25, 0.08, top - fh + 0.4, 0.5, BLACK_PANEL);
  }
}

/** Murete bajo con baranda encima, de (x0, z0) a (x1, z1): bloquea ese rectángulo. */
function railedLowWall(ctx, x0, z0, x1, z1) {
  const P = ctx.parts;
  const height = 0.55;
  P.push(paint(box(0.2, height, z1 - z0, x1 - 0.1, height / 2, (z0 + z1) / 2), CREAM_SHADE));
  for (const z of [z0 + 0.1, z1 - 0.1]) {
    P.push(paint(box(x1 - x0, height, 0.2, (x0 + x1) / 2, height / 2, z), CREAM_SHADE));
  }
  const railX = x1 - 0.1;
  P.push(paint(box(0.05, 0.05, z1 - z0, railX, height + 0.9, (z0 + z1) / 2), FRAME));
  P.push(paint(box(0.03, 0.03, z1 - z0, railX, height + 0.45, (z0 + z1) / 2), FRAME));
  for (let z = z0 + 0.1; z <= z1 - 0.1 + 0.01; z += (z1 - z0 - 0.2) / Math.round((z1 - z0) / 1.1)) {
    P.push(paint(box(0.04, 0.9, 0.04, railX, height + 0.45, z), FRAME));
  }
  ctx.block(0, x0, z0, x1, z1);
}

// ---------- Edificio de los paneles solares ----------

function buildSolarBuilding(ctx) {
  const P = ctx.parts;
  const b = solarBuilding;
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  P.push(paint(box(w, b.height - 0.8, d, cx, (b.height - 0.8) / 2, cz), 0xd5c199));
  P.push(paint(box(w + 0.3, 0.8, d + 0.3, cx, b.height - 0.4, cz), 0x5b5e5d));
  ctx.block(0, b.minX, b.minZ, b.maxX, b.maxZ);

  const south = facade('z+', b.maxZ);
  const doorX = -17;
  for (let x = b.minX + 2; x < b.maxX - 1; x += 3) {
    if (Math.abs(x - doorX) < 3) continue;
    grilledWindow(P, south, x, 1.7, 2.2, 1.3);
  }
  const east = facade('x+', b.maxX);
  for (let z = b.minZ + 2; z < b.maxZ - 1; z += 3) grilledWindow(P, east, -z, 1.7, 2.2, 1.3);

  // Entrada con alero.
  fPlane(P, south, doorX, 1.25, 0.01, 2.4, 2.5, GLASS_DARK);
  for (const du of [-1.2, 0, 1.2]) fBox(P, south, doorX + du, 1.25, 0.03, 0.08, 2.5, 0.06, FRAME);
  fBox(P, south, doorX, 2.5, 0.03, 2.5, 0.08, 0.06, FRAME);
  fBox(P, south, doorX, 3.05, 0.9, 5, 0.3, 1.8, 0x6e7172);

  // Paneles solares inclinados hacia el norte sobre estructuras de caño.
  for (let z = b.minZ + 1.5; z < b.maxZ - 1; z += 2.1) {
    P.push(paint(box(w - 2, 0.08, 0.08, cx, b.height + 0.25, z), SILVER));
    for (let x = b.minX + 1.4; x < b.maxX - 1; x += 1.12) {
      const panel = new THREE.BoxGeometry(1.06, 0.04, 1.65);
      panel.rotateX(0.35);
      panel.translate(x, b.height + 0.62, z);
      P.push(paint(panel, 0x26344d));
    }
  }
}

// ---------- Bloque de hormigón ----------

function buildConcreteBlock(ctx) {
  const P = ctx.parts;
  const b = concreteBlock;
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  P.push(paint(box(w, b.height, d, cx, b.height / 2, cz), 0xc8c2b6));
  P.push(paint(box(6, 2.5, 6, 16, b.height + 1.25, -61), 0xbab4a8));
  ctx.block(0, b.minX, b.minZ, b.maxX, b.maxZ);

  // Ventanitas cuadradas en grilla.
  const south = facade('z+', b.maxZ);
  const west = facade('x-', b.minX);
  for (let v = 5.2; v < b.height - 1; v += 2.6) {
    for (let x = b.minX + 6; x < b.maxX - 0.8; x += 1.6) {
      fPlane(P, south, x, v, 0.01, 0.42, 0.42, 0x24272a);
      fBox(P, south, x, v + 0.26, 0.04, 0.55, 0.08, 0.08, CONCRETE_DARK);
    }
    for (let z = b.minZ + 1; z < b.maxZ - 0.8; z += 1.6) {
      fPlane(P, west, z, v, 0.01, 0.42, 0.42, 0x24272a);
      fBox(P, west, z, v + 0.26, 0.04, 0.55, 0.08, 0.08, CONCRETE_DARK);
    }
  }
  // Entrada vidriada al final de la galería, con la banda de vidrio de arriba.
  const entryU = 12.25;
  fPlane(P, south, entryU, 1.8, 0.01, 4.5, 3.6, 0xc9b56e, { shaded: false });
  for (let du = -2.25; du <= 2.26; du += 0.9)
    fBox(P, south, entryU + du, 1.8, 0.04, 0.08, 3.6, 0.08, SILVER);
  for (const v of [2.4, 3.6]) fBox(P, south, entryU, v, 0.04, 4.6, 0.08, 0.08, SILVER);
  fPlane(P, south, cx - 1, 4.4, 0.01, w - 3, 0.9, GLASS_SKY);

  // Caja vidriada de la escalera, pegada a la cara oeste.
  const stair = { minX: 7.5, maxX: b.minX, minZ: -62, maxZ: -57, height: 13 };
  P.push(
    paint(
      box(
        stair.maxX - stair.minX,
        stair.height,
        stair.maxZ - stair.minZ,
        (stair.minX + stair.maxX) / 2,
        stair.height / 2,
        (stair.minZ + stair.maxZ) / 2,
      ),
      GLASS_SKY,
    ),
  );
  const sw = facade('x-', stair.minX);
  for (let v = 0.2; v < stair.height; v += 1.8)
    fBox(P, sw, (stair.minZ + stair.maxZ) / 2, v, 0.03, 5.1, 0.08, 0.08, FRAME);
  for (let z = stair.minZ; z <= stair.maxZ + 0.01; z += 1.25)
    fBox(P, sw, z, stair.height / 2, 0.03, 0.08, stair.height, 0.08, FRAME);
  ctx.block(0, stair.minX, stair.minZ, stair.maxX, stair.maxZ);
}

// ---------- Los del fondo ----------

function buildPavilion(ctx) {
  const P = ctx.parts;
  const b = pavilion;
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const height = 2.9;
  P.push(paint(box(w, height, d, cx, height / 2, cz), 0xd7c49e));
  gableRoofAlongZ(P, { ...b, y: height, rise: 1.0, wall: 0xd7c49e, roof: 0x9aa3a8 });
  const south = facade('z+', b.maxZ);
  fBox(P, south, cx + 1.2, 1.05, 0.03, 0.95, 2.1, 0.06, 0x6b3b2e);
  for (const x of [cx - 1.6, cx - 0.9, cx - 0.2])
    framedWindow(P, south, x, 2.2, 0.5, 0.35, { glass: GLASS_DARK, panes: 1, sill: null });
  ctx.block(0, b.minX, b.minZ, b.maxX, b.maxZ);
}

// ---------- Edificio Madders (al fondo de la avenida, cerrado) ----------

function buildMadders(ctx) {
  const P = ctx.parts;
  const b = madders;
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  P.push(paint(box(w, b.height, d, cx, b.height / 2, cz), 0xdccaa2));
  P.push(paint(box(w + 0.3, 1.0, d + 0.3, cx, b.height + 0.5, cz), 0x8a9096));
  P.push(paint(box(w + 0.6, 0.25, d + 0.6, cx, b.height + 1.1, cz), 0x6c9bb8));
  ctx.block(0, b.minX, b.minZ, b.maxX, b.maxZ);

  // Ventanas corridas a los dos lados de la esquina vidriada.
  const south = facade('z+', b.maxZ);
  const g = maddersGlass;
  for (const [x0, x1] of [
    [b.minX + 0.5, g.minX - 0.5],
    [g.maxX + 0.5, b.maxX - 0.5],
  ]) {
    for (let floor = 0; floor < 3; floor += 1) {
      const v = floor * 3.6 + 1.9;
      fPlane(P, south, (x0 + x1) / 2, v, 0.01, x1 - x0, 1.2, GLASS_SKY);
      fBox(P, south, (x0 + x1) / 2, v - 0.7, 0.05, x1 - x0, 0.08, 0.12, WHITE);
    }
  }
  // Esquina vidriada con la entrada (cerrada) y el nombre.
  const depth = g.frontZ - b.maxZ;
  const glassX = (g.minX + g.maxX) / 2;
  const width = g.maxX - g.minX;
  const height = b.height + 0.6;
  P.push(paint(box(width, height, depth, glassX, height / 2, b.maxZ + depth / 2), GLASS_SKY));
  const front = facade('z+', g.frontZ);
  for (let du = -width / 2; du <= width / 2 + 0.01; du += 1) {
    fBox(P, front, glassX + du, height / 2, 0.01, 0.08, height, 0.06, FRAME);
  }
  for (let v = 0.2; v < height; v += 1.2)
    fBox(P, front, glassX, v, 0.01, width + 0.1, 0.06, 0.06, FRAME);
  fPlane(P, front, glassX, 1.2, 0.02, 3, 2.4, 0xd8c88e, { shaded: false });
  ctx.group.add(
    createPanel({
      width: 2.6,
      height: 0.42,
      x: glassX,
      y: 3.0,
      z: g.frontZ + 0.06,
      facing: 'z+',
      fog: true,
      background: '#1d3557',
      color: '#ffffff',
      lines: [{ text: 'EDIFICIO MADDERS', size: 0.15, bold: true }],
    }),
  );
  ctx.block(0, g.minX, b.maxZ, g.maxX, g.frontZ);
  ctx.hitboxes.maddersDoor = ctx.hitbox(3, 2.4, 0.4, glassX, 1.2, g.frontZ + 0.2);
}

// ---------- Auditorio ----------

function buildAuditorium(ctx) {
  const P = ctx.parts;
  const a = auditorium;
  const w = a.maxX - a.minX;
  const d = a.maxZ - a.minZ;
  const cx = (a.minX + a.maxX) / 2;
  const cz = (a.minZ + a.maxZ) / 2;
  const brick = 0x9b5b45;
  P.push(paint(box(w, a.height, d, cx, a.height / 2, cz), brick));
  P.push(paint(box(w + 0.1, 1.0, d + 0.1, cx, 0.5, cz), CREAM_SHADE));
  P.push(paint(box(w + 0.4, 0.6, d + 0.4, cx, a.height + 0.3, cz), CONCRETE));
  ctx.block(0, a.minX, a.minZ, a.maxX, a.maxZ);

  // Frente al estacionamiento: alero con columnas, puertas vidriadas y el cartel.
  const south = facade('z+', a.maxZ);
  for (let x = a.minX + 1; x < a.maxX; x += 1.6) {
    fBox(P, south, x, a.height / 2 + 1.5, 0.12, 0.25, a.height - 3, 0.25, 0x86503c);
  }
  const canopy = { x0: cx - 7, x1: cx + 7 };
  P.push(paint(box(canopy.x1 - canopy.x0, 0.3, 2.2, cx, 3.25, a.maxZ + 1.1), CONCRETE));
  for (const x of [canopy.x0 + 0.4, canopy.x1 - 0.4]) {
    P.push(paint(box(0.3, 3.1, 0.3, x, 1.55, a.maxZ + 2.0), CONCRETE));
    ctx.block(0, x - 0.2, a.maxZ + 1.8, x + 0.2, a.maxZ + 2.2);
  }
  for (const x of [cx - 3.5, cx, cx + 3.5]) {
    fPlane(P, south, x, 1.3, 0.13, 2.4, 2.4, GLASS_DARK);
    for (const du of [-1.2, 0, 1.2]) fBox(P, south, x + du, 1.3, 0.15, 0.08, 2.4, 0.06, SILVER);
    fBox(P, south, x, 2.5, 0.15, 2.5, 0.08, 0.06, SILVER);
  }
  ctx.group.add(
    createPanel({
      width: 4.2,
      height: 0.7,
      x: cx,
      y: 5.2,
      z: a.maxZ + 0.3,
      facing: 'z+',
      fog: true,
      background: '#e6dcc6',
      color: '#5a2e22',
      lines: [{ text: 'AUDITORIO', size: 0.42, bold: true }],
    }),
  );
  // Cara oeste (al pasto): ventanas angostas verticales.
  const west = facade('x-', a.minX);
  for (let z = a.minZ + 2; z < a.maxZ - 1; z += 2.5) {
    fPlane(P, west, z, 4.5, 0.01, 0.35, 5, GLASS_DARK);
  }
}

// ---------- Antena ----------

function buildAntenna(ctx, group) {
  const P = ctx.parts;
  const { x, z, height } = antenna;
  const radius = 0.55;
  const corners = [0, 1, 2].map((i) => {
    const angle = (i * Math.PI * 2) / 3;
    return [x + Math.cos(angle) * radius, z + Math.sin(angle) * radius];
  });
  const color = 0x8c9196;
  for (const [cx, cz] of corners) {
    strut(P, new THREE.Vector3(cx, 0, cz), new THREE.Vector3(cx, height, cz), 0.05, color, 5);
  }
  const level = 1.5;
  for (let y = 0; y < height; y += level) {
    for (let i = 0; i < 3; i += 1) {
      const [ax, az] = corners[i];
      const [bx, bz] = corners[(i + 1) % 3];
      strut(P, new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz), 0.02, color, 4);
      strut(P, new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y + level, bz), 0.018, color, 4);
    }
  }
  P.push(paint(box(2.2, 0.4, 2.2, x, 0.2, z), CONCRETE));
  // Balizas y antenas chicas en la punta.
  P.push(paint(box(0.25, 0.25, 0.25, x, height + 0.1, z), 0xc0392b, { shaded: false }));
  P.push(paint(box(0.08, 1.6, 0.08, x + 0.3, height - 3, z), 0xdadada));

  // Riendas: tres direcciones, desde tres alturas.
  const spans = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = (i * Math.PI * 2) / 3;
    const anchor = new THREE.Vector3(x + Math.cos(angle) * 14, 0.3, z + Math.sin(angle) * 14);
    for (const y of [15, 30, height - 2]) spans.push([new THREE.Vector3(x, y, z), anchor]);
  }
  group.add(buildCables(spans, { sag: 0.15, segments: 6, color: 0x5d6266 }));
}

/** Agrega todos los edificios de afuera al contexto (y las riendas de la antena a `group`). */
export function buildCampusBuildings(ctx) {
  buildLongBuilding(ctx);
  buildEmergencyCore(ctx);
  buildFrcBuilding(ctx);
  buildSolarBuilding(ctx);
  buildConcreteBlock(ctx);
  buildPavilion(ctx);
  buildAuditorium(ctx);
  buildMadders(ctx);
  buildAntenna(ctx, ctx.group);
}
