import * as THREE from 'three';
import { room, furniture } from '../roomLayout.js';

/**
 * Decoración fija de la habitación: cortinas abiertas a los lados de la ventana (con su
 * barral), la alfombra junto a la cama y un póster de la cátedra sobre el escritorio.
 */

/**
 * Paño de cortina: plano subdividido con ondas verticales (más sueltas abajo) y un
 * leve ensanche hacia el piso. `phase` cambia dónde caen las ondas en cada paño.
 */
function curtainPanel(width, height, phase) {
  const geo = new THREE.PlaneGeometry(width, height, 14, 26);
  const position = geo.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const t = (y + height / 2) / height; // 1 arriba, 0 abajo
    const amplitude = 0.035 * (0.7 + 0.3 * (1 - t));
    const waves = Math.sin((x / width) * Math.PI * 2 * 2.5 + phase);
    position.setX(i, x * (1 + 0.08 * (1 - t)));
    position.setZ(i, waves * amplitude + 0.005 * Math.sin(x * 60 + y * 3));
  }
  geo.computeVertexNormals();
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 6);
  return geo;
}

export function buildCurtains(buckets) {
  const { window: win, depth } = room;
  const wallZ = -depth / 2; // cara interior de la pared norte
  const rodY = win.headerY + 0.14;
  const rodZ = wallZ + 0.09;
  const rodLength = win.width + 0.8;

  // Barral con remates y ménsulas.
  const rod = new THREE.CylinderGeometry(0.012, 0.012, rodLength, 12);
  rod.rotateZ(Math.PI / 2);
  rod.translate(win.centerX, rodY, rodZ);
  buckets.addGeometry('metal', rod);
  for (const side of [1, -1]) {
    buckets.addIcosahedron(
      'metal',
      0.028,
      2,
      win.centerX + side * (rodLength / 2 + 0.01),
      rodY,
      rodZ,
    );
    const bracketX = win.centerX + side * (rodLength / 2 - 0.14);
    buckets.addBox('metal', 0.02, 0.02, 0.08, bracketX, rodY - 0.012, rodZ - 0.045);
    buckets.addBox('metal', 0.06, 0.08, 0.012, bracketX, rodY - 0.03, wallZ + 0.006);
  }

  // Paños abiertos a los lados, colgados de anillos.
  const panelWidth = 0.36;
  const bottomY = win.sillY - 0.32;
  const topY = rodY - 0.035;
  const panelHeight = topY - bottomY;
  for (const side of [1, -1]) {
    const x = win.centerX + side * (win.width / 2 + panelWidth / 2 - 0.05);
    const panel = curtainPanel(panelWidth, panelHeight, side * 0.8);
    panel.translate(x, (topY + bottomY) / 2, rodZ - 0.02);
    buckets.addGeometry('curtain', panel);
    for (let i = 0; i < 5; i += 1) {
      const ring = new THREE.TorusGeometry(0.02, 0.004, 6, 14);
      ring.rotateY(Math.PI / 2);
      ring.translate(x - panelWidth / 2 + 0.03 + (i * (panelWidth - 0.06)) / 4, rodY, rodZ);
      buckets.addGeometry('metal', ring);
    }
  }
}

/** Alfombra junto al lado libre de la cama. */
export function buildRug(buckets) {
  const { bed } = furniture;
  buckets.addBox(
    'rug',
    1.25,
    0.012,
    0.85,
    bed.center.x + bed.width / 2 + 0.75,
    0.006,
    bed.center.z + 0.25,
    0.05,
    {
      radius: 0.09,
      segments: 3,
    },
  );
}

/** Póster enmarcado en la pared norte, a la derecha de la ventana, sobre el escritorio. */
export function buildPoster(buckets) {
  const x = furniture.desk.center.x;
  const y = 1.85;
  const wallZ = -room.depth / 2;
  const width = 0.5;
  const height = 0.7;
  const sheet = new THREE.PlaneGeometry(width, height);
  sheet.translate(x, y, wallZ + 0.018);
  buckets.addGeometry('poster', sheet);
  const frameZ = wallZ + 0.012;
  buckets.addBox('posterFrame', width + 0.05, 0.025, 0.024, x, y + height / 2 + 0.0125, frameZ);
  buckets.addBox('posterFrame', width + 0.05, 0.025, 0.024, x, y - height / 2 - 0.0125, frameZ);
  for (const side of [1, -1]) {
    buckets.addBox(
      'posterFrame',
      0.025,
      height + 0.05,
      0.024,
      x + side * (width / 2 + 0.0125),
      y,
      frameZ,
    );
  }
}
