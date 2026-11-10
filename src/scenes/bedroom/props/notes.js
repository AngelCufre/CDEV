import * as THREE from 'three';
import { furniture } from '../roomLayout.js';

const SHEET_WIDTH = 0.21;
const SHEET_LENGTH = 0.29;
const SHEET_THICKNESS = 0.005;
// Hasta cuánto puede diferir la proporción de la imagen de la de la hoja para tomarla
// como "página completa" (un escaneo, una página de PDF). Si difiere más (por ejemplo
// una captura de un diagrama), se imprime centrada sobre una hoja con margen blanco.
const FULL_PAGE_TOLERANCE = 0.08;

/** Dibuja la imagen sobre una hoja A4 (con margen, pegada arriba), como impresa. */
function printOnSheet(image, landscape) {
  const canvas = document.createElement('canvas');
  canvas.width = landscape ? 1414 : 1000;
  canvas.height = landscape ? 1000 : 1414;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = canvas.width * 0.05;
  const scale = Math.min(
    (canvas.width - 2 * margin) / image.width,
    (canvas.height - 2 * margin) / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, (canvas.width - width) / 2, margin, width, height);
  return canvas;
}

/**
 * Apuntes desparramados sobre el escritorio, cada hoja con su página como textura.
 * La hoja de más arriba es la página 1. Devuelve una caja invisible que cubre todas
 * las hojas como interactuable: apuntarle a una hoja de 5 mm de alto sería muy preciso.
 */
export function buildNotes(pages, deskTopY, maxAnisotropy) {
  const group = new THREE.Group();
  group.name = 'notes';
  const { center } = furniture.desk;
  const loader = new THREE.ImageLoader();

  // De abajo hacia arriba; cada hoja apenas por encima de la anterior.
  const placements = [
    { x: center.x - 0.2, z: center.z + 0.05, rotationY: 0.12 },
    { x: center.x - 0.28, z: center.z + 0.1, rotationY: -0.2 },
    { x: center.x - 0.15, z: center.z + 0.15, rotationY: 0.35 },
  ];

  placements.forEach((placement, index) => {
    const page = pages[placements.length - 1 - index];
    const material = new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.9 });
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(SHEET_WIDTH, SHEET_THICKNESS, SHEET_LENGTH),
      material,
    );
    sheet.position.set(placement.x, deskTopY + 0.003 + index * 0.006, placement.z);
    sheet.rotation.y = placement.rotationY;
    sheet.receiveShadow = true;
    group.add(sheet);

    // Si hay menos páginas que hojas, las que sobran quedan en blanco.
    if (!page) return;
    loader.load(page.url, (image) => {
      // Imagen apaisada → hoja apaisada (se intercambian ancho y largo).
      const aspect = image.width / image.height;
      const landscape = aspect > 1;
      if (landscape) sheet.scale.set(SHEET_LENGTH / SHEET_WIDTH, 1, SHEET_WIDTH / SHEET_LENGTH);

      const sheetAspect = landscape ? SHEET_LENGTH / SHEET_WIDTH : SHEET_WIDTH / SHEET_LENGTH;
      const isFullPage = Math.abs(aspect / sheetAspect - 1) < FULL_PAGE_TOLERANCE;
      const texture = new THREE.Texture(isFullPage ? image : printOnSheet(image, landscape));
      texture.colorSpace = THREE.SRGBColorSpace;
      // Las hojas se ven muy de costado desde donde está parado el jugador.
      texture.anisotropy = Math.min(8, maxAnisotropy);
      texture.needsUpdate = true;

      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    });
  });

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.06, 0.48),
    new THREE.MeshBasicMaterial(),
  );
  hitbox.position.set(center.x - 0.2, deskTopY + 0.03, center.z + 0.1);
  hitbox.visible = false;
  group.add(hitbox);

  return { group, interactableMesh: hitbox };
}
