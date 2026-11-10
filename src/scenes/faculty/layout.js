/**
 * Layout de la escena 4: la UTN FRC, del acceso de autos al aula 411. Está armado a partir
 * de fotos del patio central (referencias/utn) y del plano del predio: no es un plano
 * exacto, sino un recorrido que se le parece.
 *
 * Todo en metros; x crece hacia el este y z hacia el sur (Av. Cruz Roja). Con yaw 0 la
 * cámara mira al norte (-z). Se entra por el acceso de autos de la calle Maestro Marcelo
 * López (oeste) al estacionamiento, al sur del Edificio Central y el Auditorio. De ahí sale
 * el sendero entre los pinos y el pasto hasta la calle interna, entre el edificio UTN FRC
 * (oeste) y la galería del Edificio Central (este, aulas 200). Más al norte se abre el patio
 * central, con la torre de la escalera vidriada (de su 1° piso sale un puente al Central).
 * Del lado de Maestro López, pegado al UTN FRC y mirando al patio, está el edificio de aulas
 * 400: el aula 411 es en su 1° piso. Al fondo de la avenida, el Edificio Madders.
 */

export const STORY_HEIGHT = 3.6; // de la planta baja al 1° piso
export const CEILING_HEIGHT = 3.2; // alto libre adentro (después viene la losa)
export const WALL_THICKNESS = 0.2;

// ---------- Calles, estacionamiento y acceso ----------

/** Reja sobre la calle Maestro Marcelo López (oeste), con el acceso de autos. */
export const westFenceX = -32.5;
/** Reja del fondo del estacionamiento, sobre la Av. Cruz Roja (sur). */
export const southFenceZ = 47.2;
/** Estacionamiento al sur del Central: carril de autos y una hilera de lugares a cada lado. */
export const parking = { minX: westFenceX, maxX: 44, minZ: 31.4, maxZ: southFenceZ };
export const parkingLane = { minZ: 36.6, maxZ: 41.8 };
/** Acceso de autos (con barrera) en la reja oeste. */
export const carGate = { minZ: parkingLane.minZ, maxZ: parkingLane.maxZ };

/** Recién entrado por el acceso de autos, mirando hacia el estacionamiento (este). */
export const playerStart = { x: -29.5, z: 39.2, yaw: -Math.PI / 2 };

// ---------- Pisos de afuera ----------

/** Sendero de losetas desde el estacionamiento: pinos y cercos al oeste, pasto al este. */
export const entrancePath = { minX: -1.25, maxX: 1.25, minZ: -3, maxZ: parking.minZ };
/** Explanada donde el sendero llega a los edificios. */
export const plaza = { minX: -6, maxX: 14, minZ: -8, maxZ: -3 };
/** Calle interna entre el edificio UTN FRC y la galería. */
export const innerStreet = { minX: 3, maxX: 10.3, minZ: -52, maxZ: -8 };
/** Piso de la galería techada del Edificio Central. */
export const galleryFloor = { minX: 10.3, maxX: 14, minZ: -52, maxZ: -8 };
/** Adoquines en espina de pez: el patio central y la avenida hasta el Madders. */
export const pavedAreas = [
  { minX: -17, maxX: 3, minZ: -64, maxZ: -30 }, // patio central
  { minX: 3, maxX: 9.5, minZ: -64, maxZ: -52 },
  { minX: -4, maxX: 9.5, minZ: -86, maxZ: -64 }, // avenida al norte
  { minX: 9.5, maxX: 14, minZ: -54, maxZ: -52 }, // hasta la entrada del bloque de hormigón
];
/** Explanada del Auditorio, entre su entrada y el estacionamiento. */
export const auditoriumPlaza = { minX: 14, maxX: 44, minZ: 25, maxZ: parking.minZ };
/** Canteros de pasto del patio (un poco elevados, con cordón). */
export const lawnIslands = [
  { minX: -9, maxX: -3, minZ: -58, maxZ: -51 }, // el del mástil rojo
  { minX: -15, maxX: -10, minZ: -63, maxZ: -57.5 }, // el ciprés grande
  { minX: -12, maxX: -5, minZ: -43, maxZ: -36 }, // el jacarandá
];
/** Canteros altos de material, con aves del paraíso. */
export const planters = [
  { minX: -7, maxX: -1.5, minZ: -63.5, maxZ: -61 },
  { minX: -12, maxX: -9, minZ: -33.6, maxZ: -31.6 },
];

// ---------- Edificios ----------

/**
 * Edificio Central (aulas 200): tres plantas; la cara oeste tiene la galería, los
 * parasoles y la chapa ocre arriba.
 */
export const longBuilding = { minX: 14, maxX: 52, minZ: -52, maxZ: 12 };
/** Auditorio, pegado a la punta sur del Central, con la entrada al estacionamiento. */
export const auditorium = { minX: 22, maxX: 44, minZ: 12, maxZ: 25, height: 9.5 };
/** Cara del primer piso (vidrios y parasoles), más afuera que la planta baja. */
export const upperFacadeX = 12.6;
/** Borde de la galería (columnas y faja de chapa plateada), de z = -52 a -8. */
export const gallery = { edgeX: 10.3, minZ: -52, maxZ: -8 };
/** Puertas de planta baja que dan a la galería (cerradas: laboratorios). */
export const labDoorsZ = [-22, -42];
/**
 * Torre de hormigón de la escalera de emergencia, en la punta sur del Central. Termina en
 * x = 12.5, donde arranca la pared del pasillo del 1° piso.
 */
export const emergencyCore = { minX: 8.6, maxX: 12.5, minZ: 4, maxZ: 12, height: 14.4 };
/** Puerta de la escalera de emergencia, en la cara oeste de la torre de hormigón. */
export const emergencyDoorZ = 8;

/** Edificio UTN FRC: cuatro plantas, panel negro y el logo en la entrada. */
export const frcBuilding = { minX: -18, maxX: 3, minZ: -30, maxZ: -8, floorHeight: 3.3, floors: 4 };
/** Entrada retirada bajo los pisos de arriba, con las puertas vidriadas y el logo. */
export const frcEntrance = { minZ: -23, maxZ: -14, doorX: 0.8 };

/** Torre de la escalera vidriada, en el borde del patio. */
export const stairTower = { minX: -1, maxX: 5, minZ: -42, maxZ: -32, height: 14.4 };
/** Puerta de la torre, en la pared sur. */
export const towerDoor = { minX: -0.7, maxX: 1.5 };
/** Tramo de la escalera de la torre: sube hacia el norte (-z), pegado a la pared oeste. */
export const flight = { minX: -0.9, maxX: 1.2, minZ: -39.4, maxZ: -33.4, steps: 20 };
/** Puente techado del 1° piso: de la torre al pasillo del Edificio Central. */
export const bridge = { minX: 5, maxX: 12.6, minZ: -38.6, maxZ: -36.4 };
/** Abertura del puente en la pared este de la torre y en la oeste del pasillo. */
export const bridgeOpening = { minZ: -38.4, maxZ: -36.6 };
/** Kiosco de avisos al pie de la torre. */
export const booth = { minX: -3.8, maxX: -1.2, minZ: -37.4, maxZ: -34.2 };

/** Edificio de una planta con paneles solares, al norte del patio. */
export const solarBuilding = { minX: -30, maxX: -4, minZ: -78, maxZ: -64, height: 4.2 };
/** Bloque de hormigón con ventanitas cuadradas, donde termina la galería. */
export const concreteBlock = { minX: 9.5, maxX: 24, minZ: -68, maxZ: -54, height: 15 };
/** Pabellón chico con techo de chapa a dos aguas, sobre la avenida. */
export const pavilion = { minX: 4.5, maxX: 9.5, minZ: -81, maxZ: -74 };
/** Mástil de la antena, detrás del Central. */
export const antenna = { x: 62, z: -24, height: 46 };

/** Edificio Madders, al fondo de la avenida (cerrado), con la esquina vidriada. */
export const madders = { minX: -12, maxX: 16, minZ: -100, maxZ: -86, height: 10.8 };
export const maddersGlass = { minX: -2, maxX: 6, frontZ: -84.8 };

// ---------- Edificio de aulas 400 ----------

/**
 * El edificio de aulas 400 se arma en un marco local (fachada en z = 0 mirando a +z, el
 * edificio hacia -z) y se ubica girándolo `angle` y llevándolo a (x, z): queda sobre
 * Maestro López, pegado al UTN FRC, con el hall vidriado mirando al patio (este).
 */
export const aulas400Placement = { angle: Math.PI / 2, x: -17, z: -47 };

/** Del marco local del edificio de aulas 400 al mundo. */
export function aulas400ToWorld(x, z) {
  const { angle } = aulas400Placement;
  const c = Math.round(Math.cos(angle));
  const s = Math.round(Math.sin(angle));
  return [x * c + z * s + aulas400Placement.x, -x * s + z * c + aulas400Placement.z];
}

function rectToWorld({ minX, maxX, minZ, maxZ }) {
  const [ax, az] = aulas400ToWorld(minX, minZ);
  const [bx, bz] = aulas400ToWorld(maxX, maxZ);
  return {
    minX: Math.min(ax, bx),
    maxX: Math.max(ax, bx),
    minZ: Math.min(az, bz),
    maxZ: Math.max(az, bz),
  };
}

/** Medidas en el marco local. */
export const aulas400 = {
  building: { minX: -14, maxX: 14, minZ: -14, maxZ: 0, height: 10.8 },
  /** Hall vidriado de la escalera, que sobresale de la fachada: ahí está la entrada. */
  hall: { minX: -4, maxX: 4, minZ: -6.4, maxZ: 2.6, height: 11.6 },
  hallDoor: { minX: -0.8, maxX: 1.6 },
  /** Tramo de la escalera del hall: sube hacia -z (local), pegado a la pared -x. */
  flight: { minX: -3.9, maxX: -1.9, minZ: -4.6, maxZ: 1.4, steps: 20 },
  /** Abertura del 1° piso entre el hall y el pasillo (en la pared z = hall.minZ). */
  hallOpening: { minX: -3.4, maxX: -0.6 },
  /** Puerta de planta baja del hall hacia las aulas 401 a 405 (cerrada). */
  lobbyDoorX: 1.9,
  /** Pasillo del 1° piso, a lo largo del edificio, con aulas a los dos lados. */
  corridor: { minX: -14, maxX: 14, minZ: -9.4, maxZ: -6.4 },
  /** Aulas del pasillo: `side` = -1 del lado del fondo (z = minZ), 1 del lado del patio. */
  classrooms: [
    { number: '406', x: -9.5, side: 1 },
    { number: '407', x: -10.5, side: -1 },
    { number: '408', x: -5.2, side: -1 },
    { number: '409', x: 0.6, side: -1 },
    { number: '410', x: 6, side: -1 },
    { number: '412', x: 8.5, side: 1 },
  ],
  /** El aula del parcial: al fondo del pasillo, del lado de la calle. */
  aula411: { number: '411', x: 11.4, side: -1 },
};

/** Lo mismo, en coordenadas de mundo (para colisiones, techos y zonas). */
export const aulas400World = {
  building: rectToWorld(aulas400.building),
  hall: rectToWorld(aulas400.hall),
  // El tramo sube hacia -z local, que girado es -x en el mundo.
  flight: { ...rectToWorld(aulas400.flight), rise: 'x-' },
};

// ---------- 1° piso del Edificio Central ----------

/** Pasillo del 1° piso del Central: vidrios al oeste (al patio) y las aulas al este. */
export const corridor = { minX: upperFacadeX, maxX: 15.7, minZ: -50, maxZ: 10 };
/** Puertas de las aulas, en la pared este del pasillo. */
export const classroomDoors = [
  { number: '201', z: 2 },
  { number: '202', z: -5 },
  { number: '203', z: -12 },
  { number: '204', z: -19 },
  { number: '205', z: -26 },
  { number: '206', z: -33 },
  { number: '207', z: -42 },
  { number: '208', z: -47.5 },
];
/** Doble puerta del aula 209, al fondo del pasillo (pared sur). */
export const endDoor = { number: '209', width: 1.8, height: 2.2 };
/** Puerta a la escalera de emergencia, en la pared oeste (dentro de la torre de hormigón). */
export const coreDoorZ = 7;

/** Tramos de escalera del recorrido; `rise` es hacia dónde sube cada uno. */
export const flights = [{ ...flight, rise: 'z-' }, aulas400World.flight];

// ---------- Gente ----------

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

/** Gente ubicada en el marco local del edificio de aulas 400, llevada al mundo. */
function inAulas400(people) {
  return people.map((person) => {
    const [x, z] = aulas400ToWorld(person.x, person.z);
    return { ...person, x, z, yaw: person.yaw + aulas400Placement.angle };
  });
}

/**
 * Estudiantes quietos: abajo se juntan donde no llueve (galería, entrada del UTN FRC, bajo
 * el puente, el hall de las aulas 400) y alguno cruza con paraguas. En los pasillos
 * del 1° piso hay rondas que dejan huecos angostos: hay que pedir permiso.
 */
export const students = [
  // Galería
  ...circle(0, 12.4, -25.2, 0.45, [0.3, 2.3, 4.2]),
  { floor: 0, x: 13.5, z: -40.5, yaw: Math.PI },
  { floor: 0, x: 11.2, z: -12.5, yaw: yawTowards(11.2, -12.5, 11.8, -13.1) },
  { floor: 0, x: 11.8, z: -13.1, yaw: yawTowards(11.8, -13.1, 11.2, -12.5) },
  // Entrada del UTN FRC
  { floor: 0, x: 1.7, z: -15.8, yaw: 0 },
  { floor: 0, x: 2.1, z: -21.6, yaw: yawTowards(2.1, -21.6, 2.6, -21) },
  // Bajo el puente y en la planta baja de la torre
  { floor: 0, x: 7.4, z: -37.2, yaw: Math.PI / 2 },
  { floor: 0, x: 3.6, z: -35.2, yaw: Math.PI },
  // Estacionamiento, patio y avenida, con paraguas
  { floor: 0, x: 9, z: 34, yaw: Math.PI / 2, umbrella: 0x2f5d3a },
  { floor: 0, x: -3.5, z: -45, yaw: 0.6, umbrella: 0x1d3557 },
  { floor: 0, x: -9, z: -60.6, yaw: -0.4, umbrella: 0x8e2a2a },
  { floor: 0, x: 6.5, z: -60, yaw: -Math.PI / 2, umbrella: 0x2b2b2b },
  // Hall de las aulas 400 (en su marco local)
  ...inAulas400([
    { floor: 0, x: 2.8, z: -2.5, yaw: Math.PI },
    { floor: 0, x: 2.3, z: 0.8, yaw: yawTowards(2.3, 0.8, 2.9, 0.4) },
    { floor: 0, x: 2.9, z: 0.4, yaw: yawTowards(2.9, 0.4, 2.3, 0.8) },
  ]),
  // Pasillo del 1° piso del Central
  { floor: 1, x: 15.25, z: -31, yaw: Math.PI },
  ...circle(1, 14.15, -21.4, 0.45, [0.5, 2.6, 4.6]),
  { floor: 1, x: 12.95, z: -21.6, yaw: 0 },
  { floor: 1, x: 15.25, z: 1.2, yaw: Math.PI },
  // Pasillo del 1° piso de las aulas 400 (en su marco local)
  ...inAulas400([
    { floor: 1, x: -8, z: -7.2, yaw: Math.PI / 2 },
    ...circle(1, 7.3, -7.8, 0.45, [0.2, 2.2, 4.3]),
    { floor: 1, x: 7.4, z: -6.75, yaw: -Math.PI / 2 },
    { floor: 1, x: 13, z: -8.4, yaw: Math.PI },
  ]),
];

// ---------- Lluvia, techos y límites ----------

/**
 * Techos: debajo no llueve (las gotas no pasan de esa altura) y el jugador se seca.
 * `y` es la altura de la cara de abajo del techo.
 */
export const roofs = [
  { minX: gallery.edgeX - 0.1, maxX: upperFacadeX, minZ: gallery.minZ, maxZ: gallery.maxZ, y: 3.3 },
  {
    minX: upperFacadeX - 0.1,
    maxX: longBuilding.maxX,
    minZ: longBuilding.minZ,
    maxZ: longBuilding.maxZ,
    y: 11.6,
  },
  { minX: auditorium.minX, maxX: auditorium.maxX, minZ: 12, maxZ: 26.5, y: 3.4 },
  { minX: frcBuilding.minX, maxX: frcBuilding.maxX, minZ: -30, maxZ: -8, y: 14 },
  { minX: stairTower.minX, maxX: stairTower.maxX, minZ: -42, maxZ: -32, y: 15 },
  { minX: bridge.minX, maxX: bridge.maxX, minZ: bridge.minZ, maxZ: bridge.maxZ, y: 6.6 },
  { minX: 8.6, maxX: 14, minZ: 4, maxZ: 12, y: 14.4 },
  { minX: -4.2, maxX: -0.8, minZ: -37.8, maxZ: -33.8, y: 2.8 },
  { minX: -30, maxX: -4, minZ: -78, maxZ: -64, y: 4.5 },
  { minX: 9.5, maxX: 24, minZ: -68, maxZ: -54, y: 15 },
  { minX: 4, maxX: 10, minZ: -81.5, maxZ: -73.5, y: 3.4 },
  { minX: madders.minX, maxX: madders.maxX, minZ: madders.minZ, maxZ: madders.maxZ, y: 11.6 },
  { ...aulas400World.building, y: 11.6 },
  { ...aulas400World.hall, y: 11.6 },
];

/** Altura del techo más bajo sobre (x, z), o Infinity si está a cielo abierto. */
export function roofHeightAt(x, z) {
  let lowest = Infinity;
  for (const roof of roofs) {
    if (x < roof.minX || x > roof.maxX || z < roof.minZ || z > roof.maxZ) continue;
    if (roof.y < lowest) lowest = roof.y;
  }
  return lowest;
}

const inside = (rect, x, z) => x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ;

/** Adentro de una de las dos escaleras vidriadas (la torre del patio o el hall de las 400). */
export function isInsideStairHall(x, z) {
  return inside(stairTower, x, z) || inside(aulas400World.hall, x, z);
}

/** Adentro del edificio de aulas 400 (el hall o el pasillo del 1° piso). */
export function isInsideAulas400(x, z) {
  return inside(aulas400World.hall, x, z) || inside(aulas400World.building, x, z);
}

/** En el 1° piso del Edificio Central (el puente o su pasillo). */
export function isInCentralUpper(x, z, floor) {
  return (
    floor === 1 &&
    x > stairTower.maxX + 0.5 &&
    x < longBuilding.maxX &&
    z > longBuilding.minZ &&
    z < longBuilding.maxZ
  );
}

/**
 * Límites invisibles de la planta baja, además de las paredes de los edificios: las rejas
 * (el acceso de autos también: por ahí se vino), los cercos vivos y los bordes del predio.
 */
export const bounds = [
  { minX: westFenceX - 0.4, maxX: westFenceX, minZ: -70, maxZ: southFenceZ + 0.4 }, // reja oeste
  { minX: westFenceX, maxX: parking.maxX + 0.4, minZ: southFenceZ, maxZ: southFenceZ + 0.4 },
  { minX: parking.maxX, maxX: parking.maxX + 0.4, minZ: 12, maxZ: southFenceZ }, // fondo este
  { minX: westFenceX, maxX: -2.2, minZ: 31, maxZ: 31.4 }, // cerco entre los pinos y el estacionamiento
  { minX: -2.8, maxX: -2.3, minZ: -3, maxZ: 31.4 }, // cerco al oeste del sendero
  { minX: -6.4, maxX: -2.3, minZ: -3, maxZ: -2.6 },
  { minX: -6.4, maxX: -6, minZ: -8, maxZ: -2.6 },
  // Jardines a los costados del edificio de aulas 400 (entre el UTN FRC y el de los paneles).
  {
    minX: westFenceX,
    maxX: aulas400World.building.maxX,
    minZ: aulas400World.building.maxZ,
    maxZ: -30,
  },
  {
    minX: westFenceX,
    maxX: aulas400World.building.maxX,
    minZ: -64,
    maxZ: aulas400World.building.minZ,
  },
  { minX: -4.4, maxX: -4, minZ: -86, maxZ: -78 },
  { minX: 9.5, maxX: 9.9, minZ: -86, maxZ: -68 },
  { minX: 14, maxX: 24, minZ: -54, maxZ: -52 }, // unión del bloque con el Central
];
