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

/**
 * Cielo nublado para mapear en una esfera (BackSide): degradé gris de cenit a horizonte
 * con nubes achatadas superpuestas. La fila superior del canvas es el cenit y la del medio
 * el horizonte (convención de UV de SphereGeometry).
 */
export function createOvercastSkyTexture({ cenit = '#4b535c', horizonte = '#8e979f' } = {}) {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, height / 2);
  gradient.addColorStop(0, cenit);
  gradient.addColorStop(1, horizonte);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height / 2);
  ctx.fillStyle = horizonte;
  ctx.fillRect(0, height / 2, width, height / 2);

  // Nubes: manchas radiales achatadas, más densas y chicas cerca del horizonte
  // (perspectiva). Se dibujan también desplazadas un ancho para que el seam no se note.
  for (let i = 0; i < 160; i += 1) {
    const y = 20 + Math.random() ** 0.6 * (height / 2 - 30);
    const cercaniaHorizonte = y / (height / 2);
    const radio = 150 - cercaniaHorizonte * 100 + Math.random() * 60;
    const shade = 80 + Math.floor(Math.random() * 90);
    const x = Math.random() * width;
    for (const offset of [-width, 0, width]) {
      ctx.save();
      ctx.translate(x + offset, y);
      ctx.scale(1, 0.35);
      const blob = ctx.createRadialGradient(0, 0, 0, 0, 0, radio);
      blob.addColorStop(0, `rgba(${shade}, ${shade + 6}, ${shade + 12}, 0.35)`);
      blob.addColorStop(1, `rgba(${shade}, ${shade + 6}, ${shade + 12}, 0)`);
      ctx.fillStyle = blob;
      ctx.beginPath();
      ctx.arc(0, 0, radio, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Pasto mojado: verde oscuro apagado con variación de tono. */
export function createWetGrassTexture() {
  const size = 128;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a5a3e';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1200; i += 1) {
    const shade = Math.random() * 0.2 - 0.1;
    ctx.fillStyle = shade > 0 ? `rgba(200,220,180,${shade})` : `rgba(10,20,5,${-shade})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 3);
  }
  return finalize(canvas, 30);
}

/**
 * Gotas y chorreaduras sobre el vidrio. El canal alfa define cuánto se ve el vidrio:
 * base casi transparente y gotas más opacas, para usar como map de un material transparente.
 */
export function createRainOnGlassTexture() {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(190, 210, 225, 0.12)';
  ctx.fillRect(0, 0, width, height);

  // Chorreaduras: líneas verticales con leve zigzag que terminan en una gota.
  for (let i = 0; i < 18; i += 1) {
    let x = Math.random() * width;
    const yStart = Math.random() * height * 0.6;
    const yEnd = yStart + 30 + Math.random() * height * 0.5;
    ctx.strokeStyle = 'rgba(225, 235, 245, 0.28)';
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yStart);
    for (let y = yStart; y < yEnd; y += 6) {
      x += Math.random() * 2 - 1;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(235, 242, 250, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x, yEnd, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gotas sueltas: brillo arriba y borde inferior más oscuro (refracción).
  for (let i = 0; i < 200; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 0.6 + Math.random() ** 3 * 2.4;
    ctx.fillStyle = 'rgba(70, 80, 92, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y + r * 0.3, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(235, 242, 250, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalize(canvas, 1);
}

/** Cartel de parada de colectivo: fondo azul, "PARADA" y la línea que pasa. */
export function createBusStopSignTexture(linea = '18') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1d4f91';
  ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = '#f2f2f2';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 304);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 50px sans-serif';
  ctx.fillText('PARADA', 128, 78);

  // Pictograma simple de colectivo.
  ctx.fillRect(58, 104, 140, 70);
  ctx.fillStyle = '#1d4f91';
  ctx.fillRect(70, 114, 34, 26);
  ctx.fillRect(111, 114, 34, 26);
  ctx.fillRect(152, 114, 34, 26);
  ctx.beginPath();
  ctx.arc(88, 178, 13, 0, Math.PI * 2);
  ctx.arc(168, 178, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f2c230';
  ctx.fillRect(78, 214, 100, 74);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText(linea, 128, 272);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Letrero LED de destino del colectivo (número de línea + destino, en naranja). */
export function createBusDestinationTexture(linea = '18', destino = 'CIUDAD UNIV.') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(0, 0, 512, 80);
  ctx.fillStyle = '#ffa726';
  ctx.shadowColor = '#ffa726';
  ctx.shadowBlur = 10;
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 54px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(linea, 18, 42);
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(destino, 496, 43);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
