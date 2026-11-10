import * as THREE from 'three';
import { room } from '../bedroom/roomLayout.js';
import { curtainPanel } from '../bedroom/props/decor.js';
import { config } from '../../config.js';

/**
 * Cortinas cerradas: dos paños que tapan la ventana y dejan una rendija en el medio, por
 * donde entra el sol. Mismo barral y mismos anillos que las cortinas abiertas de la
 * habitación (buildCurtains), pero con los paños corridos hasta el centro.
 */
export function buildClosedCurtains(buckets) {
  const { window: win, depth } = room;
  const wallZ = -depth / 2;
  const rodY = win.headerY + 0.14;
  const rodZ = wallZ + 0.09;
  const rodLength = win.width + 0.8;

  // Barral con remates.
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
  }

  // Cada paño va del borde externo del barral hasta la rendija.
  const half = config.despertar.luz.anchoRendija / 2;
  const outer = rodLength / 2 - 0.05;
  const panelWidth = outer - half;
  const bottomY = win.sillY - 0.32;
  const topY = rodY - 0.035;
  const panelHeight = topY - bottomY;
  for (const side of [1, -1]) {
    const x = win.centerX + side * (half + panelWidth / 2);
    const panel = curtainPanel(panelWidth, panelHeight, side * 0.8, 6);
    panel.translate(x, (topY + bottomY) / 2, rodZ - 0.02);
    buckets.addGeometry('curtain', panel);
    const rings = 9;
    for (let i = 0; i < rings; i += 1) {
      const ring = new THREE.TorusGeometry(0.02, 0.004, 6, 14);
      ring.rotateY(Math.PI / 2);
      ring.translate(
        x - panelWidth / 2 + 0.03 + (i * (panelWidth - 0.06)) / (rings - 1),
        rodY,
        rodZ,
      );
      buckets.addGeometry('metal', ring);
    }
  }
}
