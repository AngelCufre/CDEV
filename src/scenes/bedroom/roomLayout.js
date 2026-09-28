/**
 * Dimensiones y layout de la habitación, centralizados para que buildRoom.js
 * y los props (que necesitan saber dónde apoyarse) usen las mismas medidas.
 * Todo en metros, origen (0,0,0) en el centro del piso.
 */
export const room = {
  width: 4.6, // eje X
  depth: 4.0, // eje Z
  height: 2.6, // eje Y
  wallThickness: 0.15,

  window: {
    // en la pared norte (z = -depth/2)
    centerX: 0,
    width: 1.6,
    sillY: 0.95,
    headerY: 2.05,
  },

  door: {
    // en la pared sur (z = +depth/2)
    centerX: -1.5,
    width: 0.9,
    height: 2.1,
  },
};

/**
 * Anclas de posición de los muebles principales, compartidas entre los props
 * (que dibujan su geometría) y BedroomScene (que necesita saber, por ejemplo,
 * dónde está acostado el jugador al empezar o dónde parado frente al escritorio).
 */
export const furniture = {
  bed: {
    center: { x: -1.65, z: -0.8 },
    width: 1.1,
    length: 2.0,
    frameHeight: 0.42,
    mattressHeight: 0.16,
  },
  nightstand: {
    center: { x: -0.75, z: -1.55 },
    size: 0.42,
    height: 0.55,
  },
  desk: {
    center: { x: 1.85, z: -1.35 },
    width: 1.1,
    depth: 0.55,
    height: 0.75,
  },
  chair: {
    center: { x: 1.85, z: -0.55 },
  },
};
