import * as THREE from 'three';
import { paint, box, roundedBox, facadePlane } from './lowPoly.js';

const FLOOR_HEIGHT = 2.8;
const TRIM = 0xe9e4d8; // marcos de puertas y ventanas
const ROOF = 0x3f464d;
const IRON = 0x2c3035;
const GLASS_DARK = 0x2f353c;
const GLASS_LIT = 0xf3c77a;
const _vertex = new THREE.Vector3();
const _color = new THREE.Color();

/** El mismo color más oscuro (`factor` < 1) o más claro (> 1). */
function shade(hex, factor) {
  _color.set(hex).multiplyScalar(factor);
  return _color.getHex();
}

/** Gira la geometría `yaw` radianes alrededor de Y y la lleva a (x, y, z). */
function place(geometry, x, y, z, yaw = 0) {
  if (yaw) geometry.rotateY(yaw);
  geometry.translate(x, y, z);
  return geometry;
}

/** Cilindro acostado a lo largo del eje X, centrado en (x, y, z). */
function cylinderAlongX(radius, length, x, y, z, segments = 10) {
  const geo = new THREE.CylinderGeometry(radius, radius, length, segments);
  geo.rotateZ(Math.PI / 2);
  geo.translate(x, y, z);
  return geo;
}

/**
 * Copa redonda facetada: icosaedro subdividido (80 caras) con los vértices corridos un
 * poco hacia adentro o afuera, para que no parezca una esfera perfecta. Cada vértice se
 * mueve según su posición, así las caras vecinas siguen unidas; las normales por cara
 * mantienen el estilo low-poly.
 */
function lowPolyCrown(radius, seed, jitter = 0.24) {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const position = geo.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    _vertex.fromBufferAttribute(position, i);
    // Redondeado al milímetro: el mismo vértice calculado por dos caras puede diferir en
    // los últimos decimales, y sin esto se correrían distinto y se abriría una grieta.
    const qx = Math.round(_vertex.x * 1000);
    const qy = Math.round(_vertex.y * 1000);
    const qz = Math.round(_vertex.z * 1000);
    const n = Math.sin(qx * 12.99 + qy * 78.23 + qz * 37.72 + seed) * 43758.5;
    _vertex.multiplyScalar(1 + (n - Math.floor(n) - 0.5) * jitter);
    position.setXYZ(i, _vertex.x, _vertex.y, _vertex.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Techo a dos aguas con la cumbrera a lo largo de X (las pendientes miran a la calle y
 * al fondo; los hastiales triangulares, a los vecinos). Apoya en `y` y cubre
 * `width` × `depth`. Pendientes en color de techo, hastiales en color de pared.
 */
function addGableRoof(parts, { x, y, z, width, depth, height, wallColor }) {
  const w = width / 2;
  const d = depth / 2;
  const A = [-w, 0, -d];
  const B = [w, 0, -d];
  const C = [w, 0, d];
  const D = [-w, 0, d];
  const E = [-w, height, 0];
  const F = [w, height, 0];
  const triangles = (list) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(list.flat(2), 3));
    geo.computeVertexNormals();
    geo.translate(x, y, z);
    return geo;
  };
  // Cada triángulo con sus vértices en sentido antihorario visto desde afuera.
  parts.push(
    paint(
      triangles([
        [A, E, B],
        [B, E, F],
        [D, C, E],
        [C, F, E],
      ]),
      ROOF,
    ),
  );
  parts.push(
    paint(
      triangles([
        [B, F, C],
        [A, D, E],
      ]),
      wallColor,
    ),
  );
  // Cumbrera.
  parts.push(paint(box(width + 0.04, 0.08, 0.18, x, y + height, z), shade(ROOF, 0.75)));
}

/**
 * Ventana con marco, antepecho y vidrio; si está encendida, con cortinas a los lados.
 * `out(d)` da la z a `d` metros hacia afuera de la fachada.
 */
function addWindow(parts, { x, y, width, height, out, facing, lit, random }) {
  parts.push(
    paint(facadePlane(width, height, x, y, out(0.005), facing), lit ? GLASS_LIT : GLASS_DARK, {
      shaded: !lit,
    }),
  );
  if (lit) {
    const curtain = 0.18 + random() * 0.1;
    for (const side of [1, -1]) {
      parts.push(
        paint(
          facadePlane(
            curtain,
            height - 0.04,
            x + side * (width / 2 - curtain / 2),
            y,
            out(0.01),
            facing,
          ),
          0xe2cfa6,
          { shaded: false },
        ),
      );
    }
  }
  // Marco: dos travesaños y dos jambas, un poco afuera de la pared.
  const frameZ = out(0.04);
  parts.push(paint(box(width + 0.14, 0.07, 0.08, x, y + height / 2 + 0.035, frameZ), TRIM));
  parts.push(paint(box(width + 0.14, 0.07, 0.08, x, y - height / 2 - 0.035, frameZ), TRIM));
  for (const side of [1, -1]) {
    parts.push(paint(box(0.07, height, 0.08, x + side * (width / 2 + 0.035), y, frameZ), TRIM));
  }
  // Parteluz y antepecho.
  parts.push(paint(box(0.04, height, 0.03, x, y, out(0.015)), TRIM));
  parts.push(
    paint(box(width + 0.26, 0.07, 0.18, x, y - height / 2 - 0.1, out(0.09)), shade(TRIM, 0.85)),
  );
}

/**
 * Casa con techo (a dos o cuatro aguas, con alero), zócalo, ventanas con marco y
 * antepecho (algunas encendidas, porque afuera está oscuro), puerta con escalón, y
 * según la suerte: balcón, chimenea, antena, aire acondicionado, farol junto a la
 * puerta y canaleta. `facing = 1` la fachada mira a +z; `facing = -1`, a -z. `frontZ`
 * es la z de la fachada: el cuerpo se extiende hacia atrás desde ahí.
 */
export function addHouse(
  parts,
  { x, frontZ, width, floors, color, facing = 1, depth = 6, groundY = 0, random, litChance = 0.3 },
) {
  const height = floors * FLOOR_HEIGHT + 0.3;
  const centerZ = frontZ - (facing * depth) / 2;
  const out = (d) => frontZ + facing * d;
  const roofY = groundY + height;

  parts.push(paint(box(width, height, depth, x, groundY + height / 2, centerZ), color));
  // Zócalo.
  parts.push(
    paint(box(width + 0.06, 0.45, depth + 0.06, x, groundY + 0.225, centerZ), shade(color, 0.7)),
  );

  // Techo con alero: losa fina que sobresale y, encima, dos o cuatro aguas.
  const eave = 0.35;
  const roofWidth = width + 2 * eave;
  const roofDepth = depth + 2 * eave;
  parts.push(paint(box(roofWidth, 0.1, roofDepth, x, roofY + 0.05, centerZ), shade(ROOF, 0.8)));
  const gable = random() < 0.5;
  const roofHeight = gable ? 1.1 + random() * 0.5 : 1.4;
  if (gable) {
    addGableRoof(parts, {
      x,
      y: roofY + 0.1,
      z: centerZ,
      width: roofWidth,
      depth: roofDepth,
      height: roofHeight,
      wallColor: color,
    });
  } else {
    // Cono de 4 lados girado 45° (base cuadrada de lado √2), escalado a la planta.
    const roof = new THREE.ConeGeometry(1, 1, 4);
    roof.rotateY(Math.PI / 4);
    roof.scale(roofWidth / Math.SQRT2, roofHeight, roofDepth / Math.SQRT2);
    roof.translate(x, roofY + 0.1 + roofHeight / 2, centerZ);
    parts.push(paint(roof, ROOF));
  }

  // Canaleta en el alero del frente y bajada en una esquina.
  parts.push(paint(cylinderAlongX(0.06, roofWidth, x, roofY + 0.04, out(eave)), 0x9aa0a6));
  const spoutX = x + (random() < 0.5 ? 1 : -1) * (width / 2 - 0.18);
  const spout = new THREE.CylinderGeometry(0.04, 0.04, height - 0.1, 10);
  spout.translate(spoutX, groundY + 0.1 + (height - 0.1) / 2, out(0.08));
  parts.push(paint(spout, 0x9aa0a6));

  if (random() < 0.5) {
    // Chimenea hacia el fondo del techo.
    const cx = x + (random() < 0.5 ? 1 : -1) * width * 0.25;
    const cz = centerZ - facing * depth * 0.12;
    const chimneyHeight = roofHeight * 0.7 + 0.6;
    parts.push(paint(box(0.5, chimneyHeight, 0.5, cx, roofY + chimneyHeight / 2, cz), 0x6e4a3c));
    parts.push(paint(box(0.6, 0.08, 0.6, cx, roofY + chimneyHeight + 0.04, cz), 0x4a4a4a));
  }
  if (random() < 0.35) {
    // Antena de TV junto a la cumbrera.
    const ax = x - width * 0.3;
    const baseY = roofY + 0.1 + roofHeight * 0.75;
    const mast = new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8);
    mast.translate(ax, baseY + 0.85, centerZ);
    parts.push(paint(mast, 0x3a3d40));
    for (const [dy, length] of [
      [1.6, 0.9],
      [1.35, 0.7],
      [1.1, 0.5],
    ]) {
      parts.push(paint(box(0.02, 0.02, length, ax, baseY + dy, centerZ), 0x3a3d40));
    }
  }

  const balcony = floors > 1 && random() < 0.5;
  for (let floor = 0; floor < floors; floor += 1) {
    const y = groundY + floor * FLOOR_HEIGHT + 1.5;
    for (const col of [-1, 0, 1]) {
      const wx = x + (col * width) / 3;
      if (floor === 0 && col === 0) {
        addDoor(parts, { x: wx, groundY, out, facing, porch: floors === 1 && random() < 0.5 });
        continue;
      }
      if (floor === 1 && col === 0 && balcony) {
        addBalcony(parts, { x: wx, y: groundY + FLOOR_HEIGHT, out, facing, random, litChance });
        continue;
      }
      const lit = random() < litChance;
      addWindow(parts, { x: wx, y, width: 0.8, height: 1.0, out, facing, lit, random });
      if (!lit && random() < 0.2) {
        // Aire acondicionado debajo de la ventana.
        parts.push(paint(box(0.7, 0.45, 0.32, wx, y - 0.95, out(0.17)), 0xd8d8d4));
        parts.push(paint(facadePlane(0.6, 0.3, wx, y - 0.95, out(0.335), facing), 0x8e918f));
      }
    }
  }
  if (random() < 0.6) {
    // Farol prendido junto a la puerta.
    parts.push(paint(box(0.12, 0.2, 0.12, x + 0.62, groundY + 2.05, out(0.07)), IRON));
    parts.push(
      paint(box(0.08, 0.12, 0.08, x + 0.62, groundY + 2.04, out(0.07)), 0xffe3a8, {
        shaded: false,
      }),
    );
  }
}

/** Puerta de entrada con marco, escalón, picaporte y (opcional) alerito. */
function addDoor(parts, { x, groundY, out, facing, porch }) {
  const height = 2.0;
  const width = 0.9;
  const y = groundY + height / 2;
  parts.push(paint(facadePlane(width, height, x, y, out(0.005), facing), 0x3b2f28));
  // Tablero de la puerta: dos paneles hundidos.
  for (const dy of [0.5, -0.4]) {
    parts.push(paint(facadePlane(0.55, 0.6, x, y + dy, out(0.008), facing), 0x2e241e));
  }
  parts.push(paint(box(0.06, 0.06, 0.06, x + 0.33, groundY + 1.0, out(0.04)), 0xb8a060));
  const frameZ = out(0.04);
  parts.push(paint(box(width + 0.16, 0.08, 0.08, x, groundY + height + 0.04, frameZ), TRIM));
  for (const side of [1, -1]) {
    parts.push(paint(box(0.08, height, 0.08, x + side * (width / 2 + 0.04), y, frameZ), TRIM));
  }
  parts.push(paint(box(1.4, 0.12, 0.55, x, groundY + 0.06, out(0.27)), 0x8a8a84)); // escalón
  if (porch) {
    parts.push(paint(box(1.6, 0.08, 0.8, x, groundY + height + 0.24, out(0.4)), shade(ROOF, 0.9)));
    for (const side of [1, -1]) {
      parts.push(
        paint(box(0.06, 0.45, 0.6, x + side * 0.7, groundY + height - 0.02, out(0.3)), TRIM),
      );
    }
  }
}

/** Balcón en el primer piso: puerta ventana, losa y baranda de hierro. */
function addBalcony(parts, { x, y, out, facing, random, litChance }) {
  const lit = random() < litChance;
  addWindow(parts, { x, y: y + 1.05, width: 0.9, height: 1.9, out, facing, lit, random });
  const width = 1.7;
  const depth = 0.9;
  parts.push(paint(box(width, 0.12, depth, x, y - 0.06, out(depth / 2)), 0x8a8a84));
  const railY = y + 0.5;
  const frontZ = out(depth - 0.03);
  for (let i = 0; i <= 5; i += 1) {
    parts.push(
      paint(
        box(0.03, 1.0, 0.03, x - width / 2 + 0.03 + (i * (width - 0.06)) / 5, railY, frontZ),
        IRON,
      ),
    );
  }
  for (const side of [1, -1]) {
    const sx = x + side * (width / 2 - 0.03);
    parts.push(paint(box(0.03, 1.0, 0.03, sx, railY, out(depth / 2)), IRON));
    parts.push(paint(box(0.04, 0.04, depth, sx, y + 1.0, out(depth / 2)), IRON));
  }
  parts.push(paint(box(width, 0.04, 0.04, x, y + 1.0, frontZ), IRON));
}

/**
 * Edificio de departamentos para el fondo (detrás de las casas, entre la niebla):
 * ventanas en grilla con algunas encendidas, balcones en columnas alternadas, parapeto,
 * tanque de agua y salida de escalera en la terraza.
 */
export function addApartmentBlock(
  parts,
  {
    x,
    z,
    width = 12,
    depth = 10,
    floors = 5,
    color,
    facing = 1,
    groundY = 0,
    random,
    litChance = 0.4,
  },
) {
  const storey = 2.9;
  const height = floors * storey + 0.6;
  parts.push(paint(box(width, height, depth, x, groundY + height / 2, z), color));
  parts.push(paint(box(width + 0.1, 0.6, depth + 0.1, x, groundY + 0.3, z), shade(color, 0.75)));
  const topY = groundY + height;
  // Parapeto y cosas en la terraza.
  for (const [w, d, dx, dz] of [
    [width + 0.1, 0.15, 0, depth / 2],
    [width + 0.1, 0.15, 0, -depth / 2],
    [0.15, depth, width / 2, 0],
    [0.15, depth, -width / 2, 0],
  ]) {
    parts.push(paint(box(w, 0.5, d, x + dx, topY + 0.25, z + dz), shade(color, 0.9)));
  }
  parts.push(paint(box(2.6, 2.4, 2.6, x - width / 2 + 2.2, topY + 1.2, z), shade(color, 0.95)));
  const tank = new THREE.CylinderGeometry(0.9, 0.9, 1.3, 14);
  tank.translate(x + width / 2 - 2.2, topY + 1.05, z);
  parts.push(paint(tank, 0x8f8a80));
  parts.push(paint(box(2.2, 0.4, 2.2, x + width / 2 - 2.2, topY + 0.2, z), shade(color, 0.85)));

  const frontZ = z + (facing * depth) / 2;
  const out = (d) => frontZ + facing * d;
  const cols = Math.max(2, Math.floor((width - 1.6) / 2.6));
  const step = (width - 1.6) / cols;
  for (let floor = 0; floor < floors; floor += 1) {
    const y = groundY + 0.6 + floor * storey + 1.5;
    for (let col = 0; col < cols; col += 1) {
      const wx = x - width / 2 + 0.8 + step * (col + 0.5);
      const lit = random() < litChance;
      parts.push(
        paint(facadePlane(1.5, 1.3, wx, y, out(0.01), facing), lit ? GLASS_LIT : GLASS_DARK, {
          shaded: !lit,
        }),
      );
      if (col % 2 === 1) {
        // Balcón con baranda ciega.
        parts.push(paint(box(1.9, 0.12, 0.9, wx, y - 0.75, out(0.45)), shade(color, 0.8)));
        parts.push(paint(box(1.9, 0.8, 0.08, wx, y - 0.3, out(0.86)), shade(color, 0.9)));
      }
    }
  }
}

/** Árbol low-poly: pino (cono) o redondo (icosaedro facetado). */
export function addTree(parts, { x, z, type, scale, groundY = 0 }) {
  const s = scale;
  const trunkHeight = 1.4 * s;
  const trunk = new THREE.CylinderGeometry(0.12 * s, 0.16 * s, trunkHeight, 10);
  trunk.translate(x, groundY + trunkHeight / 2, z);
  parts.push(paint(trunk, 0x3d3128));

  let foliage;
  if (type === 'pine') {
    foliage = new THREE.ConeGeometry(1.1 * s, 2.8 * s, 12);
    foliage.translate(x, groundY + trunkHeight + 1.2 * s, z);
  } else {
    foliage = lowPolyCrown(1.3 * s, x * 3.1 + z * 1.7);
    foliage.scale(1, 0.9, 1);
    foliage.translate(x, groundY + trunkHeight + 0.9 * s, z);
  }
  parts.push(paint(foliage, type === 'pine' ? 0x2f4a2c : 0x3b5233));
}

const SHRUB_COLORS = [0x3b5233, 0x45603a, 0x2f4a2c, 0x4f6b3c];

/** Arbusto redondo y facetado, apoyado en el piso. */
export function addShrub(parts, { x, z, scale = 1, groundY = 0 }) {
  const seed = x * 5.3 + z * 2.9;
  const crown = lowPolyCrown(0.45 * scale, seed, 0.3);
  crown.scale(1.1, 0.75, 1);
  crown.translate(x, groundY + 0.3 * scale, z);
  const colorIndex = Math.abs(Math.round(seed * 7)) % SHRUB_COLORS.length;
  parts.push(paint(crown, SHRUB_COLORS[colorIndex]));
}

/** Cerco vivo recortado, a lo largo de X. */
export function addHedge(parts, { fromX, toX, z, groundY = 0, height = 0.9, thickness = 0.5 }) {
  const length = toX - fromX;
  parts.push(
    paint(
      roundedBox(length, height, thickness, (fromX + toX) / 2, groundY + height / 2, z, 0.12, 2),
      0x3a5a33,
    ),
  );
}

/**
 * Poste de luz de madera con cruceta y aisladores. Devuelve los puntos donde se
 * enganchan los cables (tres, sobre la cruceta) para pasárselos a `buildCables`.
 */
export function addUtilityPole(parts, { x, z, groundY = 0, height = 7.5 }) {
  const pole = new THREE.CylinderGeometry(0.1, 0.13, height, 10);
  pole.translate(x, groundY + height / 2, z);
  parts.push(paint(pole, 0x5a4a3c));
  const armY = groundY + height - 0.45;
  parts.push(paint(box(0.1, 0.1, 1.4, x, armY, z), 0x5a4a3c));
  const anchors = [];
  for (const dz of [-0.55, 0, 0.55]) {
    const insulator = new THREE.CylinderGeometry(0.04, 0.05, 0.14, 8);
    insulator.translate(x, armY + 0.12, z + dz);
    parts.push(paint(insulator, 0xcfd6dc));
    anchors.push(new THREE.Vector3(x, armY + 0.19, z + dz));
  }
  return anchors;
}

/**
 * Cables colgados entre pares de puntos ([a, b]), con la panza de una catenaria. Un
 * solo LineSegments para todos.
 */
export function buildCables(spans, { sag = 0.4, segments = 10, color = 0x15171a } = {}) {
  const positions = [];
  const point = new THREE.Vector3();
  for (const [a, b] of spans) {
    let previous = null;
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      point.lerpVectors(a, b, t);
      point.y -= sag * 4 * t * (1 - t);
      if (previous) positions.push(...previous, point.x, point.y, point.z);
      previous = [point.x, point.y, point.z];
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const cables = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color }));
  cables.name = 'cables';
  return cables;
}

/** Farol de calle con la lámpara prendida. El brazo apunta hacia `armDirZ` (±1). */
export function addLampPost(parts, { x, z, groundY = 0, armDirZ = -1 }) {
  const post = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 12);
  post.translate(x, groundY + 2.1, z);
  parts.push(paint(post, IRON));
  const base = new THREE.CylinderGeometry(0.12, 0.16, 0.3, 12);
  base.translate(x, groundY + 0.15, z);
  parts.push(paint(base, IRON));
  parts.push(paint(box(0.06, 0.06, 0.9, x, groundY + 4.15, z + armDirZ * 0.42), IRON));
  parts.push(paint(box(0.34, 0.06, 0.26, x, groundY + 4.16, z + armDirZ * 0.85), IRON));
  parts.push(
    paint(box(0.3, 0.1, 0.22, x, groundY + 4.08, z + armDirZ * 0.85), 0xffe3a8, {
      shaded: false,
    }),
  );
}

/** Cerco de madera mojada a lo largo del eje X, de `fromX` a `toX`. */
export function addFence(parts, { fromX, toX, z, groundY = 0, railOffsetZ = 0.06 }) {
  const color = 0x4e4036;
  for (let x = fromX; x <= toX + 0.001; x += 1.5) {
    parts.push(paint(box(0.08, 1.0, 0.08, x, groundY + 0.5, z), color));
  }
  const length = toX - fromX;
  for (const y of [0.35, 0.75]) {
    parts.push(
      paint(box(length, 0.07, 0.04, (fromX + toX) / 2, groundY + y, z + railOffsetZ), color),
    );
  }
}

/** Portón bajo de caños (cerrado) en el hueco de una entrada de auto. */
export function addBarGate(parts, { fromX, toX, z, groundY = 0 }) {
  for (const x of [fromX, toX]) {
    parts.push(paint(box(0.12, 1.15, 0.12, x, groundY + 0.575, z), IRON));
  }
  const length = toX - fromX - 0.12;
  const centerX = (fromX + toX) / 2;
  for (const y of [0.3, 0.6, 0.9]) {
    parts.push(paint(cylinderAlongX(0.025, length, centerX, groundY + y, z, 8), IRON));
  }
  for (let x = fromX + 0.5; x < toX - 0.3; x += 0.5) {
    const bar = new THREE.CylinderGeometry(0.02, 0.02, 0.75, 8);
    bar.translate(x, groundY + 0.6, z);
    parts.push(paint(bar, IRON));
  }
}

/** Tacho de basura con tapa, en la vereda. */
export function addTrashBin(parts, { x, z, groundY = 0, color = 0x2f4a2c }) {
  const body = new THREE.CylinderGeometry(0.26, 0.23, 0.78, 14);
  body.translate(x, groundY + 0.39, z);
  parts.push(paint(body, color));
  const lid = new THREE.CylinderGeometry(0.28, 0.27, 0.06, 14);
  lid.translate(x, groundY + 0.81, z);
  parts.push(paint(lid, shade(color, 0.8)));
  parts.push(paint(box(0.16, 0.03, 0.04, x, groundY + 0.855, z), shade(color, 0.7)));
}

/** Buzón sobre un poste, con la ranura mirando a `facing` (±z). */
export function addMailbox(parts, { x, z, groundY = 0, facing = -1, color = 0x8a2b2b }) {
  parts.push(paint(box(0.06, 1.0, 0.06, x, groundY + 0.5, z), IRON));
  parts.push(paint(roundedBox(0.32, 0.22, 0.38, x, groundY + 1.1, z, 0.04), color));
  parts.push(
    paint(facadePlane(0.2, 0.025, x, groundY + 1.15, z + facing * 0.191, facing), 0x1b1d20),
  );
}

/** Banco de plaza (listones de madera sobre patas de hierro), largo a lo largo de X. */
export function addBench(parts, { x, z, groundY = 0, yaw = 0, length = 1.6 }) {
  const wood = 0x5a4030;
  const pieces = [];
  for (const side of [1, -1]) {
    const sx = side * (length / 2 - 0.12);
    pieces.push([box(0.06, 0.45, 0.42, sx, 0.225, 0), IRON]);
    pieces.push([box(0.06, 0.52, 0.06, sx, 0.71, 0.19), IRON]);
  }
  for (const dz of [-0.14, 0, 0.14]) pieces.push([box(length, 0.04, 0.11, 0, 0.47, dz), wood]);
  for (const y of [0.66, 0.84]) pieces.push([box(length, 0.1, 0.03, 0, y, 0.21), wood]);
  for (const [geo, color] of pieces) parts.push(paint(place(geo, x, groundY, z, yaw), color));
}

/** Disco (cara perpendicular a X) de radio `r` y espesor `t`, a la altura `y`. */
function disc(r, t, y, segments, rotation = 0) {
  const geo = new THREE.CylinderGeometry(r, r, t, segments);
  if (rotation) geo.rotateY(rotation);
  geo.rotateZ(Math.PI / 2);
  geo.translate(0, y, 0);
  return geo;
}

/** Señal redonda (borde rojo, centro blanco) sobre un poste. `yaw` = 0 mira a lo largo de X. */
export function addRoundSign(parts, { x, z, groundY = 0, yaw = 0 }) {
  const pole = new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8);
  pole.translate(0, 1.2, 0);
  const pieces = [
    [pole, 0x9aa0a6, true],
    [disc(0.32, 0.03, 2.4, 24), 0xb8201c, false],
    [disc(0.24, 0.04, 2.4, 24), 0xf2f2ee, false],
  ];
  for (const [geo, color, shaded] of pieces) {
    parts.push(paint(place(geo, x, groundY, z, yaw), color, { shaded }));
  }
}

/** Cartel de PARE (octógono rojo) sobre un poste. `yaw` = 0 mira a lo largo de X. */
export function addStopSign(parts, { x, z, groundY = 0, yaw = 0 }) {
  const pole = new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8);
  pole.translate(0, 1.2, 0);
  const eighth = Math.PI / 8;
  const pieces = [
    [pole, 0x9aa0a6, true],
    [disc(0.36, 0.03, 2.45, 8, eighth), 0xb8201c, false],
    [disc(0.3, 0.04, 2.45, 8, eighth), 0xf2f2ee, false],
    [disc(0.26, 0.05, 2.45, 8, eighth), 0xb8201c, false],
  ];
  for (const [geo, color, shaded] of pieces) {
    parts.push(paint(place(geo, x, groundY, z, yaw), color, { shaded }));
  }
}
