import { Collision } from '../../systems/Collision.js';
import { STORY_HEIGHT, flight } from './layout.js';

/**
 * Colisiones de un edificio de dos plantas. `Collision` trabaja solo en el plano XZ, así
 * que cada planta tiene la suya y el jugador usa la de la planta en la que está. Sobre el
 * tramo de la escalera la altura sube con x y, pasada la mitad, cuenta como el piso de
 * arriba. Expone `resolve` igual que Collision, para pasárselo a createPlayerMovement.
 */
export function createFloors(radius, obstaclesByFloor) {
  const collisions = obstaclesByFloor.map((obstacles) => {
    const collision = new Collision(radius);
    for (const box of obstacles) collision.addObstacle(box);
    return collision;
  });
  let floor = 0;

  function isOnFlight(x, z) {
    return x >= flight.minX && x <= flight.maxX && z >= flight.minZ && z <= flight.maxZ;
  }

  /** Altura del piso bajo el jugador en (x, z). */
  function groundHeight(x, z) {
    if (!isOnFlight(x, z)) return floor * STORY_HEIGHT;
    return ((x - flight.minX) / (flight.maxX - flight.minX)) * STORY_HEIGHT;
  }

  return {
    get floor() {
      return floor;
    },
    groundHeight,
    resolve(position, deltaX, deltaZ) {
      collisions[floor].resolve(position, deltaX, deltaZ);
      if (isOnFlight(position.x, position.z)) {
        floor = groundHeight(position.x, position.z) > STORY_HEIGHT / 2 ? 1 : 0;
      }
    },
    setFloor(value) {
      floor = value;
    },
  };
}
