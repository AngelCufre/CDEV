import { createDestinationGuide } from '../../world/destinationGuide.js';
import { aulas400, aulas400ToWorld } from './layout.js';

/** Señala la entrada del Inchaurrondo desde el patio, delante del frente vidriado. */
export function createFacultyEntranceGuide() {
  const doorCenter = (aulas400.hallDoor.minX + aulas400.hallDoor.maxX) / 2;
  const [x, z] = aulas400ToWorld(doorCenter, aulas400.hall.maxZ + 0.5);
  const [groundX, groundZ] = aulas400ToWorld(doorCenter, aulas400.hall.maxZ + 1.1);
  return createDestinationGuide({
    name: 'inchaurrondo-guide',
    x,
    z,
    arrowY: 3.8,
    groundX,
    groundZ,
    scale: 1.4,
  });
}
