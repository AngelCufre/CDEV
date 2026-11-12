import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { room } from '../bedroom/roomLayout.js';
import { config } from '../../config.js';

/** Dónde cuelga el título: pared este, a la altura de los ojos, entre el escritorio y la puerta. */
export const diplomaSpot = { x: room.width / 2, y: 1.5, z: 0.55 };

const SHEET = { width: 0.56, height: 0.4 };
const MARGIN = 0.05; // pasepartout + marco

/** Emblema ornamental simplificado de la República, inspirado en el diploma de referencia. */
function drawNationalEmblem(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#30343b';
  ctx.fillStyle = '#30343b';
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 31, Math.sin(angle) * 31);
    ctx.lineTo(Math.cos(angle) * 42, Math.sin(angle) * 42);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, 8, 27, 36, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(0, 27);
  ctx.moveTo(-13, 0);
  ctx.lineTo(13, 0);
  ctx.moveTo(-9, 23);
  ctx.quadraticCurveTo(0, 30, 9, 23);
  ctx.stroke();
  ctx.restore();
}

/** Isotipo geométrico de la UTN para el pie del diploma. */
function drawUtnMark(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#20242a';
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(0, -size / 2);
  ctx.lineTo(0, size / 2);
  ctx.moveTo(-size * 0.42, 0);
  ctx.lineTo(size * 0.42, 0);
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, side * size * 0.5);
    ctx.lineTo(-size * 0.42, side * size * 0.18);
    ctx.quadraticCurveTo(-size * 0.42, side * size * 0.08, -size * 0.2, side * size * 0.08);
    ctx.lineTo(size * 0.2, side * size * 0.08);
    ctx.quadraticCurveTo(size * 0.42, side * size * 0.08, size * 0.42, side * size * 0.18);
    ctx.lineTo(size * 0.42, side * size * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** Dibuja una línea centrada y reduce la tipografía si no entra en el ancho disponible. */
function drawFittedText(
  ctx,
  text,
  y,
  { size, maxWidth = 980, style = '', family = 'Georgia, serif' },
) {
  let fitted = size;
  const setFont = () => {
    ctx.font = `${style ? `${style} ` : ''}${fitted}px ${family}`;
  };
  setFont();
  const measured = ctx.measureText(text).width;
  if (measured > maxWidth) {
    fitted = Math.floor((fitted * maxWidth) / measured);
    setFont();
  }
  ctx.fillText(text, 560, y);
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

/** Textura del diploma, recreada a partir de la referencia con todos los datos ficticios. */
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

  // Filete sobrio, como el documento usado de referencia.
  ctx.strokeStyle = 'rgba(46, 49, 54, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
  ctx.lineWidth = 1;
  ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#292d33';
  drawNationalEmblem(ctx, 560, 76);
  drawFittedText(ctx, text.pais, 128, { size: 28, style: 'bold' });
  drawFittedText(ctx, text.universidad, 178, { size: 47, style: 'bold' });
  drawFittedText(ctx, text.facultad, 226, { size: 38, style: 'italic' });
  drawFittedText(ctx, text.autoridades, 271, { size: 27, style: 'italic' });

  ctx.textAlign = 'left';
  ctx.font = 'italic 25px Georgia, serif';
  ctx.fillText('Por cuanto:', 86, 322);
  ctx.textAlign = 'center';
  drawFittedText(ctx, `${text.nombre}   ·   ${text.documento}`, 322, {
    size: 31,
    style: 'bold italic',
    maxWidth: 820,
  });
  drawFittedText(
    ctx,
    `nacido el ${text.nacimiento} en ${text.lugarNacimiento}, ha cumplimentado`,
    366,
    { size: 25, style: 'italic' },
  );
  drawFittedText(ctx, 'los requisitos académicos correspondientes a la carrera', 405, {
    size: 25,
    style: 'italic',
  });
  drawFittedText(ctx, `${text.carrera}, el ${text.fechaEgreso}.`, 444, {
    size: 27,
    style: 'bold italic',
  });
  drawFittedText(ctx, text.fundamento, 490, { size: 25, style: 'italic' });
  drawFittedText(ctx, text.otorga, 530, { size: 27, style: 'italic' });

  ctx.fillStyle = '#601f24';
  const titleLines = text.titulo.split('\n');
  titleLines.forEach((line, index) => {
    drawFittedText(ctx, line, 578 + index * 42, { size: 37, style: 'bold', maxWidth: 900 });
  });

  ctx.fillStyle = '#292d33';
  drawFittedText(ctx, text.expedicion, 674, { size: 23, style: 'italic' });

  drawSignature(ctx, 100, 722, 250, 0.3);
  drawSignature(ctx, 770, 722, 250, 2.1);
  drawUtnMark(ctx, 560, 715, 68);
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText('DECANO', 225, 744);
  ctx.fillText('RECTOR', 895, 744);
  ctx.font = '14px Georgia, serif';
  ctx.fillText(text.registro, 560, 760);
  ctx.textAlign = 'right';
  ctx.fillText(text.numero, 1020, 776);
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = 'rgba(41, 45, 51, 0.72)';
  ctx.fillText(text.leyenda, 62, 776);

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
