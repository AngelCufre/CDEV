import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.012, 0.145, 3, 0.005), bodyMaterial);
  body.castShadow = true;
  group.add(body);

  const screenTexture = createPhoneScreenTexture(config.narrative.notificaciones);
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, color: 0xffffff });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.135), screenMaterial);
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = 0.0065;
  group.add(screen);

  const { center, size } = furniture.nightstand;
  // Un poco corrido respecto al despertador para que no se solapen sobre la mesa de luz.
  group.position.set(center.x - size * 0.22, nightstandTopY + 0.006, center.z + size * 0.22);
  group.rotation.y = 0.3;

  let blinkTime = 0;
  let blinking = false;
  let taken = false;

  return {
    group,
    interactableMesh: body,
    setBlinking(value) {
      blinking = value;
      blinkTime = 0;
      screenMaterial.color.setHex(0xffffff);
    },
    take() {
      taken = true;
      group.visible = false;
      body.visible = false;
      screen.visible = false;
    },
    update(delta) {
      if (!blinking || taken) return;
      blinkTime += delta;
      const phase = Math.floor(blinkTime / 0.18) % 4;
      screenMaterial.color.setHex(phase === 1 || phase === 3 ? 0x050505 : 0xffffff);
    },
  };
}
