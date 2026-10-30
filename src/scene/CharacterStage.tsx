import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber/native';
import { Suspense, useEffect, useLayoutEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Character } from '../game/characters';
import { CharacterLights, createCharacterModel } from './characterModel';
import { glowMaterial } from './materials';
import { ModelErrorBoundary } from './RunnerModel';

const BACKGROUND = '#140b38';

function useCharacterAssets(character: Character) {
  return useLoader(GLTFLoader, [character.model, character.showcase] as unknown as string[]) as GLTF[];
}

// ---------- showcase (character viewer) ----------

/** Loops the character's showcase idle animation. */
class ShowcaseRig {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer;

  constructor(gltf: GLTF, showcase: GLTF) {
    const model = createCharacterModel(gltf);
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    const idle = showcase.animations[0];
    if (idle) this.mixer.clipAction(idle).play();
  }

  update(dt: number, yaw: number) {
    this.root.rotation.y += (yaw - this.root.rotation.y) * Math.min(1, dt * 12);
    this.mixer.update(dt);
  }
}

function Pedestal({ color }: { color: string }) {
  const assets = useMemo(
    () => ({
      ring: new THREE.TorusGeometry(0.85, 0.035, 8, 48),
      ringMat: new THREE.MeshBasicMaterial({ color }),
      disc: new THREE.CircleGeometry(0.85, 40),
      discMat: new THREE.MeshBasicMaterial({ color: '#0b0624' }),
      glow: new THREE.PlaneGeometry(3.4, 3.4),
      glowMat: glowMaterial(color, 0.45),
    }),
    [color],
  );
  return (
    <group>
      <mesh geometry={assets.disc} material={assets.discMat} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh geometry={assets.ring} material={assets.ringMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
      <mesh geometry={assets.glow} material={assets.glowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} />
    </group>
  );
}

function ShowcaseContent({ character, yaw, onReady }: { character: Character; yaw: { current: number }; onReady: () => void }) {
  const [gltf, showcase] = useCharacterAssets(character);
  const rig = useMemo(() => new ShowcaseRig(gltf, showcase), [gltf, showcase]);
  const camera = useThree((s) => s.camera);

  useLayoutEffect(() => camera.lookAt(0, 0.92, 0), [camera]);
  useEffect(onReady, [onReady]);
  useFrame((_, dt) => rig.update(dt, yaw.current));

  return <primitive object={rig.root} />;
}

/** Full-body character idling on a neon pedestal. `yaw` is read every frame (drag to rotate). */
export function CharacterShowcase(props: { character: Character; yaw: { current: number }; onReady: () => void }) {
  return (
    <Canvas style={StyleSheet.absoluteFill} camera={{ fov: 35, near: 0.1, far: 50, position: [0, 1.15, 4.1] }}>
      <color attach="background" args={[BACKGROUND]} />
      <CharacterLights />
      <Pedestal color={props.character.accent} />
      <ModelErrorBoundary>
        <Suspense fallback={null}>
          <ShowcaseContent {...props} />
        </Suspense>
      </ModelErrorBoundary>
    </Canvas>
  );
}
