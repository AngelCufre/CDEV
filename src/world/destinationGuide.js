import * as THREE from 'three';

/** Flecha amarilla animada y un aro en el piso para señalar un destino de la escena. */
export function createDestinationGuide({
  x,
  z,
  arrowY = 3.25,
  groundX = x,
  groundZ = z,
  scale = 1,
  name = 'destination-guide',
}) {
  const group = new THREE.Group();
  group.name = name;
  const material = new THREE.MeshBasicMaterial({
    color: 0xffd45c,
    fog: false,
    toneMapped: false,
  });

  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.45, 12), material);
  shaft.position.y = 0.3;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.38, 4), material);
  tip.rotation.z = Math.PI;
  tip.position.y = -0.1;
  arrow.add(shaft, tip);
  arrow.scale.setScalar(scale);
  arrow.position.set(x, arrowY, z);
  group.add(arrow);

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.74, 48), material);
  ring.rotation.x = -Math.PI / 2;
  ring.scale.setScalar(scale);
  ring.position.set(groundX, 0.025, groundZ);
  group.add(ring);

  let elapsed = 0;
  return {
    group,
    update(delta, visible) {
      group.visible = visible;
      if (!visible) return;
      elapsed += delta;
      arrow.position.y = arrowY + Math.sin(elapsed * 3) * 0.12;
    },
  };
}
