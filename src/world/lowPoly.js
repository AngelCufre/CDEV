import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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
 * plano, para cosas que "emiten" luz (ventanas encendidas, faroles, faros). `keepUv`
 * conserva las UV, para piezas con textura (por ejemplo, una tela estampada).
 */
export function paint(geometry, hex, { shaded = true, keepUv = false } = {}) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  if (geo !== geometry) geometry.dispose();
  // Sin texturas: las UV no se usan, y así todas las piezas tienen los mismos atributos
  // para fusionarse (algunas, como las de `taperTop`, no las traen).
  if (geo.attributes.uv && !keepUv) geo.deleteAttribute('uv');

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

/**
 * Caja con los bordes redondeados (`radius` en metros; se achica si no entra). Los
 * biseles toman luz como en un objeto real: se usa en gente, muebles y vehículos, no en
 * paredes ni edificios. `segments` = pasos de cada curva (1 alcanza para piezas chicas).
 */
export function roundedBox(w, h, d, x, y, z, radius = 0.03, segments = 2) {
  const safeRadius = Math.min(radius, Math.min(w, h, d) * 0.45);
  const geo = new RoundedBoxGeometry(w, h, d, segments, safeRadius);
  geo.translate(x, y, z);
  return geo;
}

/**
 * Achica la parte de arriba de una caja redondeada (por encima de `fromY`) hacia su
 * centro en X/Z: queda un tronco de pirámide, como la cabina de un auto con el parabrisas
 * inclinado. Devuelve una geometría nueva con las normales recalculadas (suaves, para que
 * los biseles sigan redondeados y la pendiente reciba la luz que le corresponde).
 */
export function taperTop(geometry, fromY, scaleX, scaleZ) {
  const position = geometry.attributes.position;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const centerX = (min.x + max.x) / 2;
  const centerZ = (min.z + max.z) / 2;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    if (y <= fromY) continue;
    const t = (y - fromY) / (max.y - fromY);
    position.setX(i, centerX + (position.getX(i) - centerX) * (1 + (scaleX - 1) * t));
    position.setZ(i, centerZ + (position.getZ(i) - centerZ) * (1 + (scaleZ - 1) * t));
  }
  // Se unen los vértices repetidos (solo por posición) para promediar las normales.
  geometry.deleteAttribute('uv');
  geometry.deleteAttribute('normal');
  const smooth = mergeVertices(geometry);
  geometry.dispose();
  smooth.computeVertexNormals();
  return smooth;
}

/** Plano vertical mirando a +z (`facing = 1`) o a -z (`facing = -1`). */
export function facadePlane(w, h, x, y, z, facing = 1) {
  const geo = new THREE.PlaneGeometry(w, h);
  if (facing < 0) geo.rotateY(Math.PI);
  geo.translate(x, y, z);
  return geo;
}

/** Fusiona geometrías pintadas con `paint` en una sola (y libera las originales). */
export function mergePartsGeometry(parts) {
  const merged = mergeGeometries(parts);
  for (const geo of parts) geo.dispose();
  return merged;
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
  const mesh = new THREE.Mesh(mergePartsGeometry(parts), material);
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
