import * as THREE from 'three';

/**
 * Carteles de la facultad dibujados con Canvas2D: chapas de las aulas, señalética, la
 * cartelera del hall y avisos en papel. Cada uno es un plano con su textura, listo para
 * pegar en una pared mirando hacia `facing` ('x+', 'x-', 'z+' o 'z-').
 */

const PX_PER_METER = 512;
const PADDING = 0.08 * PX_PER_METER;
const FACING_ROTATION = { 'z+': 0, 'z-': Math.PI, 'x+': Math.PI / 2, 'x-': -Math.PI / 2 };

/** Escribe `text` con la letra pedida, o más chica si no entra en el ancho del cartel. */
function fillFittedText(ctx, text, x, y, sizePx, bold) {
  const setFont = (px) => {
    ctx.font = `${bold ? 'bold ' : ''}${px}px sans-serif`;
  };
  setFont(sizePx);
  const maxWidth = ctx.canvas.width - 2 * PADDING;
  const width = ctx.measureText(text).width;
  if (width > maxWidth) setFont(Math.floor((sizePx * maxWidth) / width));
  ctx.fillText(text, x, y);
}

/**
 * - `lines`: [{ text, size (alto de letra en m), bold, color }], centradas en vertical.
 * - `header`: banda de color arriba con un título ({ text, size, background, color }).
 * - `align`: 'center' o 'left'.
 */
function drawPanel({ width, height, background, color = '#1a1a1a', lines, header, align }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * PX_PER_METER);
  canvas.height = Math.round(height * PX_PER_METER);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let top = 0;
  if (header) {
    const bandHeight = header.size * 2 * PX_PER_METER;
    ctx.fillStyle = header.background;
    ctx.fillRect(0, 0, canvas.width, bandHeight);
    ctx.fillStyle = header.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fillFittedText(
      ctx,
      header.text,
      canvas.width / 2,
      bandHeight / 2,
      header.size * PX_PER_METER,
      true,
    );
    top = bandHeight;
  }

  const lineHeights = lines.map((line) => line.size * 1.35 * PX_PER_METER);
  const total = lineHeights.reduce((a, b) => a + b, 0);
  let y = top + (canvas.height - top - total) / 2;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.fillStyle = line.color ?? color;
    const x = align === 'left' ? PADDING : canvas.width / 2;
    fillFittedText(ctx, line.text, x, y + lineHeights[i] / 2, line.size * PX_PER_METER, line.bold);
    y += lineHeights[i];
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Cartel plano en (x, y, z). `tilt` lo gira un poco en su plano (papeles pegados a mano).
 * Sin niebla, salvo `fog: true` (carteles de afuera que se ven de lejos).
 */
export function createPanel({
  width,
  height,
  x,
  y,
  z,
  facing,
  tilt = 0,
  background = '#f4f1e8',
  color,
  lines,
  header = null,
  align = 'center',
  fog = false,
}) {
  const texture = drawPanel({ width, height, background, color, lines, header, align });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, fog }),
  );
  mesh.rotation.set(0, FACING_ROTATION[facing], tilt);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Chapa con el número de un aula. */
export function createRoomPlate({ number, x, y, z, facing }) {
  return createPanel({
    width: 0.36,
    height: 0.22,
    x,
    y,
    z,
    facing,
    background: '#1d3557',
    color: '#f1f1f1',
    lines: [
      { text: 'AULA', size: 0.045, bold: true },
      { text: number, size: 0.1, bold: true },
    ],
  });
}

/** Cartel de señalética (fondo azul, letras blancas), como los que cuelgan de las vigas. */
export function createWayfindingSign({
  text,
  width,
  x,
  y,
  z,
  facing,
  background = '#1d3557',
  fog = false,
}) {
  return createPanel({
    width,
    height: 0.38,
    x,
    y,
    z,
    facing,
    fog,
    background,
    color: '#ffffff',
    lines: [{ text, size: 0.16, bold: true }],
  });
}

/**
 * Emblema de la UTN simplificado: dos U espalda con espalda, un travesaño y el palo del
 * medio que las atraviesa. Centrado en (cx, cy), de `size` px de alto.
 */
function drawUtnEmblem(ctx, cx, cy, size, color) {
  const stroke = size * 0.12;
  const half = size * 0.36;
  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  // Palo del medio y travesaño.
  ctx.moveTo(cx, cy - size / 2);
  ctx.lineTo(cx, cy + size / 2);
  ctx.moveTo(cx - half - stroke / 2, cy);
  ctx.lineTo(cx + half + stroke / 2, cy);
  ctx.stroke();
  // U de arriba (abierta hacia arriba) y U de abajo (abierta hacia abajo).
  for (const side of [-1, 1]) {
    const yEnd = cy + side * size * 0.5;
    const yCurve = cy + side * stroke * 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - half, yEnd);
    ctx.lineTo(cx - half, yCurve + side * half * 0.4);
    ctx.quadraticCurveTo(cx - half, yCurve, cx - half * 0.4, yCurve);
    ctx.lineTo(cx + half * 0.4, yCurve);
    ctx.quadraticCurveTo(cx + half, yCurve, cx + half, yCurve + side * half * 0.4);
    ctx.lineTo(cx + half, yEnd);
    ctx.stroke();
  }
}

/** Plano con la textura de un canvas, mirando hacia `facing`. */
function canvasPanel(canvas, { width, height, x, y, z, facing }) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  mesh.rotation.y = FACING_ROTATION[facing];
  mesh.position.set(x, y, z);
  return mesh;
}

/** Letrero de la entrada del edificio: emblema y "UTN FRC" en azul oscuro sobre el muro. */
export function createLogoSign({ width, height, x, y, z, facing }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * PX_PER_METER);
  canvas.height = Math.round(height * PX_PER_METER);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#bca784';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const color = '#1f2f4a';
  const size = canvas.height * 0.62;
  drawUtnEmblem(ctx, canvas.width * 0.24, canvas.height / 2, size, color);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(canvas.height * 0.3)}px sans-serif`;
  ctx.fillText('UTN', canvas.width * 0.44, canvas.height * 0.33);
  ctx.fillText('FRC', canvas.width * 0.44, canvas.height * 0.68);
  return canvasPanel(canvas, { width, height, x, y, z, facing });
}

/**
 * Pasacalle vertical colgado de la torre vidriada: fondo blanco con papelitos de colores,
 * el emblema arriba y las líneas de texto en negro.
 */
export function createBanner({ width, height, x, y, z, facing, lines }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * 256);
  canvas.height = Math.round(height * 256);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f3ee';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const confetti = ['#f2b33d', '#3d6fb6', '#e2574c', '#2d2d2d'];
  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = confetti[i % confetti.length];
    ctx.save();
    ctx.translate(Math.random() * canvas.width, Math.random() * canvas.height);
    ctx.rotate(Math.random() * Math.PI);
    if (i % 2 === 0) ctx.fillRect(-6, -3, 12, 6);
    else {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 6);
      ctx.lineTo(-8, 6);
      ctx.fill();
    }
    ctx.restore();
  }
  const emblem = canvas.width * 0.32;
  drawUtnEmblem(ctx, canvas.width / 2, canvas.height * 0.1, emblem, '#1d2533');
  ctx.fillStyle = '#1d1d1d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = (canvas.height * 0.72) / lines.length;
  lines.forEach((line, i) => {
    fillFittedText(
      ctx,
      line,
      canvas.width / 2,
      canvas.height * 0.24 + lineHeight * (i + 0.5),
      lineHeight * 0.62,
      true,
    );
  });
  return canvasPanel(canvas, { width, height, x, y, z, facing });
}
