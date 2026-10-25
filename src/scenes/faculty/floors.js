import { Collision } from '../../systems/Collision.js';
import { STORY_HEIGHT, flights } from './layout.js';

/**
 * Colisiones de un recorrido con dos niveles: la planta baja (todo el campus) y el 1° piso
 * (la torre de la escalera, el puente y los pasillos de aulas). `Collision` trabaja solo en
 * el plano XZ, así que cada nivel tiene la suya y el jugador usa la del nivel en el que
 * está. Sobre un tramo de escalera la altura sube hacia su lado `rise` y, pasada la mitad,
 * cuenta como el piso de arriba. Expone `resolve` igual que Collision, para pasárselo a
 * createPlayerMovement.
 */
export function createFloors(radius, obstaclesByFloor) {
  const collisions = obstaclesByFloor.map((obstacles) => {
    const collision = new Collision(radius);
    for (const box of obstacles) collision.addObstacle(box);
    return collision;
  });
  let floor = 0;

  function flightAt(x, z) {
    return flights.find((f) => x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ);
  }

  /** Qué tan arriba del tramo está (x, z): 0 abajo, 1 arriba, según hacia dónde sube. */
  function progress(f, x, z) {
    switch (f.rise) {
      case 'x-':
        return (f.maxX - x) / (f.maxX - f.minX);
      case 'x+':
        return (x - f.minX) / (f.maxX - f.minX);
      case 'z+':
        return (z - f.minZ) / (f.maxZ - f.minZ);
      default:
        return (f.maxZ - z) / (f.maxZ - f.minZ);
    }
  }

  /** Altura del piso bajo el jugador en (x, z). */
  function groundHeight(x, z) {
    const f = flightAt(x, z);
    if (!f) return floor * STORY_HEIGHT;
    return progress(f, x, z) * STORY_HEIGHT;
  }

  return {
    get floor() {
      return floor;
    },
    groundHeight,
    resolve(position, deltaX, deltaZ) {
      collisions[floor].resolve(position, deltaX, deltaZ);
      if (flightAt(position.x, position.z)) {
        floor = groundHeight(position.x, position.z) > STORY_HEIGHT / 2 ? 1 : 0;
      }
    },
    setFloor(value) {
      floor = value;
    },
  };
}
