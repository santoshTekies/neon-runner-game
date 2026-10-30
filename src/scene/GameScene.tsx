import { Canvas, useFrame } from '@react-three/fiber/native';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';
import { Character } from '../game/characters';
import { COLORS } from '../game/config';
import { game } from '../game/engine';
import { Environment } from './Environment';
import { Obstacles } from './Obstacles';
import { CharacterLights } from './characterModel';
import { Coins, EnergyCells, PowerUps } from './Pickups';
import { Player } from './Player';
import { SprintFx } from './SprintFx';

const lookTarget = new THREE.Vector3();

/** Steps the simulation and drives the camera. Mounted first so it runs before other frame callbacks. */
function EngineDriver() {
  useFrame((state, dt) => {
    game.update(dt);

    const cam = state.camera as THREE.PerspectiveCamera;
    const p = game.player;
    const shake = game.shake * game.shake;
    const t = state.clock.elapsedTime;
    cam.position.set(
      p.x * 0.6 + Math.sin(t * 53) * shake * 0.6,
      3.0 + p.y * 0.3 + Math.cos(t * 47) * shake * 0.4,
      6.4,
    );
    cam.lookAt(lookTarget.set(p.x * 0.4, 1.2, -10));
    const running = game.status === 'running' ? 1 : 0;
    const fov = 62 + (game.difficulty * 10 + (game.sprinting ? 14 : 0)) * running;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 2);
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export function GameScene({ character }: { character: Character }) {
  return (
    <Canvas style={StyleSheet.absoluteFill} camera={{ fov: 62, near: 0.1, far: 220, position: [0, 3, 6.4] }}>
      <EngineDriver />
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 40, 170]} />
      {/* Only the runner model uses lit materials; neutral white keeps its texture colors true. */}
      <CharacterLights />
      <Environment />
      <Obstacles />
      <Coins />
      <PowerUps />
      <EnergyCells />
      <SprintFx />
      <Player key={character.id} character={character} />
    </Canvas>
  );
}
