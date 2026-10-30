import { useFrame } from '@react-three/fiber/native';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Runner } from '../game/characters';
import { COLORS, LANES } from '../game/config';
import { game } from '../game/engine';
import { basic, glowMaterial } from './materials';
import { ModelErrorBoundary, RunnerModel } from './RunnerModel';

const LIMB_RADIUS = 0.075;
const THIGH = 0.45;
const SHIN = 0.45;
const UPPER_ARM = 0.32;
const FOREARM = 0.3;
const HIP_Y = THIGH + SHIN + 0.02;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A limb segment hanging down from its pivot. */
function Segment({ length, geometry, material }: { length: number; geometry: THREE.BufferGeometry; material: THREE.Material }) {
  return <mesh geometry={geometry} material={material} position={[0, -length / 2, 0]} />;
}

/** The runner: a neon stick figure, or a 3D character (the stick figure stands in while it loads or if it fails). */
export function Player({ runner }: { runner: Runner }) {
  const color = runner.accent;
  const [modelReady, setModelReady] = useState(false);
  const onModelReady = useCallback(() => setModelReady(true), []);
  const onModelError = useCallback(() => setModelReady(false), []);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const shield = useRef<THREE.Mesh>(null);
  const aura = useRef<THREE.Mesh>(null);
  const limbs = useRef<Record<string, THREE.Group | null>>({});
  const set = (name: string) => (el: THREE.Group | null) => void (limbs.current[name] = el);

  const assets = useMemo(
    () => ({
      thigh: new THREE.CapsuleGeometry(LIMB_RADIUS, THIGH - LIMB_RADIUS * 2, 4, 8),
      shin: new THREE.CapsuleGeometry(LIMB_RADIUS, SHIN - LIMB_RADIUS * 2, 4, 8),
      upperArm: new THREE.CapsuleGeometry(LIMB_RADIUS * 0.85, UPPER_ARM - LIMB_RADIUS * 2, 4, 8),
      forearm: new THREE.CapsuleGeometry(LIMB_RADIUS * 0.85, FOREARM - LIMB_RADIUS * 2, 4, 8),
      torso: new THREE.CapsuleGeometry(0.13, 0.4, 4, 10),
      head: new THREE.SphereGeometry(0.17, 14, 12),
      halo: new THREE.PlaneGeometry(2.6, 3.2),
      shieldGeo: new THREE.IcosahedronGeometry(1.15, 1),
      shieldMat: new THREE.MeshBasicMaterial({ color: COLORS.shield, wireframe: true, transparent: true, opacity: 0.45 }),
      material: basic(color),
      glow: glowMaterial(color, 0.4),
      aura: new THREE.PlaneGeometry(1, 1),
      auraMat: glowMaterial(COLORS.sprint, 0),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    (assets.material as THREE.MeshBasicMaterial).color.set(color);
    (assets.glow as THREE.MeshBasicMaterial).color.set(color);
  }, [color, assets]);

  useFrame((state, dt) => {
    const p = game.player;
    const r = root.current;
    const b = body.current;
    const L = limbs.current;
    if (!r || !b) return;

    r.position.set(p.x, p.y, 0);
    r.visible = p.invulnerable <= 0 || Math.floor(state.clock.elapsedTime * 14) % 2 === 0;

    const sliding = p.slideTimer > 0;
    const airborne = p.y > 0.01;
    const phase = p.runPhase;
    const k = Math.min(1, dt * 18);

    // Target pose angles (radians, positive x-rotation swings a limb forward / -z).
    let lean = game.sprinting ? -0.38 : -0.18;
    let bodyY = 0;
    let lThigh = Math.sin(phase) * 0.9;
    let rThigh = -lThigh;
    let lShin = -Math.max(0, Math.sin(phase + 1.4)) * 1.4 - 0.15;
    let rShin = -Math.max(0, Math.sin(phase + 1.4 + Math.PI)) * 1.4 - 0.15;
    let lArm = -Math.sin(phase) * 0.8;
    let rArm = -lArm;
    let elbow = 1.3;

    if (airborne) {
      lean = -0.3;
      lThigh = 1.1;
      rThigh = 0.3;
      lShin = -1.6;
      rShin = -1.1;
      lArm = 1.2;
      rArm = -0.6;
      elbow = 0.9;
    } else if (sliding) {
      // Lie back with legs pointing forward along the track.
      lean = 1.15;
      bodyY = -0.15;
      lThigh = 0.45;
      rThigh = 0.3;
      lShin = -0.1;
      rShin = -0.45;
      lArm = -0.4;
      rArm = 1.8;
      elbow = 0.3;
    }

    b.rotation.x = lerp(b.rotation.x, lean, k);
    b.position.y = lerp(b.position.y, bodyY, k);
    // Bank into lane changes.
    b.rotation.z = lerp(b.rotation.z, (p.x - LANES[p.lane]) * 0.25, k);

    const apply = (name: string, x: number) => {
      const g = L[name];
      if (g) g.rotation.x = lerp(g.rotation.x, x, k);
    };
    apply('lThigh', lThigh);
    apply('rThigh', rThigh);
    apply('lShin', lShin);
    apply('rShin', rShin);
    apply('lArm', lArm);
    apply('rArm', rArm);
    apply('lElbow', elbow);
    apply('rElbow', elbow);

    if (aura.current) {
      // Big pulsing aura while sprinting.
      const m = aura.current.material as THREE.MeshBasicMaterial;
      m.opacity = lerp(m.opacity, game.sprinting ? 0.75 : 0, Math.min(1, dt * 6));
      aura.current.visible = m.opacity > 0.01;
      aura.current.scale.set(3.2, 4 + Math.sin(state.clock.elapsedTime * 20) * 0.3, 1);
    }

    if (shield.current) {
      shield.current.visible = game.powerUps.shield > 0;
      shield.current.rotation.set(state.clock.elapsedTime * 0.6, state.clock.elapsedTime, 0);
    }
  });

  const m = assets.material;
  const leg = (side: 'l' | 'r', x: number) => (
    <group ref={set(`${side}Thigh`)} position={[x, HIP_Y, 0]}>
      <Segment length={THIGH} geometry={assets.thigh} material={m} />
      <group ref={set(`${side}Shin`)} position={[0, -THIGH, 0]}>
        <Segment length={SHIN} geometry={assets.shin} material={m} />
      </group>
    </group>
  );
  const arm = (side: 'l' | 'r', x: number) => (
    <group ref={set(`${side}Arm`)} position={[x, HIP_Y + 0.55, 0]}>
      <Segment length={UPPER_ARM} geometry={assets.upperArm} material={m} />
      <group ref={set(`${side}Elbow`)} position={[0, -UPPER_ARM, 0]}>
        <Segment length={FOREARM} geometry={assets.forearm} material={m} />
      </group>
    </group>
  );

  return (
    <group ref={root}>
      <mesh geometry={assets.halo} material={assets.glow} position={[0, 1, -0.3]} />
      <mesh ref={aura} geometry={assets.aura} material={assets.auraMat} position={[0, 1, -0.4]} visible={false} />
      {runner.kind === 'model' && (
        <ModelErrorBoundary onError={onModelError}>
          <Suspense fallback={null}>
            <RunnerModel model={runner.model} onReady={onModelReady} />
          </Suspense>
        </ModelErrorBoundary>
      )}
      <group ref={body} visible={!modelReady}>
        {leg('l', -0.13)}
        {leg('r', 0.13)}
        <mesh geometry={assets.torso} material={m} position={[0, HIP_Y + 0.3, 0]} />
        {arm('l', -0.22)}
        {arm('r', 0.22)}
        <mesh geometry={assets.head} material={m} position={[0, HIP_Y + 0.82, 0]} />
      </group>
      <mesh ref={shield} geometry={assets.shieldGeo} material={assets.shieldMat} position={[0, 0.95, 0]} visible={false} />
    </group>
  );
}
