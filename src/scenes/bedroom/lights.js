import * as THREE from 'three';
import { config } from '../../config.js';
import { room } from './roomLayout.js';

/**
 * Iluminación de la escena: una única luz direccional con sombras (el sol entrando
 * por la ventana, ya alto — refuerza que es tarde) más una luz ambiental suave.
 * Solo esta luz emite sombras, tal como pide el presupuesto de rendimiento.
 */
export function buildLights() {
  const sun = new THREE.DirectionalLight(config.luces.solColor, config.luces.solIntensidad);
  // Entra por la ventana (pared norte, z negativo) en diagonal hacia el escritorio,
  // barriendo piso y pared este para que se note la luz cálida de mañana.
  sun.position.set(-1.2, 3.0, -3.8);
  sun.target.position.set(1.2, 0.4, 1.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(config.luces.shadowMapSize, config.luces.shadowMapSize);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 10;
  sun.shadow.camera.left = -room.width;
  sun.shadow.camera.right = room.width;
  sun.shadow.camera.top = room.height + 1;
  sun.shadow.camera.bottom = -1;
  sun.shadow.bias = -0.002;

  // Relleno natural: cielo frío arriba, rebote cálido del piso abajo. No emite
  // sombras, así que no suma al presupuesto de "una sola luz con sombras".
  const fill = new THREE.HemisphereLight(
    config.luces.cieloColor,
    config.luces.sueloColor,
    config.luces.ambienteIntensidad,
  );

  const group = new THREE.Group();
  group.add(sun, sun.target, fill);

  return { group, sun, fill };
}
