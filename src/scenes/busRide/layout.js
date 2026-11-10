/**
 * Layout de la escena 3, arriba del colectivo. El colectivo queda quieto en el origen
 * (piso interior en y = 0, frente hacia +x) y es la ciudad la que se mueve hacia -x.
 * La vereda donde para está del lado +z (derecha), igual que en la escena 2.
 */
export const bus = {
  halfLength: 5.75,
  halfWidth: 1.2, // cara interior de las paredes
  ceilingY: 2.3,
  windowBottomY: 1.0,
  windowTopY: 2.0,
  frontDoor: { minX: 4.35, maxX: 5.45 },
  backDoor: { minX: -2.1, maxX: -0.9 },
};

/** Pasillo libre entre los asientos (en Z). */
export const aisle = { minZ: -0.35, maxZ: 0.72 };

/** Filas de asientos (todos mirando hacia adelante). */
export const seatRowsX = [-5.0, -4.15, -3.3, -2.45, -1.6, -0.75, 0.1, 0.95, 1.8, 2.65, 3.5];
export const leftSeatsZ = [-1.0, -0.58]; // asientos dobles
export const rightSeatZ = 0.98; // asientos individuales
/** Del lado derecho no hay asientos frente a la puerta de atrás. */
export const rightSeatRowsX = seatRowsX.filter(
  (x) => x + 0.25 < bus.backDoor.minX || x - 0.25 > bus.backDoor.maxX,
);

/** El asiento que se libera en la parada intermedia (y que te ganan). */
export const freedSeat = { x: -3.3, z: rightSeatZ };

export const driverSeat = { x: 4.85, z: -0.7 };

/** Poste con el timbre, al borde del pasillo junto a la puerta de atrás. */
export const bellPole = { x: -0.8, z: aisle.maxZ, buttonY: 1.35 };

/** Recién subido por la puerta de adelante, mirando hacia el fondo del colectivo. */
export const playerStart = { x: 4.1, z: 0.25, yaw: Math.PI / 2 };

/**
 * Pasajeros parados en el pasillo, pegados alternadamente a un lado y al otro: queda
 * un hueco en zigzag por donde pasar de costado (con el radio de colisión del viaje).
 */
export const standingPassengers = [
  { x: 2.9, z: 0.5, yaw: Math.PI, armUp: true },
  { x: 1.9, z: -0.13, yaw: 0, armUp: true },
  { x: 0.9, z: 0.5, yaw: Math.PI / 2, armUp: false },
  { x: -0.15, z: -0.13, yaw: Math.PI, armUp: true },
  { x: -1.9, z: -0.13, yaw: 0.3, armUp: true },
  { x: -4.6, z: 0.5, yaw: 0, armUp: true },
  { x: -5.2, z: -0.13, yaw: Math.PI / 2, armUp: false },
  { x: 5.0, z: 0.85, yaw: Math.PI, armUp: false }, // junto a la puerta de adelante
];

/** El pasajero parado que te gana el asiento libre. */
export const rival = { x: -3.85, z: 0.12, yaw: 0 };

/** La calle (y por debajo del piso del colectivo). */
export const road = {
  surfaceY: -0.9,
  sidewalkY: -0.75,
  centerLineZ: -1.75,
  oppositeLaneZ: -3.5,
  rightCurbZ: 1.75,
  leftCurbZ: -5.25,
  sidewalkWidth: 3,
};
