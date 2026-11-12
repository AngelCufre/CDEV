import { createDestinationGuide } from '../../world/destinationGuide.js';
import { busStop } from './layout.js';

/** Flecha amarilla visible desde ambos lados de la vereda hasta llegar a la parada. */
export function createBusStopGuide() {
  return createDestinationGuide({
    name: 'bus-stop-guide',
    x: busStop.x,
    z: busStop.z + 0.33,
    groundZ: busStop.z + 0.9,
  });
}
