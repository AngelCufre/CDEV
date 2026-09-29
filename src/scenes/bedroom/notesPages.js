/**
 * Hojas de apuntes que el estudiante dejó sobre el escritorio la noche anterior.
 *
 * Toma automáticamente las imágenes de src/assets/apuntes/ (png, jpg, jpeg, webp),
 * ordenadas por nombre de archivo: "01-resumen.jpg", "02-ejercicios.jpg", etc.
 * Si la carpeta está vacía, genera hojas de ejemplo dibujadas con Canvas2D.
 *
 * Cada página es { url }: sirve tanto para la textura de la hoja en 3D como para
 * el <img> del visor de apuntes.
 */

const imageModules = import.meta.glob('../../assets/apuntes/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function loadNotesPages() {
  const paths = Object.keys(imageModules).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  if (paths.length > 0) return paths.map((path) => ({ url: imageModules[path] }));
  return createPlaceholderPages();
}

// ---------- Hojas de ejemplo ----------

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 1131; // proporción A4
const LINE_GAP = 38;
const FIRST_LINE_Y = 150;
const MARGIN_X = 110;
const HANDWRITING = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
const INK_BLUE = '#1f2d73';
const INK_RED = '#b3261e';

const PLACEHOLDER_CONTENT = [
  [
    { type: 'title', text: 'Resumen — Unidad 3' },
    { type: 'text', text: '• Leer el apunte de la cátedra' },
    { type: 'scribble', words: 5 },
    { type: 'text', text: '• Repasar ejercicios 4 al 9' },
    { type: 'scribble', words: 6 },
    { type: 'scribble', words: 4 },
    { type: 'text', text: '• Ver los ejemplos de clase' },
    { type: 'scribble', words: 6 },
    { type: 'blank' },
    { type: 'text', text: '¡¡ESTO ENTRA SEGURO!!', color: INK_RED },
    { type: 'scribble', words: 5 },
    { type: 'scribble', words: 3 },
  ],
  [
    { type: 'title', text: 'Ejercicios' },
    { type: 'text', text: 'Ej. 4)' },
    { type: 'scribble', words: 6 },
    { type: 'scribble', words: 5 },
    { type: 'box', words: 3 },
    { type: 'blank' },
    { type: 'text', text: 'Ej. 5)' },
    { type: 'scribble', words: 6 },
    { type: 'scribble', words: 2 },
    { type: 'crossed', words: 4 },
    { type: 'scribble', words: 5 },
    { type: 'text', text: 'Ej. 6) → preguntar en consulta', color: INK_RED },
  ],
  [
    { type: 'title', text: 'Dudas' },
    { type: 'text', text: '1. ¿Entra todo o solo la unidad 3?' },
    { type: 'text', text: '2. ¿Se puede usar apunte?' },
    { type: 'scribble', words: 4 },
    { type: 'blank' },
    { type: 'scribble', words: 6 },
    { type: 'scribble', words: 5 },
    { type: 'blank' },
    { type: 'blank' },
    { type: 'text', text: '03:40 am... sigo mañana temprano', color: INK_RED },
    { type: 'text', text: '(poner la alarma!!)', color: INK_RED },
  ],
];

function createPlaceholderPages() {
  return PLACEHOLDER_CONTENT.map((lines, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    drawRuledSheet(ctx);
    lines.forEach((line, lineIndex) =>
      drawLine(ctx, line, FIRST_LINE_Y + lineIndex * LINE_GAP * 2),
    );
    if (index === 1) drawCoffeeStain(ctx, 590, 880);
    drawPageNumber(ctx, index + 1);
    return { url: canvas.toDataURL('image/jpeg', 0.9) };
  });
}

/** Hoja de carpeta rayada: renglones celestes, margen rojo y agujeros a la izquierda. */
function drawRuledSheet(ctx) {
  ctx.fillStyle = '#f7f4ea';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  for (let i = 0; i < 3000; i += 1) {
    ctx.fillStyle = `rgba(120, 100, 60, ${Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * PAGE_WIDTH, Math.random() * PAGE_HEIGHT, 2, 2);
  }

  ctx.strokeStyle = 'rgba(90, 140, 200, 0.45)';
  ctx.lineWidth = 1.5;
  for (let y = FIRST_LINE_Y; y < PAGE_HEIGHT - 40; y += LINE_GAP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(PAGE_WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(200, 60, 60, 0.55)';
  ctx.beginPath();
  ctx.moveTo(MARGIN_X - 20, 0);
  ctx.lineTo(MARGIN_X - 20, PAGE_HEIGHT);
  ctx.stroke();

  ctx.fillStyle = '#d9d4c6';
  for (const y of [PAGE_HEIGHT * 0.2, PAGE_HEIGHT * 0.5, PAGE_HEIGHT * 0.8]) {
    ctx.beginPath();
    ctx.arc(40, y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Renglón "escrito a mano": trazos ondulados con cortes, simulando palabras. */
function drawScribble(ctx, x, y, words) {
  ctx.strokeStyle = INK_BLUE;
  ctx.lineWidth = 2.2;
  let cursor = x;
  for (let w = 0; w < words; w += 1) {
    const wordLength = 40 + Math.random() * 70;
    ctx.beginPath();
    ctx.moveTo(cursor, y);
    for (let dx = 0; dx < wordLength; dx += 4) {
      ctx.lineTo(cursor + dx, y - 6 + Math.sin(dx * 0.9 + w) * 6 + Math.random() * 3);
    }
    ctx.stroke();
    cursor += wordLength + 16;
    if (cursor > PAGE_WIDTH - 80) break;
  }
  return cursor;
}

function drawLine(ctx, line, y) {
  const x = MARGIN_X;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((Math.random() - 0.5) * 0.015);
  ctx.translate(-x, -y);

  if (line.type === 'title') {
    ctx.font = `bold 46px ${HANDWRITING}`;
    ctx.fillStyle = INK_BLUE;
    ctx.fillText(line.text, x, y - 8);
    const width = ctx.measureText(line.text).width;
    ctx.strokeStyle = INK_RED;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 6);
    ctx.lineTo(x + width + 6, y + 2);
    ctx.stroke();
  } else if (line.type === 'text') {
    ctx.font = `30px ${HANDWRITING}`;
    ctx.fillStyle = line.color ?? INK_BLUE;
    ctx.fillText(line.text, x, y - 8);
  } else if (line.type === 'scribble') {
    drawScribble(ctx, x, y, line.words);
  } else if (line.type === 'box') {
    const end = drawScribble(ctx, x + 20, y, line.words);
    ctx.strokeStyle = INK_RED;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 6, y - 34, end - x - 10, 46);
  } else if (line.type === 'crossed') {
    const end = drawScribble(ctx, x, y, line.words);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 4);
    ctx.lineTo(end - 12, y - 10);
    ctx.stroke();
  }
  ctx.restore();
}

/** Aro de café: la taza apoyada sobre la hoja en algún momento de la noche. */
function drawCoffeeStain(ctx, x, y) {
  ctx.strokeStyle = 'rgba(120, 75, 30, 0.35)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, y, 70, 0.3, Math.PI * 1.85);
  ctx.stroke();
  ctx.fillStyle = 'rgba(150, 100, 50, 0.08)';
  ctx.beginPath();
  ctx.arc(x, y, 66, 0, Math.PI * 2);
  ctx.fill();
}

function drawPageNumber(ctx, number) {
  ctx.font = `26px ${HANDWRITING}`;
  ctx.fillStyle = INK_BLUE;
  ctx.textAlign = 'right';
  ctx.fillText(`${number}`, PAGE_WIDTH - 50, 90);
  ctx.textAlign = 'left';
}
