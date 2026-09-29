import * as THREE from 'three';
import { puddles as PUDDLES } from './layout.js';

const RIPPLE_COUNT = 18;
const DROPLET_COUNT = 48;
const GRAVITY = 9.8;
// Distancia caminada dentro de un charco entre una salpicadura y la siguiente (un paso).
const STEP_LENGTH = 0.6;
// Margen para detectar el charco desde el borde del pie, no solo desde el centro.
const FOOT_MARGIN = 0.15;

/**
 * Charcos en la vereda: anillos de lluvia que se abren sobre el agua y salpicadura
 * (sonido + gotas que saltan) al pisarlos caminando.
 */
/** Punto redondo con borde suave (los Points de WebGL son cuadrados por defecto). */
function createDropletTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

export function createPuddles({ audio, camera }) {
  const group = new THREE.Group();
  group.name = 'puddles';

  // Agua oscura que refleja un poco el cielo gris. polygonOffset evita z-fighting con
  // la vereda, que está apenas debajo.
  const puddleMaterial = new THREE.MeshBasicMaterial({
    color: 0x58626b,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const puddleGeometry = new THREE.CircleGeometry(1, 28);
  puddleGeometry.rotateX(-Math.PI / 2);
  for (const puddle of PUDDLES) {
    const mesh = new THREE.Mesh(puddleGeometry, puddleMaterial);
    mesh.scale.set(puddle.rx, 1, puddle.rz);
    mesh.position.set(puddle.x, 0.004, puddle.z);
    group.add(mesh);
  }

  // ---------- Anillos de las gotas que caen ----------
  const ringGeometry = new THREE.RingGeometry(0.8, 1, 20);
  ringGeometry.rotateX(-Math.PI / 2);
  const ripples = [];
  for (let i = 0; i < RIPPLE_COUNT + 1; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xb4c0ca,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeometry, material);
    mesh.position.y = 0.008;
    group.add(mesh);
    ripples.push({ mesh, age: Math.random(), life: 1, maxScale: 0.1 });
  }
  // El último anillo se reserva para la onda grande de una pisada.
  const stepRipple = ripples.pop();
  stepRipple.age = stepRipple.life;

  function spawnRainRipple(ripple) {
    const puddle = PUDDLES[Math.floor(Math.random() * PUDDLES.length)];
    const r = Math.sqrt(Math.random()) * 0.85;
    const angle = Math.random() * Math.PI * 2;
    ripple.mesh.position.x = puddle.x + Math.cos(angle) * r * puddle.rx;
    ripple.mesh.position.z = puddle.z + Math.sin(angle) * r * puddle.rz;
    ripple.age = 0;
    ripple.life = 0.45 + Math.random() * 0.35;
    ripple.maxScale = 0.05 + Math.random() * 0.07;
  }

  function updateRipple(ripple, delta, respawn) {
    ripple.age += delta;
    if (ripple.age >= ripple.life) {
      if (!respawn) {
        ripple.mesh.material.opacity = 0;
        return;
      }
      spawnRainRipple(ripple);
    }
    const t = ripple.age / ripple.life;
    const scale = 0.01 + ripple.maxScale * t;
    ripple.mesh.scale.set(scale, 1, scale);
    ripple.mesh.material.opacity = 0.55 * (1 - t);
  }

  // ---------- Gotas de la salpicadura ----------
  const dropletPositions = new Float32Array(DROPLET_COUNT * 3);
  const dropletVelocities = new Float32Array(DROPLET_COUNT * 3);
  const dropletGeometry = new THREE.BufferGeometry();
  const dropletAttr = new THREE.BufferAttribute(dropletPositions, 3);
  dropletAttr.setUsage(THREE.DynamicDrawUsage);
  dropletGeometry.setAttribute('position', dropletAttr);
  const dropletMaterial = new THREE.PointsMaterial({
    color: 0xcfd8e0,
    map: createDropletTexture(),
    size: 0.04,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const droplets = new THREE.Points(dropletGeometry, dropletMaterial);
  droplets.frustumCulled = false;
  group.add(droplets);
  let splashAge = Infinity;
  const SPLASH_LIFE = 0.7;

  const forward = new THREE.Vector3();

  function splash(x, z) {
    audio.playSplash();

    // Un poco adelante del jugador, para que se vea al mirar hacia abajo.
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const cx = x + forward.x * 0.35;
    const cz = z + forward.z * 0.35;

    for (let i = 0; i < DROPLET_COUNT; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const horizontal = 0.4 + Math.random() * 1.1;
      dropletPositions[i * 3] = cx + (Math.random() - 0.5) * 0.15;
      dropletPositions[i * 3 + 1] = 0.02;
      dropletPositions[i * 3 + 2] = cz + (Math.random() - 0.5) * 0.15;
      dropletVelocities[i * 3] = Math.cos(angle) * horizontal;
      dropletVelocities[i * 3 + 1] = 1.2 + Math.random() * 1.8;
      dropletVelocities[i * 3 + 2] = Math.sin(angle) * horizontal;
    }
    dropletAttr.needsUpdate = true;
    splashAge = 0;

    stepRipple.mesh.position.x = cx;
    stepRipple.mesh.position.z = cz;
    stepRipple.age = 0;
    stepRipple.life = 0.8;
    stepRipple.maxScale = 0.55;
  }

  function updateDroplets(delta) {
    if (splashAge >= SPLASH_LIFE) return;
    splashAge += delta;
    for (let i = 0; i < DROPLET_COUNT; i += 1) {
      const p = i * 3;
      dropletVelocities[p + 1] -= GRAVITY * delta;
      dropletPositions[p] += dropletVelocities[p] * delta;
      dropletPositions[p + 1] = Math.max(
        0.01,
        dropletPositions[p + 1] + dropletVelocities[p + 1] * delta,
      );
      dropletPositions[p + 2] += dropletVelocities[p + 2] * delta;
    }
    dropletAttr.needsUpdate = true;
    dropletMaterial.opacity = 0.9 * Math.max(0, 1 - splashAge / SPLASH_LIFE);
  }

  function puddleAt(x, z) {
    for (const puddle of PUDDLES) {
      const dx = (x - puddle.x) / (puddle.rx + FOOT_MARGIN);
      const dz = (z - puddle.z) / (puddle.rz + FOOT_MARGIN);
      if (dx * dx + dz * dz <= 1) return puddle;
    }
    return null;
  }

  let wasInside = false;
  let walkedInside = 0;

  /**
   * `moved` es la distancia que caminó el jugador en este frame: salpica al entrar a
   * un charco caminando y después a cada paso mientras siga adentro.
   */
  function update(delta, moved) {
    for (const ripple of ripples) updateRipple(ripple, delta, true);
    updateRipple(stepRipple, delta, false);
    updateDroplets(delta);

    const { x, z } = camera.position;
    const inside = puddleAt(x, z) !== null;
    if (inside && moved > 0) {
      walkedInside += moved;
      if (!wasInside || walkedInside >= STEP_LENGTH) {
        walkedInside = 0;
        splash(x, z);
      }
    }
    if (!inside) walkedInside = 0;
    wasInside = inside;
  }

  return { group, update };
}
