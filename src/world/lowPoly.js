import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Utilidades para exteriores low-poly con sombreado "horneado" en vertex colors.
 *
 * Los exteriores usan MeshBasicMaterial en vez de luces reales: con cielo cubierto la
 * luz es plana y difusa, así que un sombreado fijo por cara se ve bien, cuesta casi
 * nada y permite fusionar todo lo estático en un único mesh (1 draw call).
 */

const SKY_LIGHT_DIR = new THREE.Vector3(0.4, 1, 0.6).normalize();
const _color = new THREE.Color();
const _normal = new THREE.Vector3();

/**
 * Convierte la geometría a no indexada (requisito para fusionar tipos mezclados) y le
 * agrega vertex colors con luz difusa de cielo nublado. `shaded: false` deja el color
 * plano, para cosas que "emiten" luz (ventanas encendidas, faroles, faros).
 */
export function paint(geometry, hex, { shaded = true } = {}) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  if (geo !== geometry) geometry.dispose();

  const normals = geo.attributes.normal;
  const colors = new Float32Array(normals.count * 3);
  _color.set(hex);
  for (let i = 0; i < normals.count; i += 1) {
    _normal.fromBufferAttribute(normals, i);
    const shade = shaded ? 0.62 + 0.38 * Math.max(0, _normal.dot(SKY_LIGHT_DIR)) : 1;
    colors[i * 3] = _color.r * shade;
    colors[i * 3 + 1] = _color.g * shade;
    colors[i * 3 + 2] = _color.b * shade;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function box(w, h, d, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  return geo;
}

/** Plano vertical mirando a +z (`facing = 1`) o a -z (`facing = -1`). */
export function facadePlane(w, h, x, y, z, facing = 1) {
  const geo = new THREE.PlaneGeometry(w, h);
  if (facing < 0) geo.rotateY(Math.PI);
  geo.translate(x, y, z);
  return geo;
}

/**
 * Fusiona geometrías pintadas con `paint` en un único mesh sin iluminación.
 * `material` permite compartir uno entre varios meshes (por ejemplo, los autos).
 */
export function mergeParts(
  parts,
  name,
  material = new THREE.MeshBasicMaterial({ vertexColors: true }),
) {
  const merged = mergeGeometries(parts);
  for (const geo of parts) geo.dispose();
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  return mesh;
}

/** Generador pseudoaleatorio con semilla: el mismo paisaje en cada recarga. */
export function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}
