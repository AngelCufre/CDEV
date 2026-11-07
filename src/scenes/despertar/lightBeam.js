import * as THREE from 'three';
import { room } from '../bedroom/roomLayout.js';
import { config } from '../../config.js';
import { diplomaSpot } from './diploma.js';

/**
 * El haz de sol que entra por la rendija de las cortinas y llega hasta el título:
 * - un SpotLight con sombras y un mapa de proyección rectangular (la única luz fuerte de la
 *   escena: ilumina de verdad la pared y el diploma, y los muebles le hacen sombra);
 * - un volumen aditivo que se desvanece en los bordes (el polvo en suspensión lo hace visible);
 * - motas de polvo que flotan dentro del volumen.
 */

const SOURCE = new THREE.Vector3(room.window.centerX, 1.5, -room.depth / 2 + 0.1);
const TARGET = new THREE.Vector3(diplomaSpot.x, diplomaSpot.y, diplomaSpot.z);
const LENGTH = SOURCE.distanceTo(TARGET);

// Sección del haz (perpendicular a su dirección): sale de la rendija y se abre apenas.
const START = { w: config.despertar.luz.anchoRendija, h: room.window.headerY - room.window.sillY };
const END = { w: START.w * 1.25, h: START.h * 1.05 };

/** Mapa del proyector: rectángulo blanco de bordes suaves sobre negro. */
function createProjectorMap(coneHalfSize) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const w = (END.w / (coneHalfSize * 2)) * size;
  const h = (END.h / (coneHalfSize * 2)) * size;
  ctx.filter = 'blur(7px)';
  ctx.fillStyle = '#fff';
  ctx.fillRect((size - w) / 2, (size - h) / 2, w, h);
  ctx.filter = 'none';
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Tronco de pirámide abierto en los extremos, eje +Z local, con `aT` = 0..1 a lo largo. */
function frustumGeometry(scale) {
  const w0 = (START.w * scale) / 2;
  const h0 = (START.h * scale) / 2;
  const w1 = (END.w * scale) / 2;
  const h1 = (END.h * scale) / 2;
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const positions = [];
  const along = [];
  for (let i = 0; i < 4; i += 1) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[(i + 1) % 4];
    const a0 = [ax * w0, ay * h0, 0];
    const b0 = [bx * w0, by * h0, 0];
    const a1 = [ax * w1, ay * h1, LENGTH];
    const b1 = [bx * w1, by * h1, LENGTH];
    for (const [vertex, t] of [
      [a0, 0],
      [b0, 0],
      [a1, 1],
      [b0, 0],
      [b1, 1],
      [a1, 1],
    ]) {
      positions.push(...vertex);
      along.push(t);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aT', new THREE.Float32BufferAttribute(along, 1));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Material del volumen: la opacidad cae hacia los bordes visibles (las caras de costado
 * se ven poco) y a lo largo del haz, así no se notan las aristas de la pirámide.
 */
function createShaftMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vT;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vT = aT;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vT;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(vView)));
        float edge = pow(facing, 2.4);
        float fade = smoothstep(0.0, 0.08, vT) * (1.0 - 0.55 * vT);
        gl_FragColor = vec4(uColor * edge * fade * uOpacity, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Punto suave para las motas de polvo. */
function createMoteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

export function buildLightBeam({ shadowMapSize = config.luces.shadowMapSize } = {}) {
  const { luz } = config.despertar;
  const group = new THREE.Group();
  group.name = 'light-beam';

  // --- Luz real ---
  const angle = 0.2;
  const coneHalfSize = LENGTH * Math.tan(angle);
  const spot = new THREE.SpotLight(luz.color, 0, 0, angle, 0, 2);
  spot.position.copy(SOURCE);
  spot.target.position.copy(TARGET);
  spot.map = createProjectorMap(coneHalfSize);
  spot.castShadow = true;
  spot.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  spot.shadow.camera.near = 0.3;
  spot.shadow.camera.far = LENGTH + 2;
  spot.shadow.bias = -0.0008;
  group.add(spot, spot.target);

  // Rebote tenue sobre la pared iluminada: sin él, el resto del cuarto queda en negro puro.
  const bounce = new THREE.PointLight(luz.color, 0, 5.5, 2);
  bounce.position.set(TARGET.x - 0.7, TARGET.y - 0.1, TARGET.z - 0.3);
  group.add(bounce);

  // --- Volumen visible ---
  const shaft = new THREE.Group();
  shaft.position.copy(SOURCE);
  shaft.lookAt(TARGET);
  const layers = [
    { scale: 1.0, weight: 0.45 },
    { scale: 0.62, weight: 0.35 },
  ].map(({ scale, weight }) => {
    const material = createShaftMaterial(luz.color);
    const mesh = new THREE.Mesh(frustumGeometry(scale), material);
    mesh.renderOrder = 2;
    shaft.add(mesh);
    return { material, weight };
  });

  // --- Polvo ---
  const count = 140;
  const motes = [];
  const moteGeometry = new THREE.BufferGeometry();
  const moteArray = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    motes.push({
      t: Math.random(),
      u: Math.random() * 2 - 1,
      v: Math.random() * 2 - 1,
      speed: 0.01 + Math.random() * 0.025,
      phase: Math.random() * Math.PI * 2,
    });
  }
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(moteArray, 3));
  const moteMaterial = new THREE.PointsMaterial({
    map: createMoteTexture(),
    color: 0xfff0cc,
    size: 0.018,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(moteGeometry, moteMaterial);
  dust.frustumCulled = false;
  shaft.add(dust);
  group.add(shaft);

  let elapsed = 0;
  function updateMotes(delta) {
    elapsed += delta;
    for (let i = 0; i < count; i += 1) {
      const mote = motes[i];
      mote.t += mote.speed * delta;
      if (mote.t > 1) mote.t -= 1;
      const w = START.w + (END.w - START.w) * mote.t;
      const h = START.h + (END.h - START.h) * mote.t;
      moteArray[i * 3] = (mote.u * w) / 2 + Math.sin(elapsed * 0.6 + mote.phase) * 0.03;
      moteArray[i * 3 + 1] = (mote.v * h) / 2 + Math.cos(elapsed * 0.45 + mote.phase) * 0.04;
      moteArray[i * 3 + 2] = mote.t * LENGTH;
    }
    moteGeometry.attributes.position.needsUpdate = true;
  }

  return {
    group,
    spot,
    /** `amount` de 0 (apagado) a 1 (pleno): el sol saliendo de entre las nubes. */
    setStrength(amount) {
      spot.intensity = luz.intensidad * amount;
      bounce.intensity = 2.2 * amount;
      for (const { material, weight } of layers)
        material.uniforms.uOpacity.value = 0.5 * weight * amount;
      moteMaterial.opacity = 0.7 * amount;
    },
    update: updateMotes,
  };
}
