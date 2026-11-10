import * as THREE from 'three';
import { paint, roundedBox, mergeParts } from '../../world/lowPoly.js';
import { playerDesk, sheetFloorSpots } from './layout.js';

const SHEET_WIDTH = 0.21;
const SHEET_LENGTH = 0.297;
const GRAVITY = 9.8;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

/** Caja invisible para apuntarle con la mira a algo chico (una hoja, la lapicera). */
function hitbox(width, height, depth) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshBasicMaterial(),
  );
  mesh.visible = false;
  return mesh;
}

/**
 * Las cosas del banco del jugador: las hojas del parcial (cada una con su página de
 * textura), la lapicera, la cartuchera y la botella. Las hojas se pueden volar al piso y
 * la lapicera caerse; las dos se levantan con E y vuelven al banco.
 *
 * Estados de cada objeto: 'desk' (en el banco), 'moving' (animándose) y 'floor'.
 */
export function createDeskItems({ pages, deskTopY, maxAnisotropy, audio }) {
  const group = new THREE.Group();
  group.name = 'desk-items';

  // ---------- Hojas ----------
  // En el banco quedan apiladas y un poco abiertas en abanico (la primera arriba).
  // Con muchas hojas, el abanico se repite cada tres para no salirse del banco.
  const deskSlot = (index) => ({
    position: new THREE.Vector3(
      playerDesk.x - 0.07 + (index % 3) * 0.035,
      deskTopY + 0.002 + (pages.length - index) * 0.0012,
      playerDesk.z + 0.02 - (index % 2) * 0.018,
    ),
    yaw: 0.07 - (index % 3) * 0.07,
  });

  const sheetGeometry = new THREE.PlaneGeometry(SHEET_WIDTH, SHEET_LENGTH);
  sheetGeometry.rotateX(-Math.PI / 2);
  const sheets = pages.map((page, index) => {
    const texture = new THREE.CanvasTexture(page.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, maxAnisotropy);
    const mesh = new THREE.Mesh(
      sheetGeometry,
      new THREE.MeshBasicMaterial({ map: texture, color: 0xeeeeee, side: THREE.DoubleSide }),
    );
    const object = new THREE.Group();
    object.name = `exam-sheet-${index}`;
    object.add(mesh);
    const box = hitbox(0.34, 0.12, 0.42);
    object.add(box);
    const slot = deskSlot(index);
    object.position.copy(slot.position);
    object.rotation.set(0, slot.yaw, 0);
    group.add(object);
    return { page, index, object, hitbox: box, state: 'desk', animation: null, floorSpot: null };
  });

  // Caja para "leer el parcial" apuntándole al banco.
  const readBox = hitbox(0.55, 0.08, 0.42);
  readBox.position.set(playerDesk.x, deskTopY + 0.03, playerDesk.z);
  group.add(readBox);

  // ---------- Lapicera, cartuchera y botella ----------
  const penLength = 0.145;
  const penParts = [];
  const barrel = new THREE.CylinderGeometry(0.0055, 0.0055, penLength, 12);
  penParts.push(paint(barrel, 0x2b4a9a));
  const cap = new THREE.CylinderGeometry(0.0062, 0.0062, 0.05, 12);
  cap.translate(0, penLength / 2 - 0.02, 0);
  penParts.push(paint(cap, 0x1b1d20));
  const tip = new THREE.ConeGeometry(0.0055, 0.016, 12);
  tip.rotateX(Math.PI);
  tip.translate(0, -penLength / 2 - 0.008, 0);
  penParts.push(paint(tip, 0xb8bcc2));
  const penMesh = mergeParts(penParts, 'pen');
  penMesh.rotation.z = Math.PI / 2; // acostada a lo largo de X
  const pen = new THREE.Group();
  pen.add(penMesh);
  const penBox = hitbox(0.2, 0.08, 0.1);
  pen.add(penBox);
  const penDesk = new THREE.Vector3(playerDesk.x + 0.2, deskTopY + 0.006, playerDesk.z + 0.12);
  pen.position.copy(penDesk);
  pen.rotation.y = 0.25;
  group.add(pen);
  const penState = { state: 'desk', animation: null };

  const extras = [];
  extras.push(paint(roundedBox(0.2, 0.05, 0.07, 0, 0, 0, 0.022, 3), 0x7a2e4a)); // cartuchera
  extras[0].rotateY(-0.3);
  extras[0].translate(playerDesk.x + 0.2, deskTopY + 0.025, playerDesk.z - 0.15);
  const bottle = new THREE.CylinderGeometry(0.032, 0.032, 0.21, 18);
  bottle.translate(playerDesk.x - 0.25, deskTopY + 0.105, playerDesk.z - 0.16);
  extras.push(paint(bottle, 0x7fa9c9));
  const bottleCap = new THREE.CylinderGeometry(0.02, 0.02, 0.025, 14);
  bottleCap.translate(playerDesk.x - 0.25, deskTopY + 0.222, playerDesk.z - 0.16);
  extras.push(paint(bottleCap, 0x2d7a3a));
  group.add(mergeParts(extras, 'desk-extras'));

  // ---------- Animaciones ----------
  /**
   * Vuelo de una hoja: sube con el viento, avanza aleteando y cae plana en el piso.
   * `from`/`to` = { position, yaw }.
   */
  function flight(from, to, duration, spin) {
    return { from, to, duration, spin, t: 0 };
  }

  function stepSheet(sheet, delta) {
    const a = sheet.animation;
    a.t = Math.min(a.duration, a.t + delta);
    const k = a.t / a.duration;
    const e = easeInOut(k);
    sheet.object.position.lerpVectors(a.from.position, a.to.position, e);
    sheet.object.position.y += Math.sin(Math.PI * k) * (a.spin ? 0.55 : 0.18);
    const flutter = a.spin ? (1 - k) * 0.9 : 0;
    sheet.object.rotation.set(
      Math.sin(k * Math.PI * 4) * flutter,
      a.from.yaw + (a.to.yaw - a.from.yaw) * e + (a.spin ? k * 2.5 : 0),
      Math.cos(k * Math.PI * 3) * flutter * 0.7,
    );
    if (k >= 1) {
      sheet.animation = null;
      sheet.object.rotation.set(0, a.to.yaw + (a.spin ? 2.5 : 0), 0);
      const done = a.onDone;
      done?.();
    }
  }

  function stepPen(delta) {
    const a = penState.animation;
    a.t += delta;
    if (a.kind === 'fall') {
      // Rueda hasta el borde del banco y después cae, con un rebote chico en el piso.
      const rollTime = 0.55;
      if (a.t < rollTime) {
        const k = a.t / rollTime;
        pen.position.x = penDesk.x + (a.edge.x - penDesk.x) * k * k;
        pen.position.z = penDesk.z + (a.edge.z - penDesk.z) * k * k;
        penMesh.rotation.x += delta * 18;
        return;
      }
      if (!a.falling) {
        a.falling = true;
        a.velocity = new THREE.Vector3(0.6, 0, 0.25);
        a.bounced = false;
      }
      a.velocity.y -= GRAVITY * delta;
      pen.position.addScaledVector(a.velocity, delta);
      penMesh.rotation.x += delta * 14;
      if (pen.position.y <= 0.006) {
        pen.position.y = 0.006;
        if (!a.bounced) {
          a.bounced = true;
          audio.playPenDrop();
          a.velocity.set(a.velocity.x * 0.3, 1.0, a.velocity.z * 0.3);
        } else {
          // Queda donde cayó (al costado de la silla, al alcance de la mano).
          penState.animation = null;
          penState.state = 'floor';
          a.onDone?.();
        }
      }
    } else {
      const k = clamp01(a.t / 0.45);
      pen.position.lerpVectors(a.from, penDesk, easeInOut(k));
      pen.position.y += Math.sin(Math.PI * k) * 0.25;
      if (k >= 1) {
        pen.position.copy(penDesk);
        pen.rotation.set(0, 0.25, 0);
        penMesh.rotation.x = 0;
        penState.animation = null;
        penState.state = 'desk';
      }
    }
  }

  // Lugares del piso libres para las hojas que se vuelan.
  const freeSpots = () =>
    sheetFloorSpots.filter((spot) => !sheets.some((s) => s.floorSpot === spot));

  return {
    group,
    readHitbox: readBox,
    sheets,
    pen: {
      hitbox: penBox,
      get state() {
        return penState.state;
      },
    },
    /** Páginas que están en el banco, en orden (las que se ven en el visor). */
    pagesOnDesk() {
      return sheets.filter((s) => s.state === 'desk').map((s) => s.page);
    },
    get sheetsMissing() {
      return sheets.filter((s) => s.state !== 'desk').length;
    },
    /** Ráfaga: se vuelan `count` hojas del banco (las de arriba de la pila). */
    blowAway(count) {
      const onDesk = sheets.filter((s) => s.state === 'desk');
      const blown = onDesk.slice(0, count);
      for (const sheet of blown) {
        const spot = freeSpots()[0];
        if (!spot) break;
        sheet.state = 'moving';
        sheet.floorSpot = spot;
        sheet.animation = flight(
          { position: sheet.object.position.clone(), yaw: sheet.object.rotation.y },
          {
            position: new THREE.Vector3(spot.x, 0.004 + sheet.index * 0.001, spot.z),
            yaw: spot.yaw,
          },
          1.3 + Math.random() * 0.5,
          true,
        );
        sheet.animation.onDone = () => {
          sheet.state = 'floor';
        };
      }
      return blown.length;
    },
    /** Levanta una hoja del piso: vuelve a su lugar en el banco. */
    pickUpSheet(sheet) {
      if (sheet.state !== 'floor') return false;
      sheet.state = 'moving';
      sheet.floorSpot = null;
      audio.playPaper();
      const slot = deskSlot(sheet.index);
      sheet.animation = flight(
        { position: sheet.object.position.clone(), yaw: sheet.object.rotation.y },
        slot,
        0.5,
        false,
      );
      sheet.animation.onDone = () => {
        sheet.state = 'desk';
      };
      return true;
    },
    dropPen(onDone) {
      if (penState.state !== 'desk') return false;
      penState.state = 'moving';
      penState.animation = {
        kind: 'fall',
        t: 0,
        edge: new THREE.Vector3(playerDesk.x + 0.3, penDesk.y, penDesk.z + 0.04),
        onDone,
      };
      return true;
    },
    pickUpPen() {
      if (penState.state !== 'floor') return false;
      penState.state = 'moving';
      audio.playPaper();
      penState.animation = { kind: 'pick', t: 0, from: pen.position.clone() };
      return true;
    },
    /** Entrega: las hojas del banco vuelan hasta `target` (la mano de la profesora) y desaparecen. */
    handIn(target) {
      for (const sheet of sheets) {
        if (sheet.state !== 'desk') continue;
        sheet.state = 'moving';
        sheet.animation = flight(
          { position: sheet.object.position.clone(), yaw: sheet.object.rotation.y },
          { position: target.clone(), yaw: Math.PI / 2 },
          0.7 + sheet.index * 0.12,
          false,
        );
        sheet.animation.onDone = () => {
          sheet.state = 'handed';
          sheet.object.visible = false;
        };
      }
    },
    update(delta) {
      for (const sheet of sheets) if (sheet.animation) stepSheet(sheet, delta);
      if (penState.animation) stepPen(delta);
    },
  };
}
