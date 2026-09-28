import * as THREE from 'three';

/**
 * Pila de libros en el piso: ejemplo de objeto repetido implementado con
 * InstancedMesh (un solo draw call para todos los libros) en vez de un mesh por libro.
 */
export function buildBookPile(x, z) {
  const geometry = new THREE.BoxGeometry(0.17, 0.032, 0.23);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const colors = [0x7a2e2e, 0x2e4d7a, 0x3d6b35, 0x8a6d1f, 0x5c3d7a, 0x394046];
  const count = colors.length;

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

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
