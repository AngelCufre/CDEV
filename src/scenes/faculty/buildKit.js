import * as THREE from 'three';
import { paint, box } from '../../world/lowPoly.js';

/**
 * Herramientas compartidas por los constructores de la escena de la facultad: el contexto
 * donde cada uno deja sus piezas, colisiones y cajas de interacción, y un "marco de
 * fachada" para dibujar sobre una cara de un edificio sin pensar en ejes del mundo.
 */

/**
 * - `parts`: piezas pintadas de afuera (se fusionan en un mesh con niebla).
 * - `interior`: piezas del 1° piso por dentro (otro mesh, sin niebla: el pasillo es largo
 *   y la niebla de afuera lo agrisaría).
 * - `glass`: paños de vidrio transparente (con sus UV: las gotas se ven una vez por paño).
 * - `obstacles[floor]`: cajas de colisión de la planta baja (0) y el 1° piso (1).
 * - `floorGeos`: pisos de mosaico de adentro (con UV en metros), un solo mesh al final.
 * - `hitboxes`: cajas invisibles de lo que se puede usar con E, por nombre.
 */
export function createBuildContext(group) {
  return {
    group,
    parts: [],
    interior: [],
    glass: [],
    obstacles: [[], []],
    floorGeos: [],
    hitboxes: {},
    /** Caja invisible para apuntarle con la mira a algo interactuable. */
    hitbox(w, h, d, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
      mesh.position.set(x, y, z);
      mesh.visible = false;
      group.add(mesh);
      return mesh;
    },
    /** Bloquea un rectángulo del plano XZ en un nivel. */
    block(floor, minX, minZ, maxX, maxZ) {
      this.obstacles[floor].push(obstacle(minX, minZ, maxX, maxZ));
    },
  };
}

/**
 * Lo armado en un contexto aparte, en un marco local, pasa al contexto principal girado
 * `angle` (múltiplo de 90°) alrededor del eje Y y llevado a (x, z): las geometrías se
 * transforman, las cajas de colisión siguen alineadas a los ejes, y el grupo (carteles,
 * cajas de interacción) se gira entero.
 */
export function mergeTransformed(ctx, sub, { angle, x, z }) {
  const c = Math.round(Math.cos(angle));
  const s = Math.round(Math.sin(angle));
  const move = (geo) => {
    geo.rotateY(angle);
    geo.translate(x, 0, z);
    return geo;
  };
  for (const key of ['parts', 'interior', 'glass', 'floorGeos'])
    ctx[key].push(...sub[key].map(move));
  sub.obstacles.forEach((boxes, floor) => {
    for (const b of boxes) {
      const ax = b.min.x * c + b.min.z * s + x;
      const az = -b.min.x * s + b.min.z * c + z;
      const bx = b.max.x * c + b.max.z * s + x;
      const bz = -b.max.x * s + b.max.z * c + z;
      ctx.block(floor, Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz));
    }
  });
  sub.group.rotation.y = angle;
  sub.group.position.set(x, 0, z);
  ctx.group.add(sub.group);
  Object.assign(ctx.hitboxes, sub.hitboxes);
}

/** Caja de colisión en el plano XZ (Collision ignora la altura). */
export function obstacle(minX, minZ, maxX, maxZ) {
  return new THREE.Box3(new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(maxX, 2.3, maxZ));
}

const FACING_YAW = { 'z+': 0, 'x+': Math.PI / 2, 'z-': Math.PI, 'x-': -Math.PI / 2 };

/**
 * Marco local de una fachada que mira hacia `facing` ('x+', 'x-', 'z+' o 'z-') y está en
 * la coordenada `at` de su eje: `u` corre a lo largo de la fachada (mirándola de frente,
 * crece hacia la derecha), `v` es la altura y `w` la distancia hacia afuera.
 */
export function facade(facing, at) {
  const yaw = FACING_YAW[facing];
  return {
    facing,
    yaw,
    at,
    ux: Math.round(Math.cos(yaw)),
    uz: Math.round(-Math.sin(yaw)),
    wx: Math.round(Math.sin(yaw)),
    wz: Math.round(Math.cos(yaw)),
  };
}

/** Posición de mundo (x, z) del punto (u, w) de una fachada. */
export function facadePoint(f, u, w) {
  return [(f.wx ? f.at : 0) + u * f.ux + w * f.wx, (f.wz ? f.at : 0) + u * f.uz + w * f.wz];
}

/** Caja sobre una fachada: centro (u, v, w) y medidas (du a lo largo, dv alto, dw saliente). */
export function fBox(list, f, u, v, w, du, dv, dw, color, options) {
  const [x, z] = facadePoint(f, u, w);
  const [sx, sz] = f.ux ? [du, dw] : [dw, du];
  list.push(paint(box(sx, dv, sz, x, v, z), color, options));
}

/** Plano sobre una fachada, mirando hacia afuera. */
export function fPlane(list, f, u, v, w, du, dv, color, options) {
  list.push(paint(fGeometry(f, new THREE.PlaneGeometry(du, dv), u, v, w), color, options));
}

/** Lleva una geometría armada mirando a +z (centrada en el origen) a (u, v, w) de la fachada. */
export function fGeometry(f, geometry, u, v, w) {
  const [x, z] = facadePoint(f, u, w);
  geometry.rotateY(f.yaw);
  geometry.translate(x, v, z);
  return geometry;
}

/**
 * Paño de vidrio sin pintar, mirando hacia afuera de la fachada. Conserva sus UV: la
 * textura de gotas se ve una vez por paño.
 */
export function fGlass(ctx, f, u, v, w, du, dv) {
  ctx.glass.push(fGeometry(f, new THREE.PlaneGeometry(du, dv), u, v, w));
}
