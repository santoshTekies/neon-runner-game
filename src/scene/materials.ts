import * as THREE from 'three';

export const unitBox = new THREE.BoxGeometry(1, 1, 1);

export function basic(color: string, opts: { opacity?: number; additive?: boolean; fog?: boolean } = {}) {
  const { opacity = 1, additive = false, fog = true } = opts;
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1 || additive,
    opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !additive,
    fog,
  });
}

let glowTexture: THREE.DataTexture | null = null;

/** Soft radial falloff used for fake bloom halos. */
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const a = Math.pow(1 - d, 2.2);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  glowTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  glowTexture.needsUpdate = true;
  return glowTexture;
}

export function glowMaterial(color: string, opacity = 0.6) {
  return new THREE.MeshBasicMaterial({
    color,
    map: getGlowTexture(),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/** Scale-zero matrix used to hide unused instances. */
export const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
