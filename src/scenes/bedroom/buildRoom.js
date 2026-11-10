import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { room } from './roomLayout.js';

/**
 * Construye la "cáscara" estática de la habitación: piso, techo, paredes
 * (con hueco para ventana y puerta armado a partir de segmentos, sin booleanas),
 * ventana con marco, parteluz y vidrio, la puerta con sus paneles y picaporte, zócalos,
 * interruptor y la lámpara colgante del techo.
 *
 * Toda la geometría estática que comparte material se fusiona con mergeGeometries
 * para que cada material use un solo draw call, en vez de un mesh por pared/segmento.
 * Los detalles (zócalos, marcos, lámpara) van a `buckets`, junto con los muebles.
 */
export function buildRoom(materials, buckets) {
  const group = new THREE.Group();
  group.name = 'room-shell';
  const obstacles = [];

  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  const t = room.wallThickness;

  const wallGeometries = [];
  const woodGeometries = [];

  const addBox = (target, w, h, d, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(x, y, z);
    target.push(geo);
  };

  const addObstacleBox = (w, h, d, x, y, z) => {
    obstacles.push(
      new THREE.Box3(
        new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
        new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
      ),
    );
  };

  // --- Piso y techo ---
  const floorGeo = new THREE.BoxGeometry(room.width, t, room.depth);
  floorGeo.translate(0, -t / 2, 0);
  const floorMesh = new THREE.Mesh(floorGeo, materials.floor);
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  const ceilingGeo = new THREE.BoxGeometry(room.width, t, room.depth);
  ceilingGeo.translate(0, room.height + t / 2, 0);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, materials.ceiling);
  group.add(ceilingMesh);

  // --- Pared norte (con ventana), z = -halfD ---
  const zNorth = -halfD - t / 2;
  const winHalf = room.window.width / 2;
  // Segmento izquierdo del hueco de ventana
  const leftWinEdge = room.window.centerX - winHalf;
  const leftSegWidth = leftWinEdge - -halfW;
  if (leftSegWidth > 0.01) {
    addBox(
      wallGeometries,
      leftSegWidth,
      room.height,
      t,
      -halfW + leftSegWidth / 2,
      room.height / 2,
      zNorth,
    );
  }
  // Segmento derecho del hueco de ventana
  const rightWinEdge = room.window.centerX + winHalf;
  const rightSegWidth = halfW - rightWinEdge;
  if (rightSegWidth > 0.01) {
    addBox(
      wallGeometries,
      rightSegWidth,
      room.height,
      t,
      rightWinEdge + rightSegWidth / 2,
      room.height / 2,
      zNorth,
    );
  }
  // Antepecho (debajo de la ventana) y dintel (arriba de la ventana)
  addBox(
    wallGeometries,
    room.window.width,
    room.window.sillY,
    t,
    room.window.centerX,
    room.window.sillY / 2,
    zNorth,
  );
  const headerHeight = room.height - room.window.headerY;
  addBox(
    wallGeometries,
    room.window.width,
    headerHeight,
    t,
    room.window.centerX,
    room.window.headerY + headerHeight / 2,
    zNorth,
  );
  // Obstáculo único para toda la franja de la pared norte (evita que el jugador
  // se cuele por el hueco de la ventana, que está a media altura).
  addObstacleBox(room.width, room.height, t * 3, 0, room.height / 2, zNorth);

  // Vidrio de la ventana
  const glassGeo = new THREE.BoxGeometry(
    room.window.width - 0.06,
    room.window.headerY - room.window.sillY - 0.06,
    0.02,
  );
  const glassMesh = new THREE.Mesh(glassGeo, materials.glass);
  glassMesh.position.set(
    room.window.centerX,
    (room.window.sillY + room.window.headerY) / 2,
    zNorth + t / 2 - 0.01,
  );
  group.add(glassMesh);

  // --- Pared sur (con puerta), z = +halfD ---
  const zSouth = halfD + t / 2;
  const doorHalf = room.door.width / 2;
  const leftDoorEdge = room.door.centerX - doorHalf;
  const leftDoorSegWidth = leftDoorEdge - -halfW;
  if (leftDoorSegWidth > 0.01) {
    addBox(
      wallGeometries,
      leftDoorSegWidth,
      room.height,
      t,
      -halfW + leftDoorSegWidth / 2,
      room.height / 2,
      zSouth,
    );
  }
  const rightDoorEdge = room.door.centerX + doorHalf;
  const rightDoorSegWidth = halfW - rightDoorEdge;
  if (rightDoorSegWidth > 0.01) {
    addBox(
      wallGeometries,
      rightDoorSegWidth,
      room.height,
      t,
      rightDoorEdge + rightDoorSegWidth / 2,
      room.height / 2,
      zSouth,
    );
  }
  // Obstáculo único para toda la franja de la pared sur: la puerta está
  // cerrada en esta iteración, así que bloquea el paso igual que el resto de la pared.
  addObstacleBox(room.width, room.height, t * 3, 0, room.height / 2, zSouth);
  const doorHeaderHeight = room.height - room.door.height;
  addBox(
    wallGeometries,
    room.door.width,
    doorHeaderHeight,
    t,
    room.door.centerX,
    room.door.height + doorHeaderHeight / 2,
    zSouth,
  );

  // Puerta (cerrada). Es la salida de la escena: su geometría se fusiona con el resto
  // de la madera y aparte se arma una caja invisible para poder apuntarle.
  const doorFaceZ = zSouth - t * 0.3 - t * 0.2; // cara de la puerta hacia la habitación
  addBox(
    woodGeometries,
    room.door.width - 0.05,
    room.door.height - 0.03,
    t * 0.4,
    room.door.centerX,
    (room.door.height - 0.03) / 2,
    zSouth - t * 0.3,
  );
  // Dos paneles en relieve sobre la hoja.
  for (const y of [0.62, 1.5]) {
    addBox(woodGeometries, 0.56, 0.66, 0.014, room.door.centerX, y, doorFaceZ - 0.007);
  }
  addDoorAndTrims(buckets, { doorFaceZ, halfW, halfD });
  const doorHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(room.door.width, room.door.height, 0.1),
    new THREE.MeshBasicMaterial(),
  );
  doorHitbox.position.set(room.door.centerX, room.door.height / 2, zSouth - t * 0.3 - 0.05);
  doorHitbox.visible = false;
  group.add(doorHitbox);

  // --- Paredes este y oeste (sólidas) ---
  addBox(wallGeometries, t, room.height, room.depth, halfW + t / 2, room.height / 2, 0);
  addObstacleBox(t * 3, room.height, room.depth, halfW + t / 2, room.height / 2, 0);
  addBox(wallGeometries, t, room.height, room.depth, -halfW - t / 2, room.height / 2, 0);
  addObstacleBox(t * 3, room.height, room.depth, -halfW - t / 2, room.height / 2, 0);

  // --- Fusión de geometría estática por material (mantiene bajo el draw-call budget) ---
  const wallMerged = mergeGeometries(wallGeometries);
  wallMerged.computeBoundingBox();
  const wallMesh = new THREE.Mesh(wallMerged, materials.wall);
  wallMesh.receiveShadow = true;
  wallMesh.castShadow = false;
  group.add(wallMesh);

  if (woodGeometries.length > 0) {
    const woodMerged = mergeGeometries(woodGeometries);
    const woodMesh = new THREE.Mesh(woodMerged, materials.door);
    woodMesh.receiveShadow = true;
    group.add(woodMesh);
  }

  for (const geo of wallGeometries) geo.dispose();
  for (const geo of woodGeometries) geo.dispose();

  return { group, obstacles, doorMesh: doorHitbox };
}

/**
 * Detalles de carpintería y electricidad: marcos de la puerta y la ventana (con parteluz
 * y antepecho), picaporte, zócalos, interruptor y lámpara colgante. Todo en `buckets`.
 */
function addDoorAndTrims(buckets, { doorFaceZ, halfW, halfD }) {
  const { door, window: win } = room;
  const wallZ = halfD; // cara interior de la pared sur

  // Marco de la puerta: jambas y dintel, apenas salidos de la pared.
  const jambHeight = door.height + 0.03;
  for (const side of [1, -1]) {
    buckets.addBox(
      'trim',
      0.06,
      jambHeight,
      0.05,
      door.centerX + side * (door.width / 2 + 0.03),
      jambHeight / 2,
      wallZ - 0.025,
    );
  }
  buckets.addBox(
    'trim',
    door.width + 0.12,
    0.06,
    0.05,
    door.centerX,
    door.height + 0.06,
    wallZ - 0.025,
  );
  // Picaporte: roseta y manija.
  const handleX = door.centerX + door.width / 2 - 0.12;
  const rose = new THREE.CylinderGeometry(0.03, 0.03, 0.012, 16);
  rose.rotateX(Math.PI / 2);
  rose.translate(handleX, 1.02, doorFaceZ - 0.006);
  buckets.addGeometry('metal', rose);
  buckets.addBox('metal', 0.12, 0.022, 0.022, handleX - 0.05, 1.02, doorFaceZ - 0.035, 0, {
    radius: 0.01,
    segments: 3,
  });
  buckets.addCylinder('metal', 0.011, 0.011, 0.04, 10, handleX, 1.02, doorFaceZ - 0.025);
  // Interruptor junto a la puerta.
  buckets.addBox(
    'trim',
    0.08,
    0.08,
    0.01,
    door.centerX + door.width / 2 + 0.2,
    1.15,
    wallZ - 0.005,
  );
  buckets.addBox(
    'pillow',
    0.03,
    0.05,
    0.008,
    door.centerX + door.width / 2 + 0.2,
    1.15,
    wallZ - 0.013,
  );

  // Zócalos en las cuatro paredes (el sur, cortado en la puerta).
  const base = (w, d, x, z) => buckets.addBox('trim', w, 0.09, d, x, 0.045, z);
  base(room.width, 0.015, 0, -halfD + 0.0075);
  base(0.015, room.depth, halfW - 0.0075, 0);
  base(0.015, room.depth, -halfW + 0.0075, 0);
  const doorLeft = door.centerX - door.width / 2 - 0.06;
  const doorRight = door.centerX + door.width / 2 + 0.06;
  base(doorLeft + halfW, 0.015, (-halfW + doorLeft) / 2, halfD - 0.0075);
  base(halfW - doorRight, 0.015, (doorRight + halfW) / 2, halfD - 0.0075);

  // Ventana: marco interior, antepecho que entra en la habitación, parteluz y manija.
  const northZ = -halfD;
  const winHeight = win.headerY - win.sillY;
  buckets.addBox(
    'trim',
    win.width + 0.12,
    0.06,
    0.04,
    win.centerX,
    win.headerY + 0.03,
    northZ + 0.02,
  );
  for (const side of [1, -1]) {
    buckets.addBox(
      'trim',
      0.06,
      winHeight + 0.06,
      0.04,
      win.centerX + side * (win.width / 2 + 0.03),
      (win.sillY + win.headerY) / 2,
      northZ + 0.02,
    );
  }
  buckets.addBox(
    'trim',
    win.width + 0.2,
    0.04,
    0.13,
    win.centerX,
    win.sillY - 0.02,
    northZ + 0.065,
  );
  buckets.addBox(
    'trim',
    0.04,
    winHeight,
    0.03,
    win.centerX,
    (win.sillY + win.headerY) / 2,
    northZ + 0.015,
  );
  buckets.addBox(
    'trim',
    win.width,
    0.04,
    0.03,
    win.centerX,
    (win.sillY + win.headerY) / 2,
    northZ + 0.015,
  );
  buckets.addBox(
    'metal',
    0.02,
    0.09,
    0.02,
    win.centerX + 0.03,
    (win.sillY + win.headerY) / 2 - 0.08,
    northZ + 0.04,
    0,
    {
      radius: 0.008,
    },
  );

  // Lámpara colgante en el centro del techo (apagada): roseta, cable, pantalla y foco.
  const ceilingY = room.height;
  buckets.addCylinder('trim', 0.06, 0.06, 0.02, 16, 0, ceilingY - 0.01, 0);
  buckets.addCylinder('darkMatte', 0.004, 0.004, 0.55, 8, 0, ceilingY - 0.02 - 0.275, 0);
  buckets.addCylinder('shade', 0.07, 0.2, 0.22, 28, 0, ceilingY - 0.57 - 0.11, 0);
  buckets.addIcosahedron('pillow', 0.032, 2, 0, ceilingY - 0.57 - 0.14, 0);
}
