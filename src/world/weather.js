import * as THREE from 'three';
import { config } from '../config.js';
import { createOvercastSkyTexture } from '../utils/textures.js';

/** Cielo nublado en una esfera vista desde adentro. No lleva niebla: ya trae el degradé. */
export function buildSky(radius) {
  const geo = new THREE.SphereGeometry(radius, 32, 16);
  const material = new THREE.MeshBasicMaterial({
    map: createOvercastSkyTexture(),
    side: THREE.BackSide,
    fog: false,
  });
  const sky = new THREE.Mesh(geo, material);
  sky.name = 'sky';
  return sky;
}

/**
 * Lluvia como LineSegments: cada gota es un segmento corto e inclinado por el viento.
 * Las posiciones se actualizan en CPU sobre un único buffer (1 draw call).
 *
 * - `area`: caja donde caen las gotas ({ minX, maxX, minY, maxY, minZ, maxZ }).
 * - `zBias` > 1 concentra más gotas hacia `maxZ` (por ejemplo, cerca de una ventana).
 * - Si `update` recibe un `center`, el área se toma relativa a ese punto en X/Z: sirve
 *   para que la lluvia acompañe al jugador en exteriores sin cubrir todo el mapa.
 */
export function buildRain({ count = config.exterior.lluvia.cantidadGotas, area, zBias = 1 }) {
  const { velocidad, largoGota, viento } = config.exterior.lluvia;
  const tailDx = (-viento / velocidad) * largoGota;

  const drops = new Float32Array(count * 4); // x, y, z, factor de velocidad
  const positions = new Float32Array(count * 6);
  let centerX = 0;
  let centerZ = 0;

  const spawn = (i, anyHeight) => {
    drops[i * 4] = centerX + area.minX + Math.random() * (area.maxX - area.minX);
    drops[i * 4 + 1] = anyHeight ? area.minY + Math.random() * (area.maxY - area.minY) : area.maxY;
    drops[i * 4 + 2] = centerZ + area.maxZ - Math.random() ** zBias * (area.maxZ - area.minZ);
    drops[i * 4 + 3] = 0.85 + Math.random() * 0.3;
  };
  for (let i = 0; i < count; i += 1) spawn(i, true);

  const geo = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', positionAttr);

  const material = new THREE.LineBasicMaterial({
    color: 0xc3ced8,
    transparent: true,
    opacity: 0.45,
  });
  const rain = new THREE.LineSegments(geo, material);
  rain.name = 'rain';
  // Las gotas se mueven fuera de cualquier bounding sphere fijo.
  rain.frustumCulled = false;
  // Se dibuja antes que otros transparentes (como el vidrio de la ventana): el orden por
  // distancia usa el origen del objeto, que no representa dónde están las gotas.
  rain.renderOrder = -1;

  function update(delta, center) {
    const following = center !== undefined;
    if (following) {
      centerX = center.x;
      centerZ = center.z;
    }
    for (let i = 0; i < count; i += 1) {
      const d = i * 4;
      drops[d] += viento * delta;
      drops[d + 1] -= velocidad * drops[d + 3] * delta;
      if (drops[d + 1] < area.minY) {
        spawn(i, false);
      } else if (following) {
        // El jugador se movió: las gotas que quedaron fuera del área reaparecen dentro.
        const rx = drops[d] - centerX;
        const rz = drops[d + 2] - centerZ;
        if (rx < area.minX || rx > area.maxX || rz < area.minZ || rz > area.maxZ) spawn(i, true);
      }

      const p = i * 6;
      positions[p] = drops[d];
      positions[p + 1] = drops[d + 1];
      positions[p + 2] = drops[d + 2];
      positions[p + 3] = drops[d] + tailDx;
      positions[p + 4] = drops[d + 1] + largoGota;
      positions[p + 5] = drops[d + 2];
    }
    positionAttr.needsUpdate = true;
  }
  update(0);

  return { mesh: rain, update };
}
