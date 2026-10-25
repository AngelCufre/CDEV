import { examInfo, theoryPage, practicalPart, answerSheet } from './examContent.js';

/**
 * Dibuja el parcial como hojas impresas (A4) con Canvas2D a partir de examContent.js:
 * la hoja teórica, la parte práctica (repartida sola en las hojas que hagan falta, con el
 * encabezado de la cátedra y el pie de página) y la hoja de respuestas escrita a mano.
 * Cada hoja es { canvas, url }: el canvas va de textura a la hoja 3D del banco y la url
 * (JPEG) al visor.
 */

const WIDTH = 1000;
const HEIGHT = 1414;
const MARGIN = 70;
const CONTENT = WIDTH - 2 * MARGIN;
const BOTTOM = HEIGHT - 100; // hasta acá llega el contenido; abajo va el pie
const SANS = '"Calibri", "Carlito", "Liberation Sans", Arial, sans-serif';
const HANDWRITING = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
const INK = '#1b1b1b';
const PEN_BLUE = '#1f2d73';

const font = (size, { bold = false, italic = false } = {}) =>
  `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${SANS}`;

function newSheet(paper = '#fbfaf6') {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Grano del papel y una fotocopia apenas despareja.
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
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
}

/** Corta un texto en renglones que entren en `maxWidth` (respeta los saltos de línea). */
function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Texto con tramos en negrita (`segments`: [{ text, bold }]) cortado en renglones.
 * Devuelve la y siguiente.
 */
function richParagraph(ctx, segments, x, y, maxWidth, size, lineHeight) {
  const words = segments.flatMap(({ text, bold }) =>
    text
      .split(' ')
      .filter(Boolean)
      .map((word) => ({ word, bold })),
  );
  let cursor = x;
  for (const { word, bold } of words) {
    ctx.font = font(size, { bold });
    const width = ctx.measureText(word).width;
    if (cursor + width > x + maxWidth && cursor > x) {
      cursor = x;
      y += lineHeight;
    }
    ctx.fillText(word, cursor, y);
    cursor += width + ctx.measureText(' ').width;
  }
  return y + lineHeight;
}

/** Emblema simplificado de la universidad (un engranaje con la sigla). */
function drawEmblem(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.beginPath();
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const radius = i % 2 === 0 ? r : r * 0.86;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = font(Math.round(r * 0.62), { bold: true });
  ctx.textAlign = 'center';
  ctx.fillText('UTN', cx, cy + r * 0.22);
  ctx.restore();
}

function drawInstitution(ctx, x, y) {
  ctx.textAlign = 'center';
  ctx.font = font(12, { bold: true });
  ctx.fillText(examInfo.universidad, x, y);
  ctx.font = font(12);
  ctx.fillText(examInfo.facultad, x, y + 15);
  ctx.fillText(examInfo.carrera, x, y + 30);
  ctx.textAlign = 'left';
}

/** Encabezado de las hojas de la parte práctica. Devuelve la y donde empieza el contenido. */
function drawPracticalHeader(ctx) {
  drawEmblem(ctx, MARGIN + 95, 62, 20);
  drawInstitution(ctx, MARGIN + 95, 102);
  ctx.textAlign = 'center';
  ctx.font = font(25, { bold: true });
  ctx.fillText(examInfo.catedra[0], WIDTH / 2, 62);
  ctx.fillText(examInfo.catedra[1], WIDTH / 2, 94);
  ctx.font = font(23, { bold: true });
  ctx.fillText(practicalPart.titulo, WIDTH / 2, 126);
  ctx.textAlign = 'left';
  ctx.font = font(19, { bold: true });
  ctx.fillText('Nota:', WIDTH - MARGIN - 150, 66);
  ctx.fillText('Fecha:', WIDTH - MARGIN - 150, 122);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, 140);
  ctx.lineTo(WIDTH - MARGIN, 140);
  ctx.stroke();
  return 172;
}

function drawFooter(ctx, page, total) {
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, HEIGHT - 70);
  ctx.lineTo(WIDTH - MARGIN, HEIGHT - 70);
  ctx.stroke();
  ctx.font = font(17);
  ctx.fillText(examInfo.ciclo, MARGIN, HEIGHT - 44);
  ctx.textAlign = 'center';
  ctx.fillText(examInfo.turnos, WIDTH / 2, HEIGHT - 44);
  ctx.textAlign = 'right';
  ctx.fillText(`Hoja: Página ${page} de ${total}`, WIDTH - MARGIN, HEIGHT - 44);
  ctx.textAlign = 'left';
}

/** Rectángulo con borde (y relleno opcional). */
function cell(ctx, x, y, w, h, fill = null) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = INK;
  }
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, w, h);
}

// ---------- Hoja teórica ----------

function drawTheoryPage() {
  const { canvas, ctx } = newSheet();
  drawEmblem(ctx, MARGIN + 30, 66, 24);
  ctx.textAlign = 'left';
  ctx.font = font(13, { bold: true });
  ctx.fillText(examInfo.universidad, MARGIN + 66, 56);
  ctx.font = font(13);
  ctx.fillText(examInfo.facultad, MARGIN + 66, 73);
  ctx.fillText(examInfo.carrera, MARGIN + 66, 90);

  ctx.textAlign = 'center';
  ctx.font = font(30, { bold: true });
  ctx.fillText(theoryPage.titulo, WIDTH / 2 + 10, 146);
  ctx.font = font(25);
  ctx.fillText(theoryPage.subtitulo, WIDTH / 2 + 10, 180);
  ctx.textAlign = 'left';
  ctx.font = font(17);
  const rightX = WIDTH - MARGIN - 220;
  ctx.fillText('Nota: .......... (...........................)', rightX, 214);
  ctx.fillText('Fecha: ____/____/________', rightX, 238);
  ctx.fillText('Docente: __________________', rightX, 262);

  // Datos de los estudiantes (el teórico se rendía de a dos).
  let y = 282;
  const rowH = 42;
  const splitX = MARGIN + CONTENT * 0.66;
  ctx.font = font(19, { bold: true });
  for (const [left, right] of [
    ['Apellido y Nombre:', 'Legajo Nro.:'],
    ['Apellido y Nombre:', 'Legajo Nro.:'],
    ['Nro. de Orden de Asistencia:', ''],
  ]) {
    cell(ctx, MARGIN, y, splitX - MARGIN, rowH);
    cell(ctx, splitX, y, WIDTH - MARGIN - splitX, rowH);
    ctx.fillText(left, MARGIN + 10, y + 28);
    if (right) ctx.fillText(right, splitX + 10, y + 28);
    y += rowH;
  }

  y += 36;
  ctx.font = font(19, { bold: true });
  ctx.fillText('Resultados de Aprendizaje evaluados en este parcial:', MARGIN, y);
  y += 12;
  const boxTop = y;
  y += 28;
  ctx.font = font(18);
  theoryPage.resultados.forEach((text, i) => {
    ctx.fillText(`${i + 1}.`, MARGIN + 14, y);
    for (const line of wrap(ctx, text, CONTENT - 60)) {
      ctx.fillText(line, MARGIN + 42, y);
      y += 25;
    }
    y += 4;
  });
  cell(ctx, MARGIN, boxTop, CONTENT, y - boxTop - 4);

  y += 30;
  ctx.textAlign = 'center';
  ctx.font = font(21, { bold: true, italic: true });
  ctx.fillText(theoryPage.tema, WIDTH / 2, y);
  y += 12;
  ctx.font = font(20, { bold: true });
  const bandWidth = ctx.measureText(theoryPage.aviso).width + 30;
  ctx.fillRect(WIDTH / 2 - bandWidth / 2, y, bandWidth, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(theoryPage.aviso, WIDTH / 2, y + 23);
  ctx.fillStyle = INK;
  y += 58;
  ctx.font = font(19, { bold: true });
  ctx.fillText(theoryPage.valor, WIDTH / 2, y);
  ctx.textAlign = 'left';

  y += 16;
  ctx.font = font(19);
  theoryPage.preguntas.forEach((question, i) => {
    const lines = wrap(ctx, question, CONTENT - 56);
    const h = lines.length * 27 + 18;
    cell(ctx, MARGIN, y, CONTENT, h);
    ctx.font = font(19, { bold: true });
    ctx.fillText(`${i + 1}.`, MARGIN + 12, y + 30);
    ctx.font = font(19);
    lines.forEach((line, k) => ctx.fillText(line, MARGIN + 42, y + 30 + k * 27));
    y += h;
  });
  return canvas;
}

// ---------- Parte práctica ----------

/** Va armando las hojas: agrega una nueva cuando el contenido ya no entra. */
function createFlow() {
  const pages = [];
  const flow = {
    pages,
    ctx: null,
    y: 0,
    newPage() {
      const sheet = newSheet();
      pages.push(sheet);
      flow.ctx = sheet.ctx;
      flow.y = drawPracticalHeader(sheet.ctx);
    },
    /** Si no entran `height` píxeles más en esta hoja, pasa a la siguiente. */
    fits(height) {
      if (flow.y + height <= BOTTOM) return true;
      flow.newPage();
      return false;
    },
  };
  flow.newPage();
  return flow;
}

/** Datos del estudiante y la tabla de consignas con los puntajes (primera hoja). */
function drawPracticalCover(flow) {
  const { ctx } = flow;
  let y = flow.y;
  const rowH = 46;
  cell(ctx, MARGIN, y, CONTENT, rowH);
  ctx.font = font(19, { bold: true });
  ctx.fillText('Apellido y Nombre:', MARGIN + 10, y + 30);
  y += rowH;
  const widths = [0.3, 0.25, 0.45].map((w) => w * CONTENT);
  let x = MARGIN;
  ['Legajo Nro.:', 'Curso:', 'Nro. de Orden de Asistencia:'].forEach((label, i) => {
    cell(ctx, x, y, widths[i], rowH);
    ctx.fillText(label, x + 10, y + 30);
    x += widths[i];
  });
  y += rowH + 40;

  ctx.font = font(20, { bold: true });
  for (const line of wrap(ctx, practicalPart.intro, CONTENT)) {
    ctx.fillText(line, MARGIN, y);
    y += 27;
  }
  y += 10;

  // Consigna | Puntaje | Puntaje alcanzado
  const tableX = MARGIN + 20;
  const tableW = CONTENT - 40;
  const cols = [0.7, 0.12, 0.18].map((w) => w * tableW);
  const colX = [tableX, tableX + cols[0], tableX + cols[0] + cols[1]];
  const headerH = 50;
  cell(ctx, colX[0], y, cols[0], headerH);
  cell(ctx, colX[1], y, cols[1], headerH);
  cell(ctx, colX[2], y, cols[2], headerH);
  ctx.textAlign = 'center';
  ctx.font = font(18);
  ctx.fillText('Consigna', colX[0] + cols[0] / 2, y + 31);
  ctx.fillText('Puntaje', colX[1] + cols[1] / 2, y + 31);
  ctx.fillText('Puntaje', colX[2] + cols[2] / 2, y + 22);
  ctx.fillText('alcanzado', colX[2] + cols[2] / 2, y + 42);
  ctx.textAlign = 'left';
  y += headerH;

  practicalPart.consignas.forEach((consigna, i) => {
    ctx.font = font(18);
    const segments = [
      { text: `${i + 1}.`, bold: false },
      { text: consigna.titulo, bold: true },
      { text: consigna.texto, bold: false },
    ];
    // Se mide en un canvas aparte para saber el alto de la fila antes de dibujarla.
    const measure = document.createElement('canvas').getContext('2d');
    const end = richParagraph(measure, segments, 0, 0, cols[0] - 24, 18, 24);
    const h = end + 10;
    cell(ctx, colX[0], y, cols[0], h);
    cell(ctx, colX[1], y, cols[1], h);
    cell(ctx, colX[2], y, cols[2], h);
    richParagraph(ctx, segments, colX[0] + 12, y + 26, cols[0] - 24, 18, 24);
    ctx.textAlign = 'center';
    ctx.font = font(18);
    ctx.fillText(String(consigna.puntaje), colX[1] + cols[1] / 2, y + h / 2 + 6);
    ctx.textAlign = 'left';
    y += h;
  });
  const total = practicalPart.consignas.reduce((sum, c) => sum + c.puntaje, 0);
  for (const [label, value, bold] of [
    ['TOTAL', String(total), false],
    ['Total Parte 1', '', true],
    ['Puntaje Total', '', true],
  ]) {
    const h = bold ? 46 : 32;
    cell(ctx, colX[0], y, cols[0], h);
    cell(ctx, colX[1], y, cols[1], h);
    cell(ctx, colX[2], y, cols[2], h);
    ctx.textAlign = 'right';
    ctx.font = font(18, { bold });
    ctx.fillText(label, colX[1] - 12, y + h / 2 + 6);
    ctx.textAlign = 'center';
    ctx.font = font(18);
    ctx.fillText(value, colX[1] + cols[1] / 2, y + h / 2 + 6);
    ctx.textAlign = 'left';
    y += h;
  }
  flow.y = y + 34;
}

function drawTableHeader(flow, block, size) {
  const { ctx } = flow;
  const h = size + 16;
  let x = MARGIN;
  const dark = block.firstColumnDark;
  for (const column of block.columns) {
    const w = column.width * CONTENT;
    cell(ctx, x, flow.y, w, h, dark ? '#3c3c3c' : '#d9d9d9');
    ctx.font = font(size, { bold: true });
    ctx.fillStyle = dark ? '#ffffff' : INK;
    if (dark) ctx.fillText(column.title, x + 8, flow.y + size + 4);
    else {
      ctx.textAlign = 'center';
      ctx.fillText(column.title, x + w / 2, flow.y + size + 4);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = INK;
    x += w;
  }
  flow.y += h;
}

function drawTable(flow, block) {
  const size = block.small ? 14 : 16;
  const lineHeight = Math.round(size * (block.small ? 1.25 : 1.3));
  const pad = block.small ? 5 : 6;
  // El encabezado de la tabla no queda solo al pie de una hoja.
  flow.fits(size + 16 + lineHeight * 2 + 2 * pad);
  drawTableHeader(flow, block, size);
  for (const row of block.rows) {
    const { ctx } = flow;
    const cellLines = row.map((text, i) => {
      const bold = block.firstColumnDark && i === 0;
      ctx.font = font(size, { bold });
      return wrap(ctx, text, block.columns[i].width * CONTENT - 2 * pad);
    });
    const h = Math.max(...cellLines.map((lines) => lines.length)) * lineHeight + 2 * pad;
    if (!flow.fits(h)) drawTableHeader(flow, block, size);
    let x = MARGIN;
    row.forEach((_, i) => {
      const w = block.columns[i].width * CONTENT;
      const dark = block.firstColumnDark && i === 0;
      cell(flow.ctx, x, flow.y, w, h, dark ? '#595959' : null);
      flow.ctx.font = font(size, { bold: dark });
      flow.ctx.fillStyle = dark ? '#ffffff' : INK;
      cellLines[i].forEach((line, k) => {
        flow.ctx.fillText(line, x + pad, flow.y + pad + size + k * lineHeight - 2);
      });
      flow.ctx.fillStyle = INK;
      x += w;
    });
    flow.y += h;
  }
  flow.y += 22;
}

function drawLines(flow, text, { size = 18, italic = false, indent = 0, lineHeight = 25 } = {}) {
  flow.ctx.font = font(size, { italic });
  for (const line of wrap(flow.ctx, text, CONTENT - indent)) {
    flow.fits(lineHeight);
    flow.ctx.font = font(size, { italic });
    flow.ctx.fillText(line, MARGIN + indent, flow.y);
    flow.y += lineHeight;
  }
}

function drawBlock(flow, block) {
  switch (block.type) {
    case 'heading':
      flow.fits(30 + 60);
      flow.y += 8;
      flow.ctx.font = font(24, { bold: true });
      flow.ctx.fillText(block.text, MARGIN - 6, flow.y);
      flow.y += 32;
      break;
    case 'section':
      flow.fits(26 + 50);
      flow.ctx.font = font(21, { bold: true });
      flow.ctx.fillText(block.text, MARGIN - 4, flow.y);
      flow.y += 28;
      break;
    case 'paragraph':
      drawLines(flow, block.text, { italic: block.italic, size: block.italic ? 16 : 18 });
      flow.y += 12;
      break;
    case 'bullets':
      for (const item of block.items) {
        flow.fits(26);
        flow.ctx.font = font(19);
        flow.ctx.fillText('•', MARGIN + 30, flow.y);
        drawLines(flow, item, { size: 19, indent: 58, lineHeight: 27 });
      }
      flow.y += 12;
      break;
    case 'table':
      drawTable(flow, block);
      break;
    default:
      break;
  }
}

function drawPracticalPages() {
  const flow = createFlow();
  drawPracticalCover(flow);
  for (const block of practicalPart.bloques) drawBlock(flow, block);
  flow.pages.forEach((sheet, i) => drawFooter(sheet.ctx, i + 1, flow.pages.length));
  return flow.pages.map((sheet) => sheet.canvas);
}

// ---------- Hoja de respuestas ----------

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
  ctx.moveTo(MARGIN + 16, 0);
  ctx.lineTo(MARGIN + 16, HEIGHT);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = font(24, { bold: true });
  ctx.fillText('Diseño de Sistemas — Hoja de respuestas', MARGIN + 36, 70);
  ctx.font = font(21);
  ctx.fillText('Apellido y nombre: ______________________   Legajo: ________', MARGIN + 36, 116);
  ctx.fillText('Hoja N° 1', WIDTH - MARGIN - 110, 160);

  ctx.fillStyle = PEN_BLUE;
  answerSheet.lineas.forEach(({ text }, i) => {
    ctx.font = `25px ${HANDWRITING}`;
    ctx.save();
    // La letra se va torciendo un poco a medida que avanza el apuro.
    ctx.translate(MARGIN + 40, first + gap * (i + 1) - 10);
    ctx.rotate(-0.005 * i);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  });
  // Lo último que escribió, tachado con un garabato.
  const lastLine = answerSheet.lineas.length;
  ctx.font = `25px ${HANDWRITING}`;
  const startX = MARGIN + 40 + ctx.measureText(answerSheet.lineas[lastLine - 1].text).width + 10;
  const y = first + gap * lastLine - 10;
  ctx.fillText(answerSheet.tachado, startX, y);
  const width = ctx.measureText(answerSheet.tachado).width;
  ctx.strokeStyle = PEN_BLUE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(startX - 6, y - 8);
  for (let x = 0; x <= width + 12; x += 10) {
    ctx.lineTo(startX - 6 + x, y - 8 + ((x / 10) % 2 === 0 ? -9 : 7));
  }
  ctx.stroke();
  return canvas;
}

/** Las hojas en el orden en que están en el banco: teórica, práctica y respuestas. */
export function buildExamPages() {
  const practical = drawPracticalPages();
  const canvases = [drawTheoryPage(), ...practical, drawAnswerSheet()];
  return canvases.map((canvas, index) => {
    let label = 'Hoja de respuestas';
    if (index === 0) label = 'Parte teórica';
    else if (index <= practical.length) label = `Parte práctica, página ${index}`;
    return { index, canvas, url: canvas.toDataURL('image/jpeg', 0.9), label };
  });
}
