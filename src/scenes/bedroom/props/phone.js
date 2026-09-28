import * as THREE from 'three';
import { createPhoneScreenTexture } from '../../../utils/textures.js';
import { furniture } from '../roomLayout.js';
import { config } from '../../../config.js';

/**
 * Celular apoyado en la mesa de luz, pantalla hacia arriba, bloqueado con
 * notificaciones a la vista. Segundo objeto interactuable clave de la escena.
 */
export function buildPhone(nightstandTopY) {
  const group = new THREE.Group();
  group.name = 'phone';

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d0d0f,
    roughness: 0.3,
    metalness: 0.2,
  });
  const bodyGeometry = new THREE.BoxGeometry(0.07, 0.012, 0.145);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);

  const screenTexture = createPhoneScreenTexture(config.narrative.notificaciones);
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture });
  const screenGeometry = new THREE.PlaneGeometry(0.062, 0.135);
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = 0.007;
  group.add(screen);

  const { center, size } = furniture.nightstand;
  // Un poco corrido respecto al despertador para que no se solapen sobre la mesa de luz.
  group.position.set(center.x - size * 0.22, nightstandTopY + 0.006, center.z + size * 0.22);
  group.rotation.y = 0.3;

  return { group, interactableMesh: body };
}
