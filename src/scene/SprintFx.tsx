import { useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';
import * as THREE from 'three';
import { COLORS } from '../game/config';
import { game } from '../game/engine';
import { basic, unitBox } from './materials';

const STREAK_COUNT = 40;
const STREAK_LENGTH = 6;
const SPAN = 70;

const streaks = Array.from({ length: STREAK_COUNT }, () => {
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.6 + Math.random() * 3.5;
  return {
    x: Math.cos(angle) * radius,
    y: Math.max(0.3, 1.2 + Math.sin(angle) * radius * 0.6),
    offset: Math.random() * SPAN,
    speed: 0.8 + Math.random() * 0.6,
  };
});
const streakMaterial = basic(COLORS.sprint, { opacity: 0.55, additive: true });

const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();

/** Warp-speed streaks rushing past the player while sprinting. */
export function SprintFx() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const travel = useRef(0);
  const intensity = useRef(0);

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    intensity.current += ((game.sprinting ? 1 : 0) - intensity.current) * Math.min(1, dt * 5);
    const k = intensity.current;
    mesh.visible = k > 0.02;
    if (!mesh.visible) return;
    travel.current += game.speed * dt * 1.8;
    streaks.forEach((s, i) => {
      const z = -SPAN + ((s.offset + travel.current * s.speed) % SPAN) + 5;
      pos.set(game.player.x + s.x, s.y, z);
      mesh.setMatrixAt(i, mat.compose(pos, quat, scl.set(0.04 * k, 0.04 * k, STREAK_LENGTH * k)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[unitBox, streakMaterial, STREAK_COUNT]} frustumCulled={false} />;
}
