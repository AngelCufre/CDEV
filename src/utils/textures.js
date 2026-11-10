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

/**
 * Mosaico granítico gris claro de edificio público: 2×2 baldosas por repetición, con
 * granitos claros y oscuros y las juntas marcadas.
 */
export function createTileFloorTexture() {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const tile = size / 2;
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const base = 176 + ((row + col) % 2) * 8;
      ctx.fillStyle = `rgb(${base}, ${base - 2}, ${base - 8})`;
      ctx.fillRect(col * tile, row * tile, tile, tile);
    }
  }
  for (let i = 0; i < 2600; i += 1) {
    const dark = Math.random() < 0.6;
    const v = Math.floor(dark ? 60 + Math.random() * 60 : 215 + Math.random() * 40);
    ctx.fillStyle = `rgba(${v}, ${v}, ${v - 6}, ${0.35 + Math.random() * 0.4})`;
    const s = 1 + Math.random() * 2;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
  }
  ctx.fillStyle = 'rgba(70, 70, 66, 0.55)';
  for (let i = 0; i < 2; i += 1) {
    ctx.fillRect(i * tile, 0, 2, size);
    ctx.fillRect(0, i * tile, size, 2);
  }
  return finalize(canvas, 1);
}

/**
 * Adoquines de hormigón en espina de pez (20 × 10 cm), como los del patio central de la
 * facultad. La repetición mide 16 × 16 medios adoquines (1,6 m). El patrón son losetas en
 * L (un adoquín acostado y uno parado) que se repiten cada (1, 1) y (2, −2); en la
 * repetición entran 64, y se dibuja cada una con sus copias corridas un período, así la
 * textura empalma sin costuras. Cada adoquín tiene su tono, entre rojizo y gris.
 */
export function createHerringboneTexture() {
  const size = 1024;
  const units = 16;
  const unit = size / units;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4b423c'; // juntas con arena oscura
  ctx.fillRect(0, 0, size, size);

  const gap = 3;
  const bevel = 4;
  const brick = (x, y, w, h) => {
    const red = Math.random();
    const value = 0.82 + Math.random() * 0.3;
    const r = Math.round((128 + red * 30) * value);
    const g = Math.round((108 + red * 4) * value);
    const b = Math.round((100 - red * 6) * value);
    for (const ox of [-units, 0, units]) {
      for (const oy of [-units, 0, units]) {
        const px = (x + ox) * unit + gap / 2;
        const py = (y + oy) * unit + gap / 2;
        const pw = w * unit - gap;
        const ph = h * unit - gap;
        if (px > size || py > size || px + pw < 0 || py + ph < 0) continue;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(px, py, pw, ph);
        // Canto gastado: más claro de un lado y más oscuro del otro.
        ctx.fillStyle = 'rgba(255, 240, 225, 0.12)';
        ctx.fillRect(px, py, pw, bevel);
        ctx.fillRect(px, py, bevel, ph);
        ctx.fillStyle = 'rgba(20, 10, 5, 0.18)';
        ctx.fillRect(px, py + ph - bevel, pw, bevel);
        ctx.fillRect(px + pw - bevel, py, bevel, ph);
      }
    }
  };
  for (let p = 0; p < 8; p += 1) {
    for (let q = 0; q < 8; q += 1) {
      const x = (((p + 2 * q) % units) + units) % units;
      const y = (((p - 2 * q) % units) + units) % units;
      brick(x, y, 2, 1);
      brick(x, y + 1, 1, 2);
    }
  }
  // Grano del hormigón y alguna mancha.
  for (let i = 0; i < 9000; i += 1) {
    const v = Math.random() < 0.5 ? 40 : 220;
    ctx.fillStyle = `rgba(${v}, ${v - 10}, ${v - 20}, ${0.06 + Math.random() * 0.1})`;
    const s = 1 + Math.random() * 2;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
  }
  return finalize(canvas, 1);
}

/**
 * Losetas cuadradas de hormigón (senderos y veredas): `count` × `count` por repetición,
 * cada una con su tono, grano y alguna mancha, con las juntas marcadas. `weeds` agrega
 * pasto creciendo en las juntas, como en el sendero de la entrada.
 */
export function createSlabTexture({
  count = 4,
  base = [168, 165, 158],
  variation = 16,
  joint = 'rgba(58, 56, 52, 0.85)',
  weeds = false,
} = {}) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const slab = size / count;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      const shade = (Math.random() - 0.5) * variation;
      const [r, g, b] = base.map((c) => Math.round(c + shade));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(col * slab, row * slab, slab, slab);
      // Mancha de humedad adentro de la loseta (sin tocar el borde de la textura).
      if (Math.random() < 0.5) {
        const cx = col * slab + slab * (0.3 + Math.random() * 0.4);
        const cy = row * slab + slab * (0.3 + Math.random() * 0.4);
        const radius = slab * (0.15 + Math.random() * 0.2);
        const blob = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        blob.addColorStop(0, 'rgba(40, 38, 34, 0.18)');
        blob.addColorStop(1, 'rgba(40, 38, 34, 0)');
        ctx.fillStyle = blob;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      }
    }
  }
  for (let i = 0; i < 6000; i += 1) {
    const v = Math.random() < 0.55 ? 70 : 225;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v - 6}, ${0.08 + Math.random() * 0.12})`;
    const s = 1 + Math.random() * 1.5;
    ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
  }
  // Juntas: media junta en cada borde, así empalman al repetir.
  ctx.fillStyle = joint;
  for (let i = 0; i <= count; i += 1) {
    ctx.fillRect(i * slab - 2, 0, 4, size);
    ctx.fillRect(0, i * slab - 2, size, 4);
  }
  if (weeds) {
    ctx.strokeStyle = 'rgba(78, 104, 52, 0.85)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 900; i += 1) {
      const alongX = Math.random() < 0.5;
      const line = Math.floor(Math.random() * count) * slab;
      const t = Math.random() * size;
      const [x, y] = alongX ? [t, line] : [line, t];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6);
      ctx.stroke();
    }
  }
  return finalize(canvas, 1);
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

/** Póster de la cátedra para la pared de la habitación: título y diagramas UML. */
export function createPosterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1f3a5f';
  ctx.fillRect(0, 0, 512, 720);
  ctx.strokeStyle = 'rgba(232, 225, 208, 0.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 468, 676);

  ctx.fillStyle = '#e8e1d0';
  ctx.textAlign = 'center';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('PATRONES', 256, 100);
  ctx.fillText('DE DISEÑO', 256, 152);
  ctx.fillStyle = '#d6b16b';
  ctx.font = '22px sans-serif';
  ctx.fillText('Observer · State · Strategy', 256, 196);

  // Diagrama de clases: tres cajas con flechas.
  ctx.strokeStyle = '#e8e1d0';
  ctx.fillStyle = '#e8e1d0';
  ctx.lineWidth = 3;
  const boxes = [
    [70, 260, 170, 90, 'Subject', '+ notify()'],
    [272, 260, 170, 90, 'Observer', '+ update()'],
    [272, 430, 170, 90, 'Concrete', '+ update()'],
  ];
  for (const [x, y, w, h, name, method] of boxes) {
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x, y + 34);
    ctx.lineTo(x + w, y + 34);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(name, x + w / 2, y + 25);
    ctx.textAlign = 'left';
    ctx.font = '16px monospace';
    ctx.fillText(method, x + 12, y + 62);
  }
  const arrow = (x1, y1, x2, y2, hollow) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 16 * Math.cos(angle - 0.45), y2 - 16 * Math.sin(angle - 0.45));
    ctx.lineTo(x2 - 16 * Math.cos(angle + 0.45), y2 - 16 * Math.sin(angle + 0.45));
    ctx.closePath();
    if (hollow) {
      ctx.fillStyle = '#1f3a5f';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8e1d0';
    } else {
      ctx.fill();
    }
  };
  arrow(240, 305, 270, 305, false);
  arrow(357, 430, 357, 352, true);

  // Máquina de estados: dos estados y la transición.
  ctx.lineWidth = 3;
  for (const [x, y, name] of [
    [120, 580, 'Dormido'],
    [330, 580, 'Tarde'],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '17px sans-serif';
    ctx.fillText(name, x, y + 6);
  }
  arrow(166, 580, 284, 580, false);
  ctx.font = 'italic 15px sans-serif';
  ctx.fillText('alarma / despertar()', 225, 562);
  ctx.fillStyle = 'rgba(232, 225, 208, 0.7)';
  ctx.font = 'italic 17px sans-serif';
  ctx.fillText('Cátedra de Diseño de Software · UTN', 256, 686);
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

/**
 * Interior de un colectivo lleno visto desde afuera: luz cálida y siluetas de gente
 * apretada contra las ventanillas (tres filas: las de atrás más tenues), algunas
 * agarradas del pasamanos. Se estira a lo largo de la franja de ventanillas.
 */
export function createBusCrowdTexture() {
  const width = 1024;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const light = ctx.createLinearGradient(0, 0, 0, height);
  light.addColorStop(0, '#f2dfae');
  light.addColorStop(1, '#c9ad76');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(110, 110, 110, 0.9)';
  ctx.fillRect(0, 12, width, 4); // pasamanos

  const rows = [
    { count: 30, shade: 105, alpha: 0.55, scale: 0.75, baseY: 66 },
    { count: 24, shade: 62, alpha: 0.8, scale: 0.95, baseY: 80 },
    { count: 16, shade: 30, alpha: 0.95, scale: 1.25, baseY: 96 },
  ];
  for (const row of rows) {
    for (let i = 0; i < row.count; i += 1) {
      const x = Math.random() * width;
      const s = row.scale * (0.85 + Math.random() * 0.3);
      const shade = row.shade + Math.floor(Math.random() * 16);
      ctx.fillStyle = `rgba(${shade}, ${shade - 6}, ${shade - 12}, ${row.alpha})`;
      if (Math.random() < 0.35) {
        ctx.fillRect(x + 12 * s, 14, 6 * s, row.baseY - 14); // brazo al pasamanos
      }
      ctx.beginPath();
      ctx.ellipse(x, row.baseY + 42 * s, 34 * s, 32 * s, 0, 0, Math.PI * 2); // hombros
      ctx.ellipse(x, row.baseY - 8 * s, 13 * s, 16 * s, 0, 0, Math.PI * 2); // cabeza
      ctx.fill();
    }
  }

  // Reflejos del vidrio mojado.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 10;
  for (let x = -60; x < width; x += 140 + Math.random() * 80) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + 50, 0);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

/** Pizarrón verde con lo escrito en tiza (`lines`: [{ text, size }]) y manchas de borrador. */
export function createChalkboardTexture(lines) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2f4a3c';
  ctx.fillRect(0, 0, 1024, 384);
  // Manchas de borrador: pasadas anchas y apenas más claras.
  for (let i = 0; i < 14; i += 1) {
    ctx.fillStyle = `rgba(220, 230, 220, ${0.03 + Math.random() * 0.04})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * 1024,
      Math.random() * 384,
      90 + Math.random() * 160,
      25 + Math.random() * 40,
      (Math.random() - 0.5) * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(236, 236, 228, 0.92)';
  ctx.textAlign = 'center';
  let y = 74;
  for (const { text, size = 46 } of lines) {
    ctx.font = `${size}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`;
    ctx.fillText(text, 512, y);
    y += size * 1.45;
  }
  // Polvo de tiza encima del texto, para que no se vea como letra de computadora.
  for (let i = 0; i < 2500; i += 1) {
    ctx.fillStyle = `rgba(47, 74, 60, ${Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 384, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Reloj de pared: devuelve la textura y `setTime(minutos)`, que redibuja las agujas.
 * Solo se redibuja cuando cambia el minuto (lo controla quien lo usa).
 */
export function createWallClockTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const c = size / 2;

  function hand(angle, length, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(c - Math.sin(angle) * 14, c + Math.cos(angle) * 14);
    ctx.lineTo(c + Math.sin(angle) * length, c - Math.cos(angle) * length);
    ctx.stroke();
  }

  function setTime(totalMinutes) {
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1d1d1f';
    for (let i = 0; i < 60; i += 1) {
      const angle = (i / 60) * Math.PI * 2;
      const long = i % 5 === 0;
      const inner = long ? 96 : 108;
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(angle);
      ctx.fillRect(long ? -4 : -1.5, -118, long ? 8 : 3, 118 - inner);
      ctx.restore();
    }
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let h = 1; h <= 12; h += 1) {
      const angle = (h / 12) * Math.PI * 2;
      ctx.fillText(String(h), c + Math.sin(angle) * 78, c - Math.cos(angle) * 78);
    }
    const minutes = totalMinutes % 60;
    const hours = (totalMinutes / 60) % 12;
    hand((hours / 12) * Math.PI * 2, 56, 9, '#1d1d1f');
    hand((minutes / 60) * Math.PI * 2, 88, 6, '#1d1d1f');
    ctx.fillStyle = '#b3261e';
    ctx.beginPath();
    ctx.arc(c, c, 7, 0, Math.PI * 2);
    ctx.fill();
    texture.needsUpdate = true;
  }

  setTime(8 * 60);
  return { texture, setTime };
}

/** Tela floreada de muchos colores (el vestido de la profesora). Se repite sin cortes. */
export function createFloralFabricTexture() {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2c4f7c';
  ctx.fillRect(0, 0, size, size);
  const petals = ['#f2b33d', '#e85d75', '#f7f1e3', '#b77fd6', '#ef7d3c', '#66c2b0', '#f28fb1'];
  const leaf = '#4f8a4a';
  // Cada flor se dibuja también desplazada un tamaño de textura, así el borde empalma.
  const drawWrapped = (x, y, draw) => {
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) draw(x + dx, y + dy);
    }
  };
  for (let i = 0; i < 46; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 7 + Math.random() * 10;
    const color = petals[Math.floor(Math.random() * petals.length)];
    const rotation = Math.random() * Math.PI;
    drawWrapped(x, y, (fx, fy) => {
      ctx.fillStyle = leaf;
      for (const side of [1, -1]) {
        ctx.beginPath();
        ctx.ellipse(
          fx + side * r * 1.2,
          fy + r * 0.6,
          r * 0.7,
          r * 0.3,
          side * 0.6,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = color;
      for (let p = 0; p < 5; p += 1) {
        const angle = rotation + (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          fx + Math.cos(angle) * r * 0.6,
          fy + Math.sin(angle) * r * 0.6,
          r * 0.55,
          r * 0.38,
          angle,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.arc(fx, fy, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return finalize(canvas, 1);
}
