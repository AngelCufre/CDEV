import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paint, box } from '../../world/lowPoly.js';
import {
  createHerringboneTexture,
  createSlabTexture,
  createWetGrassTexture,
} from '../../utils/textures.js';
import {
  westFenceX,
  southFenceZ,
  parking,
  parkingLane,
  auditoriumPlaza,
  entrancePath,
  plaza,
  innerStreet,
  galleryFloor,
  pavedAreas,
  lawnIslands,
  gallery,
} from './layout.js';

/**
 * Pisos de afuera. Lo pavimentado está mojado y refleja (WetReflection), con la textura
 * aplicada por coordenadas de mundo: losetas en el sendero y las veredas, baldosas grandes
 * en la calle interna, adoquines en espina de pez en el patio, asfalto en el
 * estacionamiento y las calles. Debajo de todo hay un plano de pasto.
 */

const CURB = 0xb3ada2;
const CURB_HEIGHT = 0.14;

/** Rectángulo horizontal a la altura `y`, mirando para arriba. */
function flatRect(area, y) {
  const geo = new THREE.PlaneGeometry(area.maxX - area.minX, area.maxZ - area.minZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate((area.minX + area.maxX) / 2, y, (area.minZ + area.maxZ) / 2);
  return geo;
}

/** Varios rectángulos a la altura `y`, en una sola geometría sin UV. */
function flatRects(areas, y) {
  const geos = areas.map((area) => {
    const geo = flatRect(area, y);
    geo.deleteAttribute('uv');
    return geo;
  });
  const merged = mergeGeometries(geos);
  for (const geo of geos) geo.dispose();
  return merged;
}

/** Plano de pasto con UV en metros (una repetición de la textura cada `meters`). */
function grassPlane(area, y, meters) {
  const geo = flatRect(area, y);
  const position = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < position.count; i += 1) {
    uv.setXY(i, position.getX(i) / meters, position.getZ(i) / meters);
  }
  return geo;
}

/** Huella de tierra en el pasto, de (x0, z0) a (x1, z1). */
function dirtTrack(parts, x0, z0, x1, z1, width) {
  const length = Math.hypot(x1 - x0, z1 - z0);
  const geo = new THREE.PlaneGeometry(width, length, 1, 8);
  // Bordes desparejos: los vértices de los costados se corren un poco.
  const position = geo.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    position.setX(i, position.getX(i) * (0.7 + 0.5 * Math.abs(Math.sin(y * 1.7 + x0))));
  }
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.atan2(x1 - x0, z1 - z0));
  geo.translate((x0 + x1) / 2, 0.012, (z0 + z1) / 2);
  parts.push(paint(geo, 0x6a6150));
}

/**
 * - `reflection`: el WetReflection del plano y = 0.
 * - `parts`: donde se agregan cordones, guías podotáctiles y huellas (piezas pintadas).
 * Devuelve el grupo con los pisos.
 */
export function buildCampusGround({ reflection, parts, anisotropy }) {
  const group = new THREE.Group();
  group.name = 'campus-ground';

  const textures = [];
  const texture = (created) => {
    created.anisotropy = anisotropy;
    textures.push(created);
    return created;
  };

  // Pasto: un plano grande debajo de todo, y los canteros del patio elevados.
  const grassTexture = texture(createWetGrassTexture());
  grassTexture.repeat.set(1, 1);
  const grassMaterial = new THREE.MeshBasicMaterial({ map: grassTexture, color: 0xd8dccf });
  const grass = new THREE.Mesh(
    grassPlane({ minX: -90, maxX: 90, minZ: -130, maxZ: 80 }, -0.02, 2.5),
    grassMaterial,
  );
  grass.name = 'grass';
  group.add(grass);
  const islandGeos = lawnIslands.map((island) => grassPlane(island, CURB_HEIGHT - 0.02, 2.5));
  const islands = new THREE.Mesh(mergeGeometries(islandGeos), grassMaterial);
  for (const geo of islandGeos) geo.dispose();
  group.add(islands);
  for (const { minX, maxX, minZ, maxZ } of lawnIslands) {
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const w = maxX - minX;
    const d = maxZ - minZ;
    for (const side of [-1, 1]) {
      parts.push(
        paint(box(w + 0.3, CURB_HEIGHT, 0.15, cx, CURB_HEIGHT / 2, cz + (side * d) / 2), CURB),
      );
      parts.push(paint(box(0.15, CURB_HEIGHT, d, cx + (side * w) / 2, CURB_HEIGHT / 2, cz), CURB));
    }
  }

  // Sendero de la entrada y veredas de las calles: losetas de 60 cm con pasto en las juntas.
  const slabs = texture(createSlabTexture({ base: [172, 170, 163], weeds: true }));
  const westSidewalk = {
    minX: westFenceX - 3,
    maxX: westFenceX - 0.2,
    minZ: -130,
    maxZ: southFenceZ + 3,
  };
  const southSidewalk = {
    minX: westFenceX - 0.2,
    maxX: 90,
    minZ: southFenceZ + 0.2,
    maxZ: southFenceZ + 3,
  };
  group.add(
    reflection.createSurface(flatRects([entrancePath, westSidewalk, southSidewalk], 0), {
      map: slabs,
      mapScale: 2.4,
      reflectivity: 0.35,
      minReflect: 0.03,
      darken: 0.72,
      streak: 0.04,
      distortion: 0.012,
    }),
  );

  // Explanada, calle interna y galería: baldosas grandes, más oscuras bajo techo (secas).
  const tiles = texture(
    createSlabTexture({
      count: 4,
      base: [150, 142, 134],
      variation: 10,
      joint: 'rgba(48, 46, 44, 0.9)',
    }),
  );
  group.add(
    reflection.createSurface(flatRects([plaza, innerStreet, auditoriumPlaza], 0), {
      map: tiles,
      mapScale: 2,
      reflectivity: 0.42,
      minReflect: 0.04,
      darken: 0.75,
      streak: 0.05,
      distortion: 0.01,
    }),
    reflection.createSurface(flatRects([galleryFloor], 0), {
      map: tiles,
      mapScale: 2,
      color: 0xd6d0c6,
      reflectivity: 0.12,
      minReflect: 0.02,
      darken: 0.95,
      streak: 0.02,
      distortion: 0.002,
    }),
  );

  // Patio y avenida: adoquines en espina de pez, a 45° del borde como en las fotos.
  const pavers = texture(createHerringboneTexture());
  group.add(
    reflection.createSurface(flatRects(pavedAreas, 0), {
      map: pavers,
      mapScale: 1.6,
      mapRotation: Math.PI / 4,
      reflectivity: 0.5,
      minReflect: 0.04,
      darken: 0.78,
      streak: 0.06,
      distortion: 0.012,
    }),
  );
  // Faja de adoquines rojizos en el borde sur del patio.
  group.add(
    reflection.createSurface(flatRects([{ minX: -18, maxX: 3, minZ: -31.2, maxZ: -30.4 }], 0.003), {
      map: pavers,
      mapScale: 0.8,
      color: 0xd9a08a,
      reflectivity: 0.45,
      darken: 0.75,
    }),
  );

  // Estacionamiento y calles (Maestro Marcelo López al oeste, Cruz Roja al sur): asfalto.
  const westStreet = {
    minX: westFenceX - 13,
    maxX: westFenceX - 3,
    minZ: -130,
    maxZ: southFenceZ + 13,
  };
  const southStreet = {
    minX: westFenceX - 3,
    maxX: 90,
    minZ: southFenceZ + 3,
    maxZ: southFenceZ + 13,
  };
  group.add(
    reflection.createSurface(flatRects([parking, westStreet, southStreet], 0), {
      color: 0x45484c,
      reflectivity: 0.72,
      minReflect: 0.06,
      darken: 0.75,
      streak: 0.07,
      distortion: 0.009,
    }),
  );
  // Líneas blancas de los lugares, bordes del carril y cordón contra el pasto.
  const paintLine = (w, d, x, z) => parts.push(paint(box(w, 0.006, d, x, 0.004, z), 0xd9d9d2));
  const rows = [
    [parking.minZ + 0.2, parkingLane.minZ],
    [parkingLane.maxZ, parking.maxZ - 0.2],
  ];
  for (let x = westFenceX + 6; x <= parking.maxX - 1; x += 2.7) {
    for (const [z0, z1] of rows) paintLine(0.1, z1 - z0 - 0.4, x, (z0 + z1) / 2);
  }
  for (const z of [parkingLane.minZ, parkingLane.maxZ]) {
    paintLine(parking.maxX - westFenceX - 6, 0.1, (westFenceX + 6 + parking.maxX) / 2, z);
  }
  for (const [x0, x1] of [
    [westFenceX, entrancePath.minX - 0.4],
    [entrancePath.maxX + 0.4, auditoriumPlaza.minX],
  ]) {
    parts.push(paint(box(x1 - x0, 0.12, 0.2, (x0 + x1) / 2, 0.06, parking.minZ), CURB));
  }

  // Guías podotáctiles: junto a las columnas de la galería y cruzando la explanada.
  const tactile = 0x55575a;
  const length = gallery.maxZ - gallery.minZ;
  parts.push(
    paint(
      box(0.4, 0.008, length, gallery.edgeX - 0.5, 0.004, (gallery.minZ + gallery.maxZ) / 2),
      tactile,
    ),
    paint(
      box(
        plaza.maxX - entrancePath.minX,
        0.008,
        0.4,
        (plaza.maxX + entrancePath.minX) / 2,
        0.004,
        -5.4,
      ),
      tactile,
    ),
    paint(
      box(
        innerStreet.maxX - innerStreet.minX,
        0.008,
        0.4,
        (innerStreet.minX + innerStreet.maxX) / 2,
        0.004,
        -31,
      ),
      tactile,
    ),
  );

  // Huella de tierra en el pasto de la entrada (todos cortan camino por ahí).
  dirtTrack(parts, 3.2, 19, 10.5, -1.5, 0.42);

  return {
    group,
    dispose() {
      for (const created of textures) created.dispose();
    },
  };
}
