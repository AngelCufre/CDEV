import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { furniture } from '../roomLayout.js';

/**
 * Pila de libros en el piso: ejemplo de objeto repetido implementado con
 * InstancedMesh (un solo draw call para todos los libros) en vez de un mesh por libro.
 */
export function buildBookPile(x, z) {
  const geometry = new RoundedBoxGeometry(0.17, 0.032, 0.23, 2, 0.006);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const colors = [0x7a2e2e, 0x2e4d7a, 0x3d6b35, 0x8a6d1f, 0x5c3d7a, 0x394046];
  const count = colors.length;

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const dummy = new THREE.Object3D();
  let y = 0.017;
  for (let i = 0; i < count; i += 1) {
    const jitterX = (Math.random() - 0.5) * 0.05;
    const jitterZ = (Math.random() - 0.5) * 0.05;
    dummy.position.set(x + jitterX, y, z + jitterZ);
    dummy.rotation.y = (Math.random() - 0.5) * 0.5 + (i % 2) * 0.3;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, new THREE.Color(colors[i]));
    y += 0.035;
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  return { mesh };
}

/** Caja redondeada inclinada `lean` radianes alrededor de Z (apoyada contra algo) en (x, y, z). */
function leaningBox(width, height, depth, radius, lean, x, y, z) {
  const geo = new RoundedBoxGeometry(width, height, depth, 2, radius);
  geo.rotateZ(lean);
  geo.translate(x, y, z);
  return geo;
}

/**
 * Desorden del piso: zapatillas junto a la cama, la mochila apoyada contra la pata del
 * escritorio, una remera tirada y papeles arrugados. Todo estático, en `buckets`.
 */
export function buildFloorClutter(buckets, obstacles) {
  const { bed, desk } = furniture;

  // Zapatillas a los pies de la cama, del lado libre, una más torcida que la otra.
  const shoesZ = bed.center.z + bed.length / 2 + 0.3;
  for (const [x, z, yaw] of [
    [bed.center.x + bed.width / 2 + 0.25, shoesZ, 0.45],
    [bed.center.x + bed.width / 2 + 0.52, shoesZ + 0.08, -0.25],
  ]) {
    buckets.addBox('darkMatte', 0.28, 0.03, 0.11, x, 0.015, z, yaw, { radius: 0.012 });
    buckets.addBox('pillow', 0.26, 0.085, 0.1, x, 0.07, z, yaw, { radius: 0.035, segments: 3 });
    buckets.addBox(
      'darkMatte',
      0.09,
      0.03,
      0.08,
      x + Math.cos(yaw) * 0.1,
      0.09,
      z - Math.sin(yaw) * 0.1,
      yaw,
      {
        radius: 0.012,
      },
    ); // lengüeta
  }

  // Mochila apoyada contra la pata delantera izquierda del escritorio, un poco inclinada.
  const lean = -0.25;
  const packX = desk.center.x - desk.width / 2 - 0.12;
  const packZ = desk.center.z + desk.depth / 2 - 0.05;
  buckets.addGeometry('backpack', leaningBox(0.16, 0.42, 0.3, 0.05, lean, packX, 0.215, packZ));
  buckets.addGeometry(
    'backpack',
    leaningBox(0.17, 0.12, 0.31, 0.03, lean, packX + 0.045, 0.39, packZ),
  ); // tapa
  for (const dz of [-0.08, 0.08]) {
    buckets.addGeometry(
      'darkMatte',
      leaningBox(0.02, 0.3, 0.03, 0.006, lean, packX - 0.09, 0.22, packZ + dz),
    ); // correas
  }
  obstacles.push(
    new THREE.Box3(
      new THREE.Vector3(packX - 0.15, 0, packZ - 0.2),
      new THREE.Vector3(packX + 0.12, 0.5, packZ + 0.2),
    ),
  );

  // Remera tirada en el piso (bulto achatado con una manga) y papeles arrugados.
  buckets.addIcosahedron('fabricClothes', 0.16, 3, 0.35, 0.03, 0.85, { x: 1.5, y: 0.22, z: 1.1 });
  buckets.addBox('fabricClothes', 0.1, 0.03, 0.28, 0.6, 0.015, 0.98, 0.5, { radius: 0.012 });
  buckets.addIcosahedron('pillow', 0.04, 1, 1.05, 0.04, -0.85);
  buckets.addIcosahedron('pillow', 0.035, 1, 2.1, 0.035, -0.6);
}
