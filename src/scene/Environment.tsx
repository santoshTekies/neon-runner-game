import { useFrame } from '@react-three/fiber/native';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLORS, LANE_WIDTH, TRACK_HALF_WIDTH } from '../game/config';
import { game } from '../game/engine';
import { basic, unitBox } from './materials';

const STRIPE_COUNT = 26;
const STRIPE_SPACING = 7;
const PILLAR_COUNT = 44;
const PILLAR_SPAN = 190;
const FAR_Z = -175;

const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();

/** Position along a looping strip that scrolls toward the camera. */
const loopZ = (offset: number, span: number) => FAR_Z + ((((offset + game.scroll) % span) + span) % span);

// Random layout is generated once per app launch.
const pillarData = Array.from({ length: PILLAR_COUNT }, (_, i) => {
  const side = i % 2 === 0 ? -1 : 1;
  return {
    x: side * (TRACK_HALF_WIDTH + 1.6 + Math.random() * 5),
    height: 3 + Math.random() * 9,
    offset: ((i + Math.random()) / PILLAR_COUNT) * PILLAR_SPAN,
    color: new THREE.Color(COLORS.pillars[i % COLORS.pillars.length]),
  };
});

export function Environment() {
  const stripes = useRef<THREE.InstancedMesh>(null);
  const pillars = useRef<THREE.InstancedMesh>(null);
  const pillarGlow = useRef<THREE.InstancedMesh>(null);

  const materials = useMemo(
    () => ({
      floor: basic(COLORS.floor),
      ground: basic('#08051c'),
      lane: basic(COLORS.laneLine),
      edge: basic(COLORS.trackEdge),
      edgeGlow: basic(COLORS.trackEdge, { opacity: 0.25, additive: true }),
      stripe: basic('#2a1d6e'),
      pillar: basic('#ffffff'),
      pillarGlow: basic('#ffffff', { opacity: 0.22, additive: true }),
      gridLine: basic('#1d1450'),
    }),
    [],
  );

  useLayoutEffect(() => {
    pillarData.forEach((p, i) => {
      pillars.current?.setColorAt(i, p.color);
      pillarGlow.current?.setColorAt(i, p.color);
    });
    if (pillars.current?.instanceColor) pillars.current.instanceColor.needsUpdate = true;
    if (pillarGlow.current?.instanceColor) pillarGlow.current.instanceColor.needsUpdate = true;
  }, []);

  useFrame(() => {
    const s = stripes.current;
    if (s) {
      for (let i = 0; i < STRIPE_COUNT; i++) {
        pos.set(0, 0.005, loopZ(i * STRIPE_SPACING, STRIPE_COUNT * STRIPE_SPACING));
        scl.set(60, 0.02, 0.12);
        s.setMatrixAt(i, mat.compose(pos, quat, scl));
      }
      s.instanceMatrix.needsUpdate = true;
    }
    const p = pillars.current;
    const g = pillarGlow.current;
    if (p && g) {
      pillarData.forEach((d, i) => {
        pos.set(d.x, d.height / 2, loopZ(d.offset, PILLAR_SPAN));
        p.setMatrixAt(i, mat.compose(pos, quat, scl.set(0.14, d.height, 0.14)));
        g.setMatrixAt(i, mat.compose(pos, quat, scl.set(0.7, d.height + 0.4, 0.7)));
      });
      p.instanceMatrix.needsUpdate = true;
      g.instanceMatrix.needsUpdate = true;
    }
  });

  const trackLength = 200;
  const trackZ = -trackLength / 2 + 10;

  return (
    <group>
      {/* Outer ground with long synthwave grid lines */}
      <mesh geometry={unitBox} material={materials.ground} position={[0, -0.06, trackZ]} scale={[80, 0.1, trackLength]} />
      {[-30, -22, -15, -9, 9, 15, 22, 30].map((x) => (
        <mesh key={x} geometry={unitBox} material={materials.gridLine} position={[x, 0, trackZ]} scale={[0.08, 0.02, trackLength]} />
      ))}
      {/* Track surface */}
      <mesh geometry={unitBox} material={materials.floor} position={[0, -0.04, trackZ]} scale={[TRACK_HALF_WIDTH * 2, 0.1, trackLength]} />
      {[-LANE_WIDTH / 2, LANE_WIDTH / 2].map((x) => (
        <mesh key={x} geometry={unitBox} material={materials.lane} position={[x, 0.015, trackZ]} scale={[0.05, 0.02, trackLength]} />
      ))}
      {[-TRACK_HALF_WIDTH, TRACK_HALF_WIDTH].map((x) => (
        <group key={x}>
          <mesh geometry={unitBox} material={materials.edge} position={[x, 0.06, trackZ]} scale={[0.09, 0.09, trackLength]} />
          <mesh geometry={unitBox} material={materials.edgeGlow} position={[x, 0.08, trackZ]} scale={[0.5, 0.25, trackLength]} />
        </group>
      ))}
      <instancedMesh ref={stripes} args={[unitBox, materials.stripe, STRIPE_COUNT]} frustumCulled={false} />
      <instancedMesh ref={pillars} args={[unitBox, materials.pillar, PILLAR_COUNT]} frustumCulled={false} />
      <instancedMesh ref={pillarGlow} args={[unitBox, materials.pillarGlow, PILLAR_COUNT]} frustumCulled={false} />
    </group>
  );
}
