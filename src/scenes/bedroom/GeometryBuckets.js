import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Bisel por defecto de las cajas (m): ningún mueble real tiene aristas perfectas, y el
// borde redondeado agarra la luz de la ventana.
const DEFAULT_BEVEL = 0.012;

/**
 * Acumula geometría estática agrupada por clave de material ("wallKey" del
 * objeto `materials`). Al terminar de construir todos los props se fusiona
 * cada bucket en un único mesh: así, sin importar cuántos objetos distintos
 * comparten un material, el costo en draw calls es de un mesh por material.
 */
export class GeometryBuckets {
  constructor() {
    this._buckets = new Map();
  }

  /**
   * Agrega una caja con los bordes redondeados (posición + rotación Y opcional) al bucket
   * del material dado. `radius` agranda el redondeo (almohadas, colchón).
   */
  addBox(
    materialKey,
    width,
    height,
    depth,
    x,
    y,
    z,
    rotationY = 0,
    { radius = DEFAULT_BEVEL } = {},
  ) {
    const safeRadius = Math.min(radius, Math.min(width, height, depth) * 0.45);
    const geo = new RoundedBoxGeometry(width, height, depth, 2, safeRadius);
    this._transformAndPush(materialKey, geo, x, y, z, rotationY);
  }

  addCylinder(
    materialKey,
    radiusTop,
    radiusBottom,
    height,
    radialSegments,
    x,
    y,
    z,
    rotationY = 0,
  ) {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
    this._transformAndPush(materialKey, geo, x, y, z, rotationY);
  }

  addIcosahedron(materialKey, radius, detail, x, y, z, scale = { x: 1, y: 1, z: 1 }) {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    geo.scale(scale.x, scale.y, scale.z);
    this._transformAndPush(materialKey, geo, x, y, z, 0);
  }

  _transformAndPush(materialKey, geo, x, y, z, rotationY) {
    // mergeGeometries exige que todas las geometrías de un mismo merge estén
    // indexadas o ninguna lo esté. BoxGeometry/CylinderGeometry generan índice
    // pero IcosahedronGeometry no, así que normalizamos todo a no-indexado.
    if (geo.index) geo = geo.toNonIndexed();
    if (rotationY) geo.rotateY(rotationY);
    geo.translate(x, y, z);
    if (!this._buckets.has(materialKey)) this._buckets.set(materialKey, []);
    this._buckets.get(materialKey).push(geo);
  }

  /** Fusiona todos los buckets y devuelve un array de THREE.Mesh listos para agregar a la escena. */
  buildMeshes(materials, { castShadow = false, receiveShadow = true } = {}) {
    const meshes = [];
    for (const [materialKey, geometries] of this._buckets) {
      const merged = mergeGeometries(geometries);
      const material = materials[materialKey];
      if (!material) {
        throw new Error(`Material desconocido en GeometryBuckets: "${materialKey}"`);
      }
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      meshes.push(mesh);
      for (const geo of geometries) geo.dispose();
    }
    this._buckets.clear();
    return meshes;
  }
}
