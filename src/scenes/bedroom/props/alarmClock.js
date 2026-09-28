import * as THREE from 'three';
import { createClockScreenTexture } from '../../../utils/textures.js';
import { furniture } from '../roomLayout.js';
import { config } from '../../../config.js';

/**
 * Despertador digital sobre la mesa de luz. Es uno de los dos objetos interactuables
 * clave: al mirarlo y presionar E dispara la transición a REALIZATION.
 * La pantalla es una textura Canvas (no se re-genera en el loop de render).
 */
export function buildAlarmClock(nightstandTopY) {
  const group = new THREE.Group();
  group.name = 'alarm-clock';

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 });
  const bodyGeometry = new THREE.BoxGeometry(0.18, 0.08, 0.09);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = false;
  body.receiveShadow = false;
  group.add(body);

  const screenTexture = createClockScreenTexture(config.narrative.horaDespertar);
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture });
  const screenGeometry = new THREE.PlaneGeometry(0.14, 0.05);
  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, 0.005, 0.046);
  group.add(screen);

  const { center } = furniture.nightstand;
  group.position.set(center.x, nightstandTopY + 0.04, center.z);
  group.rotation.y = Math.PI * 0.65; // encarado hacia el centro de la habitación

  return { group, interactableMesh: body };
}
