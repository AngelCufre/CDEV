import * as THREE from 'three';

/**
 * Texturas procedurales generadas una sola vez con CanvasTexture (tamaños potencia de 2).
 * Evitamos depender de imágenes externas: todo se dibuja con Canvas2D en memoria.
 */

function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function finalize(canvas, repeat = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Pared con leve variación de tono (revoque), tono cálido neutro. */
export function createWallTexture() {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cfc3ad';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i += 1) {
    const shade = 190 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 25}, 0.05)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  return finalize(canvas, 2);
}

/** Piso de madera con tablones. */
export function createFloorTexture() {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const plankHeight = size / 8;
  for (let i = 0; i < 8; i += 1) {
    const base = 110 + ((i * 13) % 40);
    ctx.fillStyle = `rgb(${base + 30}, ${base}, ${base - 30})`;
    ctx.fillRect(0, i * plankHeight, size, plankHeight - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, i * plankHeight + plankHeight - 2, size, 2);
  }
  // veta sutil
  for (let i = 0; i < 200; i += 1) {
    ctx.strokeStyle = 'rgba(60,40,20,0.08)';
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() * 4 - 2));
    ctx.stroke();
  }
  return finalize(canvas, 4);
}

/** Madera clara para muebles (escritorio, mesa de luz). */
export function createWoodTexture(colorBase = '#8a5a34') {
  const size = 128;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorBase;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i += 1) {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + 8, size * 0.7, y - 8, size, y);
    ctx.stroke();
  }
  return finalize(canvas, 1);
}

/** Tela arrugada (ropa, sábanas). */
export function createFabricTexture(colorBase = '#3d5a80') {
  const size = 128;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorBase;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 500; i += 1) {
    const shade = Math.random() * 0.15 - 0.075;
    ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${-shade})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }
  return finalize(canvas, 1);
}

/** Pantalla de despertador digital: fondo oscuro + dígitos en LED rojo/verde. */
export function createClockScreenTexture(timeText = '07:52') {
  const canvas = makeCanvas(128);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a0e0a';
  ctx.fillRect(0, 0, 128, 128);
  ctx.font = 'bold 42px monospace';
  ctx.fillStyle = '#ff3b30';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff3b30';
  ctx.shadowBlur = 12;
  ctx.fillText(timeText, 64, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Pantalla de celular: bloqueado con notificaciones apiladas. */
export function createPhoneScreenTexture(notifications = []) {
  const canvas = makeCanvas(128);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('07:52', 64, 20);

  ctx.textAlign = 'left';
  ctx.font = '7px sans-serif';
  notifications.slice(0, 4).forEach((text, index) => {
    const y = 36 + index * 22;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(8, y, 112, 18);
    ctx.fillStyle = '#fff';
    ctx.fillText(text.slice(0, 26), 12, y + 11);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
