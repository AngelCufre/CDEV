import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { room } from '../bedroom/roomLayout.js';
import { config } from '../../config.js';

/** Dónde cuelga el título: pared este, a la altura de los ojos, entre el escritorio y la puerta. */
export const diplomaSpot = { x: room.width / 2, y: 1.5, z: 0.55 };

const SHEET = { width: 0.56, height: 0.4 };
const MARGIN = 0.05; // pasepartout + marco

/** Sello rojo con una estrella, abajo a la derecha del diploma. */
function drawSeal(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#8c1d1d';
  ctx.beginPath();
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const radius = i % 2 === 0 ? 62 : 54;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 220, 200, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 225, 205, 0.75)';
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const radius = i % 2 === 0 ? 30 : 12;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Una firma garabateada sobre una línea. */
function drawSignature(ctx, x, y, width, seed) {
  ctx.strokeStyle = '#2a2f55';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 6);
  for (let i = 1; i <= 7; i += 1) {
    const px = x + 10 + (i * (width - 20)) / 7;
    const py = y - 8 - Math.sin(i * 2.1 + seed) * 16;
    ctx.quadraticCurveTo(px - 8, py - 14, px, py);
  }
  ctx.stroke();
}

/** Textura del diploma: pergamino con doble orla, texto centrado, firmas y sello. */
export function createDiplomaTexture(maxAnisotropy = 1) {
  const text = config.despertar.diploma;
  const canvas = document.createElement('canvas');
  canvas.width = 1120;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  // Papel: crema con manchas suaves y fibras.
  ctx.fillStyle = '#efe6cf';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 260; i += 1) {
    ctx.fillStyle = `rgba(150, 120, 70, ${Math.random() * 0.035})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      30 + Math.random() * 90,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Doble orla azul institucional con esquineros.
  ctx.strokeStyle = '#1f3a5f';
  ctx.lineWidth = 10;
  ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);
  ctx.fillStyle = '#1f3a5f';
  for (const [cx, cy] of [
    [54, 54],
    [canvas.width - 54, 54],
    [54, canvas.height - 54],
    [canvas.width - 54, canvas.height - 54],
  ]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-13, -13, 26, 26);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1f3a5f';
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(text.universidad, canvas.width / 2, 150);
  ctx.font = 'italic 32px Georgia, serif';
  ctx.fillStyle = '#4a5568';
  ctx.fillText(text.facultad, canvas.width / 2, 198);

  ctx.strokeStyle = '#a3823d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 170, 232);
  ctx.lineTo(canvas.width / 2 + 170, 232);
  ctx.stroke();

  ctx.fillStyle = '#4a5568';
  ctx.font = '28px Georgia, serif';
  ctx.fillText(text.otorga, canvas.width / 2, 292);

  ctx.fillStyle = '#7a1f1f';
  ctx.font = 'bold 66px Georgia, serif';
  const lines = text.titulo.split('\n');
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, 384 + index * 78);
  });

  ctx.fillStyle = '#4a5568';
  ctx.font = 'italic 30px Georgia, serif';
  ctx.fillText(text.a, canvas.width / 2, 384 + lines.length * 78 + 12);

  drawSignature(ctx, 140, 700, 270, 0.3);
  drawSignature(ctx, 560, 700, 270, 2.1);
  drawSeal(ctx, 985, 668);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * El título enmarcado, colgado en la pared este: hoja con la textura, pasepartout blanco y
 * marco de madera oscura. Devuelve también una caja invisible para apuntarle con la mira.
 */
export function buildDiploma(maxAnisotropy) {
  const group = new THREE.Group();
  group.name = 'diploma';

  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x2b1b10, roughness: 0.55 });
  const matMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.9 });
  const sheetMaterial = new THREE.MeshStandardMaterial({
    map: createDiplomaTexture(maxAnisotropy),
    roughness: 0.55,
  });

  const outerW = SHEET.width + MARGIN * 2;
  const outerH = SHEET.height + MARGIN * 2;
  const bar = 0.03;

  // Pasepartout (fondo) y hoja encima.
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(outerW, outerH), matMaterial);
  mat.position.z = 0.004;
  mat.receiveShadow = true;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(SHEET.width, SHEET.height), sheetMaterial);
  sheet.position.z = 0.008;
  sheet.receiveShadow = true;
  group.add(mat, sheet);

  // Marco: cuatro listones que sobresalen de la pared.
  const depth = 0.035;
  const frameBars = [
    [outerW + bar * 2, bar, 0, outerH / 2 + bar / 2],
    [outerW + bar * 2, bar, 0, -outerH / 2 - bar / 2],
    [bar, outerH, outerW / 2 + bar / 2, 0],
    [bar, outerH, -outerW / 2 - bar / 2, 0],
  ];
  for (const [w, h, x, y] of frameBars) {
    const piece = new THREE.Mesh(new RoundedBoxGeometry(w, h, depth, 2, 0.006), frameMaterial);
    piece.position.set(x, y, depth / 2);
    piece.castShadow = true;
    piece.receiveShadow = true;
    group.add(piece);
  }

  // Apoyado contra la pared este, mirando hacia adentro de la habitación.
  group.position.set(diplomaSpot.x - 0.002, diplomaSpot.y, diplomaSpot.z);
  group.rotation.y = -Math.PI / 2;

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(outerW + 0.1, outerH + 0.1, 0.1),
    new THREE.MeshBasicMaterial(),
  );
  hitbox.position.z = 0.05;
  hitbox.visible = false;
  group.add(hitbox);

  return { group, hitbox, width: outerW, height: outerH };
}
