import * as THREE from 'three';

/** Halo redondo y difuso (blanco: el color lo pone el material). */
function createGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.18, 'rgba(255, 255, 255, 0.55)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Material de halo de luz (faroles, faros, luces traseras): un sprite aditivo que con la
 * lluvia y la niebla da la sensación de luz difusa, y que el piso mojado refleja.
 */
export function createGlowMaterial(color, opacity = 0.8) {
  return new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color,
    opacity,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/** Agrega un halo de `size` metros en (x, y, z) dentro de `parent`. */
export function addGlow(parent, material, x, y, z, size) {
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.setScalar(size);
  sprite.renderOrder = 2; // después de los conos de luz de los faros
  parent.add(sprite);
  return sprite;
}
