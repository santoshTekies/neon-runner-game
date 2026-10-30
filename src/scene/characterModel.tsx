import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export const CHARACTER_HEIGHT = 1.75;

/**
 * A fresh, independently animatable copy of a character model: scaled to CHARACTER_HEIGHT,
 * feet on y=0, facing +z, with cheap lit materials. Loaded GLTFs are cached and shared,
 * so every scene that shows the character needs its own copy.
 */
export function createCharacterModel(gltf: GLTF) {
  const model = clone(gltf.scene);
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.setScalar(1);
  const box = new THREE.Box3().setFromObject(model);
  model.scale.setScalar(CHARACTER_HEIGHT / (box.max.y - box.min.y));

  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const convert = (m: THREE.Material) => {
      const src = m as THREE.MeshStandardMaterial;
      return new THREE.MeshLambertMaterial({
        name: src.name,
        map: src.map,
        transparent: src.transparent,
        opacity: src.opacity,
        alphaTest: src.alphaTest,
        side: src.side,
        // Show the texture's own colors; R3F's default ACES tone mapping washes them out.
        toneMapped: false,
      });
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
  });
  return model;
}

/**
 * Neutral white lighting for character models. Lambert divides light by π, so a surface facing
 * the key light gets ≈ (1.9 + 1.4) / π ≈ 1.05× its texture color, and sides fall off gently.
 */
export function CharacterLights({ keyPosition = [2, 6, 6] }: { keyPosition?: [number, number, number] }) {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8c8c8c', 1.9]} />
      <directionalLight position={keyPosition} intensity={1.4} />
    </>
  );
}
