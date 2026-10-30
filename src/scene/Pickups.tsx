import { useFrame } from '@react-three/fiber/native';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLORS, PowerUpType } from '../game/config';
import { game } from '../game/engine';
import { HIDDEN, basic, glowMaterial } from './materials';

const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const scl = new THREE.Vector3();

export function Coins() {
  const coins = useRef<THREE.InstancedMesh>(null);
  const rims = useRef<THREE.InstancedMesh>(null);
  const count = game.coinPool.length;

  const assets = useMemo(() => {
    const coin = new THREE.CylinderGeometry(0.3, 0.3, 0.07, 18);
    coin.rotateX(Math.PI / 2);
    const rim = new THREE.TorusGeometry(0.34, 0.05, 6, 18);
    return { coin, rim, coinMat: basic('#ffb800'), rimMat: basic(COLORS.coin) };
  }, []);

  useFrame((state) => {
    const c = coins.current;
    const r = rims.current;
    if (!c || !r) return;
    const spin = state.clock.elapsedTime * 4;
    game.coinPool.forEach((coin, i) => {
      if (!coin.active) {
        c.setMatrixAt(i, HIDDEN);
        r.setMatrixAt(i, HIDDEN);
        return;
      }
      pos.set(coin.x, coin.y + Math.sin(spin * 0.7 + coin.z * 0.3) * 0.08, coin.z);
      quat.setFromEuler(euler.set(0, spin + coin.z * 0.2, 0));
      mat.compose(pos, quat, scl.setScalar(1));
      c.setMatrixAt(i, mat);
      r.setMatrixAt(i, mat);
    });
    c.instanceMatrix.needsUpdate = true;
    r.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={coins} args={[assets.coin, assets.coinMat, count]} frustumCulled={false} />
      <instancedMesh ref={rims} args={[assets.rim, assets.rimMat, count]} frustumCulled={false} />
    </group>
  );
}

const POWERUP_COLORS: Record<PowerUpType, string> = {
  magnet: COLORS.magnet,
  shield: COLORS.shield,
  multiplier: COLORS.multiplier,
};

const powerUpMaterials = (t: PowerUpType) => ({
  solid: basic(POWERUP_COLORS[t]),
  wire: new THREE.MeshBasicMaterial({ color: POWERUP_COLORS[t], wireframe: true }),
  glow: glowMaterial(POWERUP_COLORS[t], 0.55),
});

function PowerUpSlot({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const variants = useRef<Partial<Record<PowerUpType, THREE.Group | null>>>({});

  const assets = useMemo(
    () => ({
      cage: new THREE.IcosahedronGeometry(0.62, 0),
      magnet: new THREE.TorusGeometry(0.28, 0.1, 8, 16, Math.PI),
      magnetTip: new THREE.BoxGeometry(0.2, 0.16, 0.2),
      shield: new THREE.OctahedronGeometry(0.34),
      multiplier: new THREE.DodecahedronGeometry(0.32),
      halo: new THREE.PlaneGeometry(2.4, 2.4),
      mats: {
        magnet: powerUpMaterials('magnet'),
        shield: powerUpMaterials('shield'),
        multiplier: powerUpMaterials('multiplier'),
      },
    }),
    [],
  );

  useFrame((state) => {
    const u = game.powerUpPool[index];
    const g = group.current;
    if (!g) return;
    g.visible = u.active;
    if (!u.active) return;
    const t = state.clock.elapsedTime;
    g.position.set(u.x, 1.1 + Math.sin(t * 3) * 0.15, u.z);
    for (const type of Object.keys(POWERUP_COLORS) as PowerUpType[]) {
      const v = variants.current[type];
      if (v) {
        v.visible = type === u.type;
        v.children[0].rotation.set(t * 1.3, t * 1.7, 0);
        v.children[1].rotation.y = t * 2.5;
      }
    }
  });

  return (
    <group ref={group} visible={false}>
      {(Object.keys(POWERUP_COLORS) as PowerUpType[]).map((type) => {
        const m = assets.mats[type];
        return (
          <group key={type} ref={(el) => void (variants.current[type] = el)}>
            <mesh geometry={assets.cage} material={m.wire} />
            <group>
              {type === 'magnet' ? (
                <group rotation={[0, 0, Math.PI]}>
                  <mesh geometry={assets.magnet} material={m.solid} />
                  <mesh geometry={assets.magnetTip} material={m.solid} position={[-0.28, -0.05, 0]} />
                  <mesh geometry={assets.magnetTip} material={m.solid} position={[0.28, -0.05, 0]} />
                </group>
              ) : (
                <mesh geometry={type === 'shield' ? assets.shield : assets.multiplier} material={m.solid} />
              )}
            </group>
            <mesh geometry={assets.halo} material={m.glow} />
          </group>
        );
      })}
    </group>
  );
}

function boltGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0.12, 0.5);
  s.lineTo(-0.22, -0.04);
  s.lineTo(0.0, -0.04);
  s.lineTo(-0.12, -0.5);
  s.lineTo(0.24, 0.08);
  s.lineTo(0.02, 0.08);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false });
  g.translate(0, 0, -0.05);
  return g;
}

function EnergySlot({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const bolt = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  const assets = useMemo(
    () => ({
      bolt: boltGeometry(),
      ring: new THREE.TorusGeometry(0.55, 0.04, 6, 24),
      halo: new THREE.PlaneGeometry(2.2, 2.2),
      boltMat: basic('#cfe6ff'),
      ringMat: basic(COLORS.energy),
      glow: glowMaterial(COLORS.energy, 0.8),
    }),
    [],
  );

  useFrame((state) => {
    const e = game.energyPool[index];
    const g = group.current;
    if (!g) return;
    g.visible = e.active;
    if (!e.active) return;
    const t = state.clock.elapsedTime;
    g.position.set(e.x, 1.1 + Math.sin(t * 4) * 0.15, e.z);
    if (bolt.current) bolt.current.rotation.y = t * 3;
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(t * 8) * 0.08);
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={bolt} geometry={assets.bolt} material={assets.boltMat} />
      <mesh ref={ring} geometry={assets.ring} material={assets.ringMat} />
      <mesh geometry={assets.halo} material={assets.glow} />
    </group>
  );
}

export function EnergyCells() {
  return (
    <group>
      {game.energyPool.map((_, i) => (
        <EnergySlot key={i} index={i} />
      ))}
    </group>
  );
}

export function PowerUps() {
  return (
    <group>
      {game.powerUpPool.map((_, i) => (
        <PowerUpSlot key={i} index={i} />
      ))}
    </group>
  );
}
