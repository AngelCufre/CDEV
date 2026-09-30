/**
 * Layout de la parada del colectivo. Todo en metros; la calle corre a lo largo del
 * eje X y el jugador está en la vereda del lado +z.
 *
 * Se maneja por la derecha: en el carril +z los vehículos van hacia +x (con la puerta
 * del lado de la vereda del jugador) y en el carril -z van hacia -x.
 */
export const street = {
  halfWidth: 3.5,
  laneZ: 1.75,
  surfaceY: -0.15, // la calzada queda un cordón más abajo que la vereda
  length: 150,
};

export const sidewalk = {
  nearZ: 3.5, // cordón
  farZ: 6.5, // cerco de los jardines
  width: 3,
};

/** Casas de este lado de la calle: la fachada mira a la calle (-z). */
export const housesFrontZ = 9.5;

/**
 * La casa del estudiante (de donde sale), con su portón en el cerco. El jardín del
 * frente es caminable: va del cerco a la fachada y ocupa el ancho del terreno.
 */
export const home = { x: -6.5, gateWidth: 1.2, lotHalfWidth: 3 };

/** Poste de la parada (sin techo). El colectivo frena con la puerta a su altura. */
export const busStop = { x: 2, z: 3.95 };

/** Zona caminable: la vereda, entre estos extremos en X. */
export const walkableX = { min: -16, max: 16 };

/** Donde aparece el jugador: recién salido por la puerta de su casa, mirando a la calle. */
export const playerStart = { x: home.x, z: housesFrontZ - 0.7, yaw: 0 };

/** Llegó a la parada cuando está sobre la vereda a menos de esta distancia del poste (en X). */
export const busStopArrivalDistance = 3.5;

/** Faroles de la cuadra (este lado y enfrente). */
export const lampPosts = [
  { x: -12, z: 3.8, armDirZ: -1 },
  { x: 12, z: 3.8, armDirZ: -1 },
  { x: -1, z: -3.8, armDirZ: 1 },
  { x: 22, z: -3.8, armDirZ: 1 },
  { x: -24, z: -3.8, armDirZ: 1 },
];

/** Árboles en canteros de la vereda (obstáculos) y en los jardines. */
export const sidewalkTrees = [
  { x: -2.5, z: 4.15, type: 'round', scale: 0.9 },
  { x: 8.5, z: 4.15, type: 'round', scale: 1.0 },
];

/** Charcos sobre la vereda: elipses con radios rx (en X) y rz (en Z). */
export const puddles = [
  { x: -9.5, z: 4.7, rx: 0.8, rz: 0.5 },
  { x: -4.2, z: 5.3, rx: 0.7, rz: 0.45 },
  { x: 1.0, z: 4.45, rx: 1.0, rz: 0.5 },
  { x: 5.2, z: 5.5, rx: 0.6, rz: 0.42 },
  { x: 11.0, z: 4.9, rx: 0.9, rz: 0.55 },
];
