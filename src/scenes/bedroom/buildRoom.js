import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { room } from './roomLayout.js';

/**
 * Construye la "cáscara" estática de la habitación: piso, techo, paredes
 * (con hueco para ventana y puerta armado a partir de segmentos, sin booleanas),
 * marco de ventana y vidrio, y la puerta.
 *
 * Toda la geometría estática que comparte material se fusiona con mergeGeometries
 * para que cada material use un solo draw call, en vez de un mesh por pared/segmento.
 */
export function buildRoom(materials) {
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

  // Puerta (cerrada, decorativa por ahora — no interactuable en esta iteración)
  addBox(
    woodGeometries,
    room.door.width - 0.05,
    room.door.height - 0.03,
    t * 0.4,
    room.door.centerX,
    (room.door.height - 0.03) / 2,
    zSouth - t * 0.3,
  );

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

  return { group, obstacles };
}
