import * as THREE from 'three';
import { paint, box, roundedBox, seededRandom } from '../../world/lowPoly.js';
import { addTree, addShrub, addHouse } from '../../world/buildings.js';
import { CAR_COLORS, addParkedCar } from '../../world/vehicles.js';
import { createPanel } from './signs.js';
import {
  westFenceX,
  southFenceZ,
  parking,
  parkingLane,
  carGate,
  auditoriumPlaza,
  entrancePath,
  lawnIslands,
  planters,
  gallery,
  booth,
} from './layout.js';

/**
 * Lo que amuebla el campus: las rejas sobre Maestro Marcelo López y Cruz Roja, con el
 * acceso de autos (barrera y garita), los autos del estacionamiento, la vegetación (cercos
 * y pinos junto al sendero, cipreses y jacarandás en el patio, canteros con aves del
 * paraíso), faroles negros de farolito cilíndrico, bancos de hormigón, cestos, el mástil
 * rojo, carteles chicos y, del otro lado de las calles, árboles y casas.
 */

const IRON = 0x1f2225;
const LANTERN = 0xd9d1bd;
const BENCH = 0x2a2b2d;

/** Bloquea un círculo chico (tronco, poste) en la planta baja. */
function blockPost(ctx, x, z, half = 0.25) {
  ctx.block(0, x - half, z - half, x + half, z + half);
}

function tree(ctx, x, z, type, scale) {
  addTree(ctx.parts, { x, z, type, scale });
  blockPost(ctx, x, z, 0.2 * scale + 0.1);
}

// ---------- Rejas, acceso de autos y estacionamiento ----------

/** Tramo de reja de barrotes a lo largo de x (`alongX`) o de z, en la coordenada `at`. */
function fenceLine(P, alongX, at, from, to) {
  const height = 1.9;
  const length = to - from;
  const mid = (from + to) / 2;
  const piece = (along, y, w, h, d) => {
    const [x, z] = alongX ? [along, at] : [at, along];
    const [sx, sz] = alongX ? [w, d] : [d, w];
    P.push(paint(box(sx, h, sz, x, y, z), IRON));
  };
  for (const y of [0.12, height - 0.08]) piece(mid, y, length, 0.06, 0.05);
  for (let a = from; a <= to + 0.01; a += length / Math.max(1, Math.round(length / 2.4))) {
    piece(a, (height + 0.1) / 2, 0.09, height + 0.1, 0.09);
  }
  for (let a = from + 0.13; a < to; a += 0.13) piece(a, height / 2, 0.022, height - 0.1, 0.022);
}

function buildFences(ctx, random) {
  const P = ctx.parts;
  fenceLine(P, false, westFenceX, -70, carGate.minZ);
  fenceLine(P, false, westFenceX, carGate.maxZ, southFenceZ);
  fenceLine(P, true, southFenceZ, westFenceX, parking.maxX);
  // Al este del estacionamiento, un cerco vivo.
  P.push(
    paint(
      roundedBox(
        0.9,
        1.4,
        southFenceZ - 12,
        parking.maxX + 0.2,
        0.7,
        (12 + southFenceZ) / 2,
        0.3,
        2,
      ),
      0x3a5a33,
    ),
  );

  // Acceso de autos: pilares, barrera levantada y la garita del guardia.
  for (const z of [carGate.minZ, carGate.maxZ]) {
    P.push(paint(box(0.5, 2.4, 0.5, westFenceX, 1.2, z), 0xcfc6b2));
  }
  const barrierZ = carGate.minZ + 0.6;
  P.push(paint(box(0.35, 1.0, 0.35, westFenceX + 0.8, 0.5, barrierZ), 0xd9b21f));
  const arm = new THREE.BoxGeometry(0.08, 0.08, 4.6);
  arm.translate(0, 0, 2.3);
  arm.rotateX(-1.2); // levantada
  arm.translate(westFenceX + 0.8, 1.0, barrierZ);
  P.push(paint(arm, 0xe8e2d4));
  for (let i = 1; i < 5; i += 2) {
    const stripe = new THREE.BoxGeometry(0.085, 0.085, 0.45);
    stripe.translate(0, 0, i * 0.92);
    stripe.rotateX(-1.2);
    stripe.translate(westFenceX + 0.8, 1.0, barrierZ);
    P.push(paint(stripe, 0xc0392b));
  }
  const booth = { x: westFenceX + 1.6, z: carGate.minZ - 1.8 };
  P.push(paint(box(2, 2.5, 2, booth.x, 1.25, booth.z), 0xd8cfbd));
  P.push(paint(box(2.4, 0.12, 2.4, booth.x, 2.56, booth.z), 0x6f7477));
  P.push(paint(box(0.02, 0.9, 1.4, booth.x + 1.01, 1.55, booth.z), 0x39424a));
  ctx.block(0, booth.x - 1, booth.z - 1, booth.x + 1, booth.z + 1);
  ctx.block(0, westFenceX + 0.6, barrierZ - 0.2, westFenceX + 1, barrierZ + 0.2);

  // Cartel de la calle, afuera, junto al acceso.
  const signZ = carGate.minZ - 0.8;
  const signX = westFenceX - 1.2;
  P.push(paint(box(0.06, 2.9, 0.06, signX, 1.45, signZ), 0x2b2d30));
  for (const facing of ['x+', 'x-']) {
    ctx.group.add(
      createPanel({
        width: 1.3,
        height: 0.24,
        x: signX + (facing === 'x+' ? 0.035 : -0.035),
        y: 2.75,
        z: signZ,
        facing,
        fog: true,
        background: '#1f3b6b',
        color: '#ffffff',
        lines: [{ text: 'MTRO. MARCELO LÓPEZ', size: 0.09, bold: true }],
      }),
    );
  }

  // Autos estacionados, con algunos lugares libres.
  const rows = [
    { z: (parking.minZ + parkingLane.minZ) / 2, yaw: Math.PI / 2 },
    { z: (parkingLane.maxZ + parking.maxZ) / 2, yaw: -Math.PI / 2 },
  ];
  for (const { z, yaw } of rows) {
    for (let x = westFenceX + 7.35; x < parking.maxX - 1; x += 2.7) {
      if (Math.abs(x) < 3 || random() < 0.28) continue;
      const color = CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
      addParkedCar(P, { x, z, yaw, color });
      ctx.block(0, x - 0.95, z - 2.15, x + 0.95, z + 2.15);
    }
  }
}

/**
 * Casa de enfrente sobre Maestro López, con la fachada mirando al campus (+x): se arma
 * mirando a +z en el origen y se gira.
 */
function addHouseFacingEast(P, { frontX, z, width, floors, color, random }) {
  const temp = [];
  addHouse(temp, {
    x: 0,
    frontZ: 0,
    width,
    floors,
    color,
    facing: 1,
    depth: 8,
    random,
    litChance: 0.15,
  });
  for (const geo of temp) {
    geo.rotateY(Math.PI / 2);
    geo.translate(frontX, 0, z);
    P.push(geo);
  }
}

// ---------- Vegetación ----------

/** Cerco bajo a lo largo de z (de z0 a z1), con florcitas encima. */
function hedgeAlongZ(P, random, { x, z0, z1, height = 0.75, thickness = 0.6, flowers }) {
  const length = z1 - z0;
  P.push(
    paint(roundedBox(thickness, height, length, x, height / 2, (z0 + z1) / 2, 0.2, 2), 0x3e5a35),
  );
  if (!flowers) return;
  for (let i = 0; i < length * 9; i += 1) {
    const s = 0.04 + random() * 0.03;
    P.push(
      paint(
        box(
          s,
          s,
          s,
          x + (random() - 0.5) * thickness * 0.9,
          height + random() * 0.04,
          z0 + random() * length,
        ),
        flowers,
        { shaded: false },
      ),
    );
  }
}

/** Arbusto con flores (rosales): un arbusto y puntitos de color encima. */
function floweringShrub(P, random, x, z, scale, color) {
  addShrub(P, { x, z, scale });
  for (let i = 0; i < 14; i += 1) {
    const angle = random() * Math.PI * 2;
    const r = random() * 0.4 * scale;
    const s = 0.05 + random() * 0.04;
    P.push(
      paint(
        box(
          s,
          s,
          s,
          x + Math.cos(angle) * r,
          0.42 * scale + random() * 0.18 * scale,
          z + Math.sin(angle) * r,
        ),
        color,
        { shaded: false },
      ),
    );
  }
}

/** Mata de ave del paraíso: hojas largas en abanico y algunas flores naranjas. */
function birdOfParadise(P, random, x, z, y) {
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + random() * 0.4;
    const tilt = 0.25 + random() * 0.35;
    const leaf = new THREE.BoxGeometry(0.16, 1.0 + random() * 0.3, 0.03);
    leaf.translate(0, 0.5, 0);
    leaf.rotateX(tilt);
    leaf.rotateY(angle);
    leaf.translate(x, y, z);
    P.push(paint(leaf, i % 2 ? 0x2f5a35 : 0x3b6a3f));
  }
  for (let i = 0; i < 4; i += 1) {
    const angle = random() * Math.PI * 2;
    const flower = new THREE.ConeGeometry(0.05, 0.28, 4);
    flower.rotateZ(Math.PI / 2 - 0.3);
    flower.rotateY(angle);
    flower.translate(
      x + Math.cos(angle) * 0.25,
      y + 1.1 + random() * 0.25,
      z + Math.sin(angle) * 0.25,
    );
    P.push(paint(flower, 0xf07c1e, { shaded: false }));
  }
}

function buildVegetation(ctx, random) {
  const P = ctx.parts;
  // Al oeste del sendero: arbustos grandes redondos junto al borde y pinos detrás.
  for (let z = -2; z < parking.minZ - 1; z += 1.7) {
    addShrub(P, { x: -3.2 - random() * 0.5, z, scale: 2.1 + random() * 0.8 });
  }
  for (let x = -5; x > westFenceX + 1; x -= 2.2) {
    addShrub(P, { x, z: parking.minZ - 1 - random() * 0.4, scale: 1.8 + random() * 0.6 });
  }
  // La arboleda que acompaña a Maestro López.
  for (let z = -60; z < parking.minZ - 3; z += 6) {
    for (const x of [-19, -24.5, -29.5]) {
      if (z < -29) continue; // de ahí al norte están las aulas 400 y el patio
      addTree(P, {
        x: x + random() * 2,
        z: z + random() * 3,
        type: random() < 0.5 ? 'cedar' : 'cypress',
        scale: 1.5 + random() * 0.6,
      });
    }
  }
  for (let z = 1; z < parking.minZ - 2; z += 5.5) {
    addTree(P, {
      x: -7 - random() * 2,
      z: z + random() * 2,
      type: 'cedar',
      scale: 1.7 + random() * 0.6,
    });
    addTree(P, {
      x: -12 - random() * 3,
      z: z + 2.5,
      type: random() < 0.5 ? 'cypress' : 'cedar',
      scale: 1.5 + random() * 0.5,
    });
  }
  addTree(P, { x: -5.5, z: -1.5, type: 'cypress', scale: 1.6 });

  // Pasto de la entrada: cerco con flores violetas junto al sendero, rosales y árboles.
  const hedgeX = entrancePath.maxX + 0.8;
  for (const [z0, z1] of [
    [5, 13.5],
    [15, 21],
  ]) {
    hedgeAlongZ(P, random, { x: hedgeX, z0, z1, flowers: 0x8e6bc4 });
    ctx.block(0, hedgeX - 0.3, z0, hedgeX + 0.3, z1);
  }
  for (const [x, z, color] of [
    [3.4, 2.2, 0xe8a0b4],
    [7.5, 0.5, 0xf4f0f2],
    [10.8, -1.2, 0xd94a5a],
    [11.2, 2.2, 0xe8a0b4],
    [5.2, 24.5, 0xf4f0f2],
  ]) {
    floweringShrub(P, random, x, z, 1.5, color);
  }
  for (const [x, z, scale] of [
    [6, 15, 1.1],
    [9.5, 23.5, 1.25],
    [5.2, 10.5, 1.0],
    [19, 20, 1.3],
    [25, 26, 1.1],
    [-27, 27, 1.2],
  ]) {
    tree(ctx, x, z, 'round', scale);
  }
  // Árboles en el borde del pasto y en la explanada del Auditorio.
  for (const x of [4.5, 11, 17, 26.5, 35.5]) {
    tree(
      ctx,
      x + random(),
      parking.minZ - 1.4,
      random() < 0.6 ? 'round' : 'cedar',
      1 + random() * 0.4,
    );
  }

  // Patio: el ciprés grande, el jacarandá, un cedro y la arboleda del oeste.
  tree(ctx, -12.5, -60.2, 'cypress', 2.0);
  tree(ctx, -8.5, -39.5, 'round', 1.6);
  tree(ctx, -6.5, -55, 'round', 1.2);
  // Jardines a los costados del edificio de aulas 400.
  addTree(P, { x: -24, z: -62.6, type: 'cedar', scale: 1.4 });
  addTree(P, { x: -28.5, z: -62.4, type: 'round', scale: 1.1 });
  addTree(P, { x: -21, z: -31.6, type: 'round', scale: 1.0 });
  addTree(P, { x: -27.5, z: -31.4, type: 'cypress', scale: 1.4 });
  tree(ctx, -5.5, -32.2, 'round', 0.95);
  // Avenida: árboles a los costados y el ciprés junto al edificio de los paneles.
  tree(ctx, -2.6, -68.5, 'round', 1.1);
  tree(ctx, 8.4, -66, 'round', 1.15);
  tree(ctx, -2.8, -79, 'round', 1.0);
  tree(ctx, -16, -63.2, 'cypress', 1.8);

  // Canteros de pasto: matas y yucas.
  for (const island of lawnIslands) {
    for (let i = 0; i < 4; i += 1) {
      addShrub(P, {
        x: island.minX + 0.8 + random() * (island.maxX - island.minX - 1.6),
        z: island.minZ + 0.8 + random() * (island.maxZ - island.minZ - 1.6),
        scale: 0.9 + random() * 0.6,
        groundY: 0.12,
      });
    }
  }
  // Canteros altos de material con aves del paraíso.
  for (const { minX, maxX, minZ, maxZ } of planters) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const w = maxX - minX;
    const d = maxZ - minZ;
    const height = 0.5;
    for (const side of [-1, 1]) {
      P.push(paint(box(w, height, 0.22, cx, height / 2, cz + side * (d / 2 - 0.11)), 0xcdc5b4));
      P.push(paint(box(0.22, height, d, cx + side * (w / 2 - 0.11), height / 2, cz), 0xcdc5b4));
    }
    P.push(paint(box(w - 0.3, 0.02, d - 0.3, cx, height - 0.08, cz), 0x4a3b2e));
    for (let x = minX + 0.8; x < maxX - 0.4; x += 1.3)
      birdOfParadise(P, random, x, cz + (random() - 0.5) * 0.5, height - 0.1);
    ctx.block(0, minX, minZ, maxX, maxZ);
  }

  // Del otro lado de las calles: casas bajas y árboles de vereda.
  const houseColors = [0xd8c7a8, 0xc9b28f, 0xe2d5bf, 0xb9a689, 0xd0bfa2];
  let at = -40;
  let i = 0;
  while (at < 60) {
    const width = 7 + random() * 4;
    const house = {
      width,
      floors: random() < 0.3 ? 2 : 1,
      color: houseColors[i % houseColors.length],
      random,
    };
    addHouse(P, {
      ...house,
      x: at + width / 2,
      frontZ: southFenceZ + 16,
      facing: -1,
      depth: 8,
      litChance: 0.15,
    });
    at += width + 1.5;
    i += 1;
  }
  at = -110;
  while (at < southFenceZ + 10) {
    const width = 7 + random() * 4;
    const house = {
      width,
      floors: random() < 0.3 ? 2 : 1,
      color: houseColors[i % houseColors.length],
      random,
    };
    addHouseFacingEast(P, { ...house, frontX: westFenceX - 16, z: at + width / 2 });
    at += width + 1.5;
    i += 1;
  }
  for (let t = -38; t < 60; t += 8) {
    addTree(P, {
      x: t + random() * 2,
      z: southFenceZ + 14,
      type: 'round',
      scale: 1 + random() * 0.3,
    });
  }
  for (let t = -105; t < southFenceZ + 8; t += 8) {
    addTree(P, {
      x: westFenceX - 14,
      z: t + random() * 2,
      type: 'round',
      scale: 1 + random() * 0.3,
    });
  }
}

// ---------- Mobiliario ----------

/** Farol del campus: poste negro con un farolito cilíndrico arriba. */
function campusLamp(ctx, x, z) {
  const P = ctx.parts;
  const post = new THREE.CylinderGeometry(0.05, 0.07, 3.4, 10);
  post.translate(x, 1.7, z);
  P.push(paint(post, IRON));
  const lantern = new THREE.CylinderGeometry(0.13, 0.13, 0.5, 14);
  lantern.translate(x, 3.65, z);
  P.push(paint(lantern, LANTERN));
  const cap = new THREE.CylinderGeometry(0.17, 0.15, 0.08, 14);
  cap.translate(x, 3.94, z);
  P.push(paint(cap, IRON));
  blockPost(ctx, x, z, 0.12);
}

/** Banco de hormigón negro (un bloque), largo a lo largo de x o de z. */
function blockBench(ctx, x, z, alongZ = false, length = 1.5) {
  const [w, d] = alongZ ? [0.45, length] : [length, 0.45];
  ctx.parts.push(paint(roundedBox(w, 0.42, d, x, 0.21, z, 0.03, 1), BENCH));
  ctx.block(0, x - w / 2, z - d / 2, x + w / 2, z + d / 2);
}

/** Banquito: dos conos truncados unidos (un "diábolo"), como los del patio. */
function stool(ctx, x, z) {
  for (const [y, top, bottom] of [
    [0.11, 0.1, 0.18],
    [0.32, 0.2, 0.1],
  ]) {
    const geo = new THREE.CylinderGeometry(top, bottom, 0.22, 12);
    geo.translate(x, y, z);
    ctx.parts.push(paint(geo, BENCH));
  }
  blockPost(ctx, x, z, 0.2);
}

/** Cesto de malla galvanizada sobre un poste. */
function meshBin(ctx, x, z) {
  const P = ctx.parts;
  P.push(paint(box(0.06, 0.95, 0.06, x, 0.475, z), 0x8d9297));
  P.push(paint(box(0.42, 0.5, 0.32, x, 0.75, z + 0.2), 0x9ea4a9));
  P.push(paint(box(0.36, 0.44, 0.26, x, 0.78, z + 0.2), 0x3a3e42));
  blockPost(ctx, x, z + 0.1, 0.3);
}

/** Cesto marrón con patas, de los del patio. */
function legBin(ctx, x, z) {
  const P = ctx.parts;
  const body = new THREE.CylinderGeometry(0.22, 0.2, 0.55, 12);
  body.translate(x, 0.65, z);
  P.push(paint(body, 0x5a3a28));
  for (const side of [-1, 1]) P.push(paint(box(0.04, 0.4, 0.04, x + side * 0.2, 0.2, z), IRON));
  blockPost(ctx, x, z, 0.25);
}

function buildFurniture(ctx) {
  const P = ctx.parts;
  for (const [x, z] of [
    [1.8, 26],
    [1.8, 14.25],
    [1.8, 3.5],
    [-18, parkingLane.minZ - 0.3],
    [-4, parkingLane.maxZ + 0.3],
    [10, parkingLane.minZ - 0.3],
    [24, parkingLane.maxZ + 0.3],
    [36, parkingLane.minZ - 0.3],
    [20, auditoriumPlaza.minZ + 1.5],
    [-4.8, -4.2],
    [5.4, -11],
    [5.4, -21],
    [5.4, -30.6],
    [5.4, -46],
    [-12, -31.6],
    [-2.5, -42.8],
    [-10, -56.5],
    [-15.6, -41.2],
    [2.2, -60],
    [-3.2, -73],
    [8.8, -72],
  ]) {
    campusLamp(ctx, x, z);
  }

  // Bancos y banquitos del patio, y dos bancos contra la pared de la galería.
  for (const x of [-8.4, -6.2, -4]) blockBench(ctx, x, -50.4);
  blockBench(ctx, -12.6, -38, true);
  blockBench(ctx, -12.6, -35.6, true);
  for (const [x, z] of [
    [-15.4, -54.6],
    [-15.4, -56.8],
    [-13.6, -55.7],
    [-1.5, -57.5],
  ]) {
    stool(ctx, x, z);
  }
  blockBench(ctx, 13.55, -34, true, 1.8);
  blockBench(ctx, 13.55, -47, true, 1.8);
  blockBench(ctx, 1.5, -62.6);

  for (const [x, z] of [
    [9.7, -9.4],
    [-1.9, 2.8],
    [9.7, -41],
  ]) {
    meshBin(ctx, x, z);
  }
  legBin(ctx, -2.4, -48.6);
  legBin(ctx, -11.8, -44.4);
  legBin(ctx, 1.6, -54);

  // Mástil rojo del cantero.
  const pole = new THREE.CylinderGeometry(0.06, 0.08, 9, 10);
  pole.translate(-4, 4.6, -52.2);
  P.push(paint(pole, 0xa8372a));
  const finial = new THREE.SphereGeometry(0.1, 10, 6);
  finial.translate(-4, 9.15, -52.2);
  P.push(paint(finial, 0xc9a24a));
  P.push(paint(box(0.4, 0.3, 0.4, -4, 0.15, -52.2), 0x9c958a));
  blockPost(ctx, -4, -52.2, 0.22);
  // Tapa de registro en el pasto, junto al mástil.
  P.push(paint(box(0.6, 0.02, 0.6, -5, 0.13, -53), 0x8d8a84));

  // Carteles: "BAÑOS" y el de la basura en una columna de la galería.
  const columnZ = gallery.maxZ - 2;
  const columnFace = columnZ + 0.31;
  ctx.group.add(
    createPanel({
      width: 0.3,
      height: 0.12,
      x: gallery.edgeX + 0.3,
      y: 2.05,
      z: columnFace,
      facing: 'z+',
      fog: true,
      background: '#f4f4f0',
      lines: [{ text: 'BAÑOS ←', size: 0.05, bold: true }],
    }),
    createPanel({
      width: 0.28,
      height: 0.4,
      x: gallery.edgeX + 0.3,
      y: 1.7,
      z: columnFace,
      facing: 'z+',
      fog: true,
      background: '#1d5fb0',
      color: '#ffffff',
      lines: [
        { text: 'DEPOSITE', size: 0.035, bold: true },
        { text: 'LA BASURA', size: 0.035, bold: true },
        { text: 'EN EL CESTO', size: 0.035, bold: true },
      ],
    }),
  );

  // Tótem con el plano al final del sendero.
  const totemX = entrancePath.maxX + 1.2;
  const totemZ = -1.8;
  for (const dx of [-0.55, 0.55])
    P.push(paint(box(0.06, 2.1, 0.06, totemX + dx, 1.05, totemZ), IRON));
  ctx.group.add(
    createPanel({
      width: 1.2,
      height: 0.9,
      x: totemX,
      y: 1.55,
      z: totemZ + 0.04,
      facing: 'z+',
      fog: true,
      align: 'left',
      header: { text: 'UTN · FRC', size: 0.07, background: '#1d3557', color: '#ffffff' },
      lines: [
        { text: '↑ Galería · Patio central', size: 0.06, bold: true },
        { text: '   Escalera vidriada', size: 0.05 },
        { text: '← Edificio UTN FRC', size: 0.06, bold: true },
        { text: '   Aulas 400 (por el patio)', size: 0.05 },
      ],
    }),
  );
  ctx.block(0, totemX - 0.65, totemZ - 0.1, totemX + 0.65, totemZ + 0.1);

  // Un cesto junto al kiosco.
  meshBin(ctx, booth.minX - 0.6, booth.maxZ + 0.6);
}

/** Agrega las rejas y el estacionamiento, la vegetación y el mobiliario de afuera. */
export function buildCampusProps(ctx) {
  const random = seededRandom(1904);
  buildFences(ctx, random);
  buildVegetation(ctx, random);
  buildFurniture(ctx);
}
