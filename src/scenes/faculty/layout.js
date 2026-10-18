/**
 * Layout de la escena 4, adentro del Edificio Gallardo de la UTN FRC. BOCETO: lo único
 * real por ahora es que el aula 500 está en planta baja; el resto (medidas, numeración,
 * escalera) es inventado y está todo acá para ajustarlo a las fotos.
 *
 * Edificio de dos plantas a lo largo de +x: el hall con la puerta a la calle (x = 0), un
 * pasillo con aulas a los dos lados y, al fondo, el hall de la escalera. La 500 está ahí
 * mismo, en planta baja junto a la escalera: el que sube buscándola pierde tiempo.
 */

export const buildingName = 'EDIFICIO GALLARDO';

export const STORY_HEIGHT = 3.6; // de piso a piso
export const CEILING_HEIGHT = 3.2; // alto libre de cada planta (después viene la losa)
export const WALL_THICKNESS = 0.2; // las paredes se centran sobre las líneas de abajo

export const hall = { minX: 0, maxX: 12, minZ: -7, maxZ: 7 };
export const corridor = { minX: 12, maxX: 37, minZ: -1.6, maxZ: 1.6 };
export const stairHall = { minX: 37, maxX: 46.5, minZ: -4, maxZ: 4 };

/** Tramo de escalera: sube hacia +x pegado a la pared +z del hall de la escalera. */
export const flight = { minX: 38.5, maxX: 44.5, minZ: 2, maxZ: 4, steps: 20 };

/** Puerta vidriada de entrada, en la pared x = hall.minX. */
export const entranceDoor = { minZ: -2, maxZ: 2, height: 2.4 };

/** Tramos del pasillo que ocupa cada aula (en x), iguales en las dos plantas. */
const classroomSpans = [
  [12, 18.25],
  [18.25, 24.5],
  [24.5, 30.75],
  [30.75, 37],
];

/**
 * Puertas de las aulas a los lados del pasillo. `side` = 1 es el lado +z (a la derecha
 * yendo desde el hall hacia la escalera) y -1 el lado -z.
 */
function doorsAlongCorridor(floor, numbersPlusZ, numbersMinusZ) {
  return classroomSpans.flatMap(([from, to], i) => [
    { floor, number: numbersPlusZ[i], x: from + 1.4, side: 1 },
    { floor, number: numbersMinusZ[i], x: to - 1.4, side: -1 },
  ]);
}

export const classroomDoors = [
  ...doorsAlongCorridor(0, ['502', '504', '506', '508'], ['501', '503', '505', '507']),
  ...doorsAlongCorridor(1, ['512', '514', '516', '518'], ['511', '513', '515', '517']),
];

/** Doble puerta del aula 500: planta baja, en la pared -z del hall de la escalera. */
export const aula500Door = { floor: 0, x: 44, width: 1.8, height: 2.2 };

// Cosas del hall.
export const bedelia = { x: 4.5, width: 3 }; // ventanilla en la pared +z
export const elevator = { x: 5, width: 1.4 }; // en la pared -z
export const directory = { z: 4.3, width: 2.2, height: 1.4 }; // cartelera en la pared x = hall.maxX
export const bench = { minX: 8, maxX: 11.2, z: -6.55 };
export const wetFloorSign = { x: 2.4, z: -1.1 };

/** Puerta de los baños en la pared -z del hall de la escalera (en las dos plantas). */
export const bathroomDoorX = 39.8;

/** Recién entrado por la puerta vidriada, mirando hacia el pasillo (+x). */
export const playerStart = { x: 1.3, z: 0, yaw: -Math.PI / 2 };

/** Yaw para que una persona (que mira a +x con yaw 0) mire hacia (tx, tz). */
function yawTowards(x, z, tx, tz) {
  return Math.atan2(-(tz - z), tx - x);
}

/** Estudiantes en ronda alrededor de (cx, cz), mirándose. */
function circle(floor, cx, cz, radius, angles) {
  return angles.map((angle) => {
    const x = cx + Math.cos(angle) * radius;
    const z = cz + Math.sin(angle) * radius;
    return { floor, x, z, yaw: yawTowards(x, z, cx, cz) };
  });
}

/**
 * Estudiantes parados (quietos). La ronda del pasillo de planta baja y el que está
 * apoyado en la pared de enfrente dejan un solo hueco angosto: hay que pedir permiso.
 */
export const students = [
  // Hall
  { floor: 0, x: 4.6, z: 6.0, yaw: -Math.PI / 2 }, // esperando en bedelía
  { floor: 0, x: 7.4, z: -4.6, yaw: yawTowards(7.4, -4.6, 8.2, -4.1) },
  { floor: 0, x: 8.2, z: -4.1, yaw: yawTowards(8.2, -4.1, 7.4, -4.6) },
  { floor: 0, x: 10.3, z: 3.0, yaw: 0 }, // leyendo la cartelera
  // Pasillo de planta baja
  { floor: 0, x: 15.0, z: 1.15, yaw: Math.PI / 2 },
  { floor: 0, x: 19.8, z: -1.15, yaw: -Math.PI / 2 },
  ...circle(0, 24.6, 0.05, 0.4, [0.4, 2.0, 3.6, 5.1]),
  { floor: 0, x: 24.6, z: -1.15, yaw: -Math.PI / 2 },
  { floor: 0, x: 33.4, z: 1.1, yaw: yawTowards(33.4, 1.1, 34.2, 0.55) },
  { floor: 0, x: 34.2, z: 0.55, yaw: yawTowards(34.2, 0.55, 33.4, 1.1) },
  // Hall de la escalera
  { floor: 0, x: 40.2, z: -2.8, yaw: Math.PI },
  // Pasillo del 1° piso
  { floor: 1, x: 34.8, z: -1.15, yaw: -Math.PI / 2 },
  ...circle(1, 21.2, -0.1, 0.45, [0.9, 3.0, 4.9]),
  { floor: 1, x: 16.2, z: 1.15, yaw: Math.PI / 2 },
  { floor: 1, x: 28.0, z: 1.15, yaw: Math.PI },
];
