/**
 * Layout de la escena 5, el parcial en el aula 500. Todo en metros. El pizarrón está en
 * la pared del frente (z negativo) y los alumnos miran hacia -z. Las ventanas están en
 * la pared izquierda (x negativo): una tiene la banderola abierta y por ahí entra el
 * viento que vuela las hojas.
 */

export const room = {
  minX: -5,
  maxX: 5,
  minZ: -4.5,
  maxZ: 4.5,
  height: 3.2,
};

/** Ventanas en la pared izquierda (x = room.minX), de `fromZ` a `toZ`. */
export const windows = [
  { fromZ: -3.4, toZ: -1.8 },
  { fromZ: -0.6, toZ: 1.0, open: true },
  { fromZ: 1.8, toZ: 3.4 },
];
export const windowSill = 0.95;
export const windowHead = 2.35;

/** Puerta en la pared derecha, cerca del frente. */
export const door = { fromZ: -3.8, toZ: -2.85, height: 2.1 };

/** Pizarrón en la pared del frente. */
export const board = { width: 4.2, height: 1.25, bottomY: 1.0 };

/** Escritorio de la profesora, frente al pizarrón. */
export const teacherDesk = { x: 0, z: -3.45, width: 1.4, depth: 0.7, height: 0.76 };

/** Bancos de los alumnos (centro de la tabla). Columnas en X, filas en Z. */
export const deskColumns = [-3.4, -1.6, 1.6, 3.4];
export const deskRows = [-2.1, -0.85, 0.4, 1.65, 2.9];
export const desk = { width: 0.62, depth: 0.46, height: 0.75 };
/** La silla queda detrás del banco (hacia +z). */
export const chairOffsetZ = 0.46;

/** El banco del jugador: al lado de la ventana abierta, en la fila del medio. */
export const playerDesk = { x: deskColumns[0], z: deskRows[2] };

/** Bancos vacíos (además del del jugador): no todos vinieron. */
export const emptyDesks = [
  { x: deskColumns[1], z: deskRows[4] },
  { x: deskColumns[3], z: deskRows[0] },
  { x: deskColumns[2], z: deskRows[3] },
];

/** Ojos del jugador sentado, mirando el banco. */
export const playerEye = {
  x: playerDesk.x,
  y: 1.18,
  z: playerDesk.z + chairOffsetZ + 0.04,
  yaw: 0,
  pitch: -0.62,
};

/** Adónde caen las hojas que vuela el viento: en el pasillo, al alcance de la mano. */
export const sheetFloorSpots = [
  { x: -2.75, z: 0.05, yaw: 0.6 },
  { x: -2.6, z: 0.95, yaw: -0.4 },
  { x: -2.9, z: -0.45, yaw: 1.3 },
];

/**
 * Recorrido de la profesora (vuelta cerrada por los pasillos): adelante, el pasillo de
 * la ventana (el del jugador), el fondo y el otro pasillo. `pause` = se queda un rato.
 */
export const professorLoop = [
  { x: 2.5, z: -3.0 },
  { x: 0, z: -3.0, pause: true },
  { x: -2.5, z: -3.0 },
  { x: -2.5, z: 3.7 },
  { x: 2.5, z: 3.7 },
];

/** Donde se para la profesora a retirar el parcial del jugador. */
export const handInSpot = { x: -2.55, z: playerDesk.z - 0.1 };
