import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

/**
 * Escritorio con cajón, notebook cerrada, lámpara de brazo (apagada), taza, lapicero
 * y mouse. Los apuntes van aparte (props/notes.js) porque cada hoja lleva su propia
 * textura y no se puede fusionar con el resto.
 */
export function buildDesk(buckets, obstacles) {
  const { center, width, depth, height } = furniture.desk;
  const topThickness = 0.04;
  const topY = height + topThickness / 2;

  // Tabla y patas.
  buckets.addBox('woodLight', width, topThickness, depth, center.x, height, center.z);
  const legSize = 0.05;
  const legHeight = height - topThickness;
  const legOffsetX = width / 2 - legSize;
  const legOffsetZ = depth / 2 - legSize;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      buckets.addBox(
        'woodLight',
        legSize,
        legHeight,
        legSize,
        center.x + sx * legOffsetX,
        legHeight / 2,
        center.z + sz * legOffsetZ,
      );
    }
  }
  // Travesaño trasero entre las patas y cajón bajo la tabla (el frente mira a +z).
  buckets.addBox('woodLight', width - 0.2, 0.08, 0.03, center.x, 0.18, center.z - legOffsetZ);
  const drawerY = height - topThickness / 2 - 0.075;
  buckets.addBox('woodLight', 0.46, 0.12, depth - 0.1, center.x - 0.25, drawerY, center.z);
  buckets.addBox(
    'woodLight',
    0.44,
    0.1,
    0.02,
    center.x - 0.25,
    drawerY,
    center.z + depth / 2 - 0.01,
  );
  buckets.addIcosahedron('metal', 0.012, 2, center.x - 0.25, drawerY, center.z + depth / 2 + 0.012);

  // Notebook cerrada (base + tapa con la carcasa oscura).
  buckets.addBox('screenOff', 0.32, 0.02, 0.24, center.x + 0.08, topY + 0.01, center.z - 0.05);
  buckets.addBox(
    'screenOff',
    0.32,
    0.22,
    0.015,
    center.x + 0.08,
    topY + 0.12,
    center.z - 0.05 - 0.115,
    0,
  );

  // Lámpara de brazo en el rincón de atrás: base, columna, brazo inclinado y pantalla.
  const lampX = center.x + 0.36;
  const lampZ = center.z - 0.2;
  buckets.addCylinder('metal', 0.07, 0.08, 0.02, 20, lampX, topY + 0.01, lampZ);
  buckets.addCylinder('metal', 0.011, 0.013, 0.32, 10, lampX, topY + 0.02 + 0.16, lampZ);
  const stemTop = new THREE.Vector3(lampX, topY + 0.34, lampZ);
  const armDirection = new THREE.Vector3(-Math.sin(0.9), Math.cos(0.9), 0);
  const arm = new THREE.CylinderGeometry(0.009, 0.009, 0.28, 10);
  arm.rotateZ(0.9);
  const armCenter = stemTop.clone().addScaledVector(armDirection, 0.14);
  arm.translate(armCenter.x, armCenter.y, armCenter.z);
  buckets.addGeometry('metal', arm);
  const armEnd = stemTop.clone().addScaledVector(armDirection, 0.28);
  const lampShade = new THREE.CylinderGeometry(0.035, 0.11, 0.14, 24, 1, true);
  lampShade.rotateZ(-0.52);
  lampShade.translate(armEnd.x - 0.045, armEnd.y - 0.075, armEnd.z);
  buckets.addGeometry('shade', lampShade);
  buckets.addIcosahedron('pillow', 0.022, 2, armEnd.x - 0.06, armEnd.y - 0.1, armEnd.z);

  // Taza (con asa) en la punta izquierda.
  const mugX = center.x - 0.48;
  const mugZ = center.z - 0.17;
  buckets.addCylinder('ceramic', 0.04, 0.036, 0.095, 20, mugX, topY + 0.0475, mugZ);
  buckets.addCylinder('darkMatte', 0.034, 0.034, 0.01, 20, mugX, topY + 0.092, mugZ); // café
  const handle = new THREE.TorusGeometry(0.027, 0.007, 8, 18);
  handle.translate(mugX + 0.054, topY + 0.05, mugZ);
  buckets.addGeometry('ceramic', handle);

  // Lapicero con tres lapiceras, y el mouse al lado de la notebook.
  const penX = center.x + 0.38;
  const penZ = center.z + 0.17;
  buckets.addCylinder('darkMatte', 0.035, 0.03, 0.1, 16, penX, topY + 0.05, penZ);
  for (const [key, dx, dz, tilt] of [
    ['metal', -0.012, 0.01, 0.12],
    ['screenOff', 0.012, -0.008, -0.1],
    ['metal', 0.0, 0.014, 0.05],
  ]) {
    const pen = new THREE.CylinderGeometry(0.005, 0.004, 0.16, 8);
    pen.rotateZ(tilt);
    pen.rotateX(tilt * 0.7);
    pen.translate(penX + dx, topY + 0.12, penZ + dz);
    buckets.addGeometry(key, pen);
  }
  buckets.addBox(
    'darkMatte',
    0.06,
    0.032,
    0.1,
    center.x + 0.38,
    topY + 0.016,
    center.z - 0.02,
    0.2,
    {
      radius: 0.014,
      segments: 3,
    },
  );

  // Lapicera tirada sobre el escritorio.
  buckets.addBox('metal', 0.012, 0.012, 0.15, center.x - 0.35, topY + 0.006, center.z - 0.02, 0.4);

  obstacles.push(
    new THREE.Box3(
      new THREE.Vector3(center.x - width / 2, 0, center.z - depth / 2),
      new THREE.Vector3(center.x + width / 2, height, center.z + depth / 2),
    ),
  );

  return { topY };
}
