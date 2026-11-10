import * as THREE from 'three';
import { createRainOnGlassTexture } from '../../utils/textures.js';
import { paint, box, roundedBox, mergeParts } from '../../world/lowPoly.js';
import {
  bus,
  aisle,
  seatRowsX,
  leftSeatsZ,
  rightSeatZ,
  rightSeatRowsX,
  driverSeat,
  bellPole,
} from './layout.js';

const WALL_THICKNESS = 0.06;
const PILLAR_SPACING = 1.6;
const FABRIC = 0x2f4f7a;
const POLE_YELLOW = 0xd8b13a;
const METAL = 0xb8bcc2;

/** Tramos [minX, maxX] de la pared derecha sin las puertas. */
function rightWallRuns() {
  const { halfLength, frontDoor, backDoor } = bus;
  return [
    [-halfLength, backDoor.minX],
    [backDoor.maxX, frontDoor.minX],
    [frontDoor.maxX, halfLength],
  ];
}

function cylinderAlongX(radius, length, x, y, z) {
  const geo = new THREE.CylinderGeometry(radius, radius, length, 12);
  geo.rotateZ(Math.PI / 2);
  geo.translate(x, y, z);
  return geo;
}

function verticalPole(x, z) {
  const geo = new THREE.CylinderGeometry(0.02, 0.02, bus.ceilingY, 12);
  geo.translate(x, bus.ceilingY / 2, z);
  return geo;
}

function addWall(parts, glassPanes, side, runs) {
  const z = side * (bus.halfWidth + WALL_THICKNESS / 2);
  const { windowBottomY, windowTopY, ceilingY } = bus;
  const upperHeight = ceilingY - windowTopY;
  for (const [minX, maxX] of runs) {
    const length = maxX - minX;
    const centerX = (minX + maxX) / 2;
    parts.push(
      paint(box(length, windowBottomY, WALL_THICKNESS, centerX, windowBottomY / 2, z), 0xc9c6bd),
    );
    parts.push(
      paint(
        box(length, upperHeight, WALL_THICKNESS, centerX, windowTopY + upperHeight / 2, z),
        0xc9c6bd,
      ),
    );
    // Parantes entre ventanillas y un vidrio por cada hueco.
    const panes = Math.max(1, Math.round(length / PILLAR_SPACING));
    const paneLength = length / panes;
    for (let i = 0; i <= panes; i += 1) {
      const x = minX + i * paneLength;
      parts.push(paint(box(0.1, windowTopY - windowBottomY, WALL_THICKNESS, x, 1.5, z), 0x9a9890));
    }
    for (let i = 0; i < panes; i += 1) {
      glassPanes.push({ x: minX + (i + 0.5) * paneLength, z, width: paneLength - 0.1, side });
    }
  }
}

/** Asiento acolchado (almohadón y respaldo redondeados) sobre su pata. */
function addSeat(parts, x, z) {
  parts.push(paint(roundedBox(0.46, 0.1, 0.42, x, 0.45, z, 0.04), FABRIC));
  parts.push(paint(roundedBox(0.08, 0.55, 0.42, x - 0.21, 0.75, z, 0.035), FABRIC));
  parts.push(paint(box(0.05, 0.4, 0.05, x, 0.2, z), 0x5a5d61));
}

/** Puerta corrediza de vidrio (marco + vidrio con gotas). Se oculta para abrirla. */
function buildDoor(door, glassMaterial) {
  const width = door.maxX - door.minX;
  const centerX = (door.minX + door.maxX) / 2;
  const z = bus.halfWidth + WALL_THICKNESS / 2;
  const frame = [
    paint(box(width, 0.08, 0.05, centerX, 0.04, z), 0x2d3a46),
    paint(box(width, 0.08, 0.05, centerX, bus.windowTopY, z), 0x2d3a46),
    paint(box(0.06, bus.windowTopY, 0.05, door.minX + 0.03, bus.windowTopY / 2, z), 0x2d3a46),
    paint(box(0.06, bus.windowTopY, 0.05, door.maxX - 0.03, bus.windowTopY / 2, z), 0x2d3a46),
    paint(box(0.04, bus.windowTopY, 0.05, centerX, bus.windowTopY / 2, z), 0x2d3a46),
  ];
  const group = new THREE.Group();
  group.name = 'bus-door';
  group.add(mergeParts(frame, 'bus-door-frame'));
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.1, bus.windowTopY - 0.1),
    glassMaterial,
  );
  glass.rotation.y = Math.PI; // mira hacia adentro (-z)
  glass.position.set(centerX, bus.windowTopY / 2, z);
  group.add(glass);
  return group;
}

/** Cartel luminoso "PARADA SOLICITADA" sobre la puerta de atrás: versión apagada y prendida. */
function buildStopRequestedSign() {
  const make = (lit) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, 256, 48);
    ctx.fillStyle = lit ? '#ff3b30' : '#3a1a18';
    if (lit) {
      ctx.shadowColor = '#ff3b30';
      ctx.shadowBlur = 8;
    }
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PARADA SOLICITADA', 128, 25);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.13),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    mesh.rotation.y = Math.PI;
    // Sobre la cara de la carcasa, que a su vez está pegada al dintel de la puerta.
    mesh.position.set((bus.backDoor.minX + bus.backDoor.maxX) / 2, 2.15, bus.halfWidth - 0.032);
    return mesh;
  };
  const off = make(false);
  const on = make(true);
  on.visible = false;
  return {
    off,
    on,
    setLit(lit) {
      on.visible = lit;
      off.visible = !lit;
    },
  };
}

function buildObstacles() {
  const obstacles = [];
  const add = (minX, minZ, maxX, maxZ) =>
    obstacles.push(
      new THREE.Box3(new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(maxX, 2.3, maxZ)),
    );
  const { halfLength, halfWidth } = bus;

  // Paredes (las puertas también: se baja con E, no caminando).
  add(-halfLength - 1, -halfWidth - 1, halfLength + 1, -halfWidth);
  add(-halfLength - 1, halfWidth, halfLength + 1, halfWidth + 1);
  add(-halfLength - 1, -halfWidth, -halfLength + 0.25, halfWidth);
  add(halfLength - 0.4, -halfWidth, halfLength + 1, halfWidth); // tablero
  // Asientos de la izquierda (una franja continua) y de la derecha (salvo la puerta de atrás).
  const firstRow = seatRowsX[0] - 0.3;
  const lastRow = seatRowsX[seatRowsX.length - 1] + 0.3;
  add(firstRow, -halfWidth, lastRow, aisle.minZ);
  add(firstRow, aisle.maxZ, bus.backDoor.minX - 0.1, halfWidth);
  add(bus.backDoor.maxX + 0.5, aisle.maxZ, lastRow, halfWidth);
  // Puesto del chofer (asiento + mampara).
  add(4.3, -halfWidth, halfLength, -0.25);
  // Poste del timbre.
  add(bellPole.x - 0.05, bellPole.z - 0.05, bellPole.x + 0.05, bellPole.z + 0.05);
  return obstacles;
}

export function buildBusInterior() {
  const group = new THREE.Group();
  group.name = 'bus-interior';
  const parts = [];
  const glassPanes = [];
  const { halfLength, halfWidth, ceilingY, windowBottomY, windowTopY } = bus;
  const width = halfWidth * 2;

  // Piso de goma, techo y tubos de luz.
  parts.push(paint(box(halfLength * 2, 0.1, width, 0, -0.05, 0), 0x3a3d40));
  parts.push(paint(box(halfLength * 2, 0.08, width, 0, ceilingY + 0.04, 0), 0xd9d6cf));
  for (const z of [-0.5, 0.5]) {
    parts.push(paint(box(9.5, 0.02, 0.16, -0.3, ceilingY - 0.01, z), 0xfff8e6, { shaded: false }));
  }

  // Paredes laterales con ventanillas.
  addWall(parts, glassPanes, -1, [[-halfLength, halfLength]]);
  addWall(parts, glassPanes, 1, rightWallRuns());
  // Dinteles sobre las puertas (entre el marco y el techo), como el resto de la pared.
  const wallZ = halfWidth + WALL_THICKNESS / 2;
  for (const door of [bus.frontDoor, bus.backDoor]) {
    const centerX = (door.minX + door.maxX) / 2;
    parts.push(
      paint(
        box(
          door.maxX - door.minX,
          ceilingY - windowTopY,
          WALL_THICKNESS,
          centerX,
          (windowTopY + ceilingY) / 2,
          wallZ,
        ),
        0xc9c6bd,
      ),
    );
  }
  // Carcasa del cartel de "parada solicitada", pegada al dintel de la puerta de atrás.
  const signX = (bus.backDoor.minX + bus.backDoor.maxX) / 2;
  parts.push(paint(box(0.76, 0.18, 0.03, signX, 2.15, halfWidth - 0.015), 0x15161a));

  // Fondo: pared con luneta.
  const rearX = -halfLength - WALL_THICKNESS / 2;
  parts.push(
    paint(box(WALL_THICKNESS, windowBottomY, width, rearX, windowBottomY / 2, 0), 0xc9c6bd),
  );
  parts.push(
    paint(
      box(WALL_THICKNESS, ceilingY - windowTopY, width, rearX, (windowTopY + ceilingY) / 2, 0),
      0xc9c6bd,
    ),
  );

  // Frente: tablero, parabrisas y puesto del chofer.
  parts.push(
    paint(box(0.45, windowBottomY, width, halfLength - 0.22, windowBottomY / 2, 0), 0x2a2c2f),
  );
  parts.push(paint(box(0.06, 0.2, width, halfLength, ceilingY - 0.1, 0), 0x2a2c2f));
  parts.push(paint(box(0.05, 1.3, 0.95, 4.3, 0.65, -0.72), METAL)); // mampara del chofer
  parts.push(paint(roundedBox(0.5, 0.1, 0.5, driverSeat.x, 0.5, driverSeat.z, 0.04), 0x1d1d1d));
  parts.push(
    paint(roundedBox(0.08, 0.6, 0.5, driverSeat.x - 0.25, 0.85, driverSeat.z, 0.035), 0x1d1d1d),
  );
  const wheel = new THREE.TorusGeometry(0.2, 0.025, 8, 32);
  wheel.rotateY(Math.PI / 2);
  wheel.rotateZ(0.5);
  wheel.translate(5.22, 1.08, driverSeat.z);
  parts.push(paint(wheel, 0x111111));

  // Asientos.
  for (const x of seatRowsX) for (const z of leftSeatsZ) addSeat(parts, x, z);
  for (const x of rightSeatRowsX) addSeat(parts, x, rightSeatZ);

  // Caños verticales amarillos al borde del pasillo y pasamanos de arriba.
  for (const x of seatRowsX.filter((_, i) => i % 2 === 0)) {
    parts.push(paint(verticalPole(x + 0.3, aisle.minZ - 0.02), POLE_YELLOW));
    if (rightSeatRowsX.includes(x))
      parts.push(paint(verticalPole(x + 0.3, aisle.maxZ + 0.02), POLE_YELLOW));
  }
  for (const z of [aisle.minZ - 0.02, aisle.maxZ + 0.02]) {
    parts.push(paint(cylinderAlongX(0.018, 9.6, -0.4, 1.95, z), METAL));
  }

  // Poste con el timbre junto a la puerta de atrás.
  parts.push(paint(verticalPole(bellPole.x, bellPole.z), POLE_YELLOW));
  parts.push(
    paint(box(0.05, 0.08, 0.08, bellPole.x, bellPole.buttonY, bellPole.z - 0.04), 0xd32f2f, {
      shaded: false,
    }),
  );

  group.add(mergeParts(parts, 'bus-interior-static'));

  // Vidrios con gotas (ventanillas, luneta y parabrisas). Miran hacia adentro.
  const glassMaterial = new THREE.MeshBasicMaterial({
    map: createRainOnGlassTexture(),
    transparent: true,
    depthWrite: false,
  });
  const glassHeight = windowTopY - windowBottomY;
  for (const pane of glassPanes) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pane.width, glassHeight), glassMaterial);
    mesh.rotation.y = pane.side > 0 ? Math.PI : 0;
    mesh.position.set(pane.x, (windowBottomY + windowTopY) / 2, pane.z);
    group.add(mesh);
  }
  const rearGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.2, glassHeight),
    glassMaterial,
  );
  rearGlass.rotation.y = Math.PI / 2;
  rearGlass.position.set(rearX, (windowBottomY + windowTopY) / 2, 0);
  group.add(rearGlass);
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.1, 1.2), glassMaterial);
  windshield.rotation.y = -Math.PI / 2;
  windshield.position.set(halfLength, windowBottomY + 0.6, 0);
  group.add(windshield);

  const frontDoor = buildDoor(bus.frontDoor, glassMaterial);
  const backDoor = buildDoor(bus.backDoor, glassMaterial);
  const stopSign = buildStopRequestedSign();
  group.add(frontDoor, backDoor, stopSign.off, stopSign.on);

  // Cajas invisibles para apuntarle al timbre y a la puerta de atrás.
  const hitbox = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
    mesh.position.set(x, y, z);
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  };
  const bellHitbox = hitbox(0.3, 0.35, 0.25, bellPole.x, bellPole.buttonY, bellPole.z - 0.05);
  const backDoorHitbox = hitbox(
    bus.backDoor.maxX - bus.backDoor.minX,
    2,
    0.3,
    (bus.backDoor.minX + bus.backDoor.maxX) / 2,
    1,
    halfWidth - 0.1,
  );

  return {
    group,
    obstacles: buildObstacles(),
    bellHitbox,
    backDoorHitbox,
    setBackDoorOpen(open) {
      backDoor.visible = !open;
    },
    setStopRequested: stopSign.setLit,
  };
}
