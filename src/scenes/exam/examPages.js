import { examInfo, examPages, answerSheet } from './examContent.js';

/**
 * Dibuja el parcial como hojas impresas (A4) con Canvas2D: el enunciado de examContent.js
 * y la hoja de respuestas escrita a mano. Cada hoja es { canvas, url }: el canvas va de
 * textura a la hoja 3D del banco y la url (JPEG) al visor.
 */

const WIDTH = 1000;
const HEIGHT = 1414;
const MARGIN = 86;
const PRINT = '"Times New Roman", "Liberation Serif", Georgia, serif';
const HANDWRITING = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
const INK = '#1b1b1b';
const PEN_BLUE = '#1f2d73';

function newSheet(paper = '#fbfaf6') {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Grano del papel y una fotocopia apenas desparejada.
  for (let i = 0; i < 2500; i += 1) {
    ctx.fillStyle = `rgba(90, 80, 60, ${Math.random() * 0.035})`;
    ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 2, 2);
  }
  const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0.035)');
  shade.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.02)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  return { canvas, ctx };
}

/** Párrafo con corte de línea por palabras. Devuelve la y siguiente. */
function paragraph(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawHeader(ctx, y) {
  // Escudito: rueda dentada simplificada con las iniciales.
  const cx = MARGIN + 46;
  const cy = y + 46;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 44 : 38;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `bold 24px ${PRINT}`;
  ctx.textAlign = 'center';
  ctx.fillText('UTN', cx, cy + 8);

  ctx.textAlign = 'left';
  const tx = MARGIN + 112;
  ctx.font = `bold 25px ${PRINT}`;
  ctx.fillText(examInfo.universidad, tx, y + 24);
  ctx.font = `22px ${PRINT}`;
  ctx.fillText(`${examInfo.facultad} · ${examInfo.carrera}`, tx, y + 54);
  ctx.font = `bold 30px ${PRINT}`;
  ctx.fillText(`${examInfo.materia} — ${examInfo.instancia}`, tx, y + 92);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y + 116);
  ctx.lineTo(WIDTH - MARGIN, y + 116);
  ctx.stroke();
  return y + 150;
}

function drawFields(ctx, y) {
  ctx.font = `22px ${PRINT}`;
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  const field = (label, x, width, fy) => {
    ctx.fillText(label, x, fy);
    const start = x + ctx.measureText(label).width + 8;
    ctx.beginPath();
    ctx.moveTo(start, fy + 4);
    ctx.lineTo(x + width, fy + 4);
    ctx.stroke();
  };
  field('Apellido y nombre:', MARGIN, 560, y);
  field('Legajo:', MARGIN + 590, WIDTH - 2 * MARGIN - 590, y);
  field('Curso:', MARGIN, 260, y + 44);
  field('Fecha:', MARGIN + 290, 260, y + 44);
  field('Nota:', MARGIN + 590, WIDTH - 2 * MARGIN - 590, y + 44);
  return y + 96;
}

function drawBlock(ctx, block, y) {
  const textWidth = WIDTH - 2 * MARGIN;
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  switch (block.type) {
    case 'header':
      return drawHeader(ctx, y);
    case 'fields':
      return drawFields(ctx, y);
    case 'title':
      ctx.font = `bold 26px ${PRINT}`;
      return paragraph(ctx, block.text, MARGIN, y + 10, textWidth, 34) + 6;
    case 'text':
      ctx.font = `${block.italic ? 'italic ' : ''}22px ${PRINT}`;
      return paragraph(ctx, block.text, MARGIN, y, textWidth, 31) + 14;
    case 'exercise': {
      ctx.font = `bold 24px ${PRINT}`;
      const label = `Ejercicio ${block.number}`;
      ctx.fillText(label, MARGIN, y + 6);
      ctx.font = `italic 21px ${PRINT}`;
      ctx.fillText(`(${block.points} puntos)`, MARGIN + ctx.measureText(label).width + 40, y + 6);
      ctx.font = `22px ${PRINT}`;
      return paragraph(ctx, block.text, MARGIN, y + 42, textWidth, 31) + 10;
    }
    case 'space':
      return y + block.lines * 52;
    case 'footer':
      ctx.font = `italic 20px ${PRINT}`;
      ctx.textAlign = 'right';
      ctx.fillText(block.text, WIDTH - MARGIN, HEIGHT - 60);
      ctx.textAlign = 'left';
      return y;
    default:
      return y;
  }
}

function drawPrintedPage(blocks) {
  const { canvas, ctx } = newSheet();
  let y = MARGIN;
  for (const block of blocks) y = drawBlock(ctx, block, y);
  return canvas;
}

/** Hoja rayada de la carpeta con lo que se llegó a escribir (con la letra del estudiante). */
function drawAnswerSheet() {
  const { canvas, ctx } = newSheet('#f7f4ea');
  const gap = 46;
  const first = 210;
  ctx.strokeStyle = 'rgba(90, 140, 200, 0.45)';
  ctx.lineWidth = 1.5;
  for (let y = first; y < HEIGHT - 40; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(200, 60, 60, 0.55)';
  ctx.beginPath();
  ctx.moveTo(MARGIN, 0);
  ctx.lineTo(MARGIN, HEIGHT);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = `bold 24px ${PRINT}`;
  ctx.fillText(`${examInfo.materia} — Hoja de respuestas`, MARGIN + 20, 70);
  ctx.font = `22px ${PRINT}`;
  ctx.fillText('Apellido y nombre: ______________________   Legajo: ________', MARGIN + 20, 116);
  ctx.fillText('Hoja N° 1', WIDTH - MARGIN - 110, 160);

  ctx.fillStyle = PEN_BLUE;
  answerSheet.lineas.forEach(({ text, bold }, i) => {
    ctx.font = `${bold ? 'bold ' : ''}26px ${HANDWRITING}`;
    ctx.save();
    // La letra se va torciendo un poco a medida que avanza el apuro.
    ctx.translate(MARGIN + 24, first + gap * (i + 1) - 10);
    ctx.rotate(-0.006 * i);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  });
  // Un tachón: algo que se escribió mal y se tachó con un garabato.
  const tachonX = MARGIN + 560;
  const tachonY = first + gap * 4 - 10;
  ctx.font = `26px ${HANDWRITING}`;
  ctx.fillText('getItems()', tachonX, tachonY);
  ctx.strokeStyle = PEN_BLUE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tachonX - 6, tachonY - 8);
  for (let i = 0; i <= 14; i += 1) {
    ctx.lineTo(tachonX + i * 10, tachonY - 8 + (i % 2 === 0 ? -9 : 7));
  }
  ctx.stroke();
  return canvas;
}

/** Las hojas del parcial en el orden en que están en el banco: enunciado y respuestas. */
export function buildExamPages() {
  const canvases = [...examPages.map(drawPrintedPage), drawAnswerSheet()];
  return canvases.map((canvas, index) => ({
    index,
    canvas,
    url: canvas.toDataURL('image/jpeg', 0.9),
    label: index < examPages.length ? `Hoja ${index + 1} del parcial` : 'Hoja de respuestas',
  }));
}
