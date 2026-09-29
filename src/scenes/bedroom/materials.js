import * as THREE from 'three';
import {
  createWallTexture,
  createFloorTexture,
  createWoodTexture,
  createFabricTexture,
  createRainOnGlassTexture,
} from '../../utils/textures.js';

/**
 * Materiales compartidos de la escena de la habitación.
 * Se crean una sola vez y se reutilizan entre todos los props para minimizar
 * el número de materiales únicos (y por lo tanto de draw calls al fusionar geometría).
 */
export function createBedroomMaterials() {
  const wall = new THREE.MeshStandardMaterial({
    map: createWallTexture(),
    roughness: 0.9,
    metalness: 0,
  });

  const floor = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    roughness: 0.75,
    metalness: 0,
  });

  const ceiling = new THREE.MeshStandardMaterial({
    color: 0xe8e2d5,
    roughness: 0.95,
  });

  const woodDark = new THREE.MeshStandardMaterial({
    map: createWoodTexture('#5c3d24'),
    roughness: 0.6,
  });

  const woodLight = new THREE.MeshStandardMaterial({
    map: createWoodTexture('#8a5a34'),
    roughness: 0.6,
  });

  const metal = new THREE.MeshStandardMaterial({
    color: 0x9a9a9a,
    roughness: 0.4,
    metalness: 0.6,
  });

  const fabricBed = new THREE.MeshStandardMaterial({
    map: createFabricTexture('#3d5a80'),
    roughness: 0.95,
  });

  const fabricClothes = new THREE.MeshStandardMaterial({
    map: createFabricTexture('#7a2e2e'),
    roughness: 0.95,
  });

  const pillow = new THREE.MeshStandardMaterial({
    color: 0xf3ede0,
    roughness: 0.9,
  });

  // Vidrio simple y liviano: material transparente en vez de MeshPhysicalMaterial
  // + transmission (mucho más caro, requiere pases extra del renderer) ya que solo
  // necesitamos un aspecto translúcido básico.
  // La textura trae las gotas de lluvia en el canal alfa: el vidrio en sí es casi
  // transparente y las gotas se ven más opacas. Es MeshBasicMaterial porque la cara
  // interior del vidrio no recibe la luz de la ventana y las gotas se verían como manchas.
  const glass = new THREE.MeshBasicMaterial({
    map: createRainOnGlassTexture(),
    transparent: true,
    depthWrite: false,
  });

  const screenOff = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
  const door = new THREE.MeshStandardMaterial({
    map: createWoodTexture('#6b4a2e'),
    roughness: 0.7,
  });

  return {
    wall,
    floor,
    ceiling,
    woodDark,
    woodLight,
    metal,
    fabricBed,
    fabricClothes,
    pillow,
    glass,
    screenOff,
    door,
  };
}
