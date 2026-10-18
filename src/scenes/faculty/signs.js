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

/** Cartel plano en (x, y, z). `tilt` lo gira un poco en su plano (papeles pegados a mano). */
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
}) {
  const texture = drawPanel({ width, height, background, color, lines, header, align });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, fog: false }),
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
export function createWayfindingSign({ text, width, x, y, z, facing, background = '#1d3557' }) {
  return createPanel({
    width,
    height: 0.38,
    x,
    y,
    z,
    facing,
    background,
    color: '#ffffff',
    lines: [{ text, size: 0.16, bold: true }],
  });
}
