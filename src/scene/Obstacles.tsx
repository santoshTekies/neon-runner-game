import { useFrame } from '@react-three/fiber/native';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLORS, LANES, ObstacleType } from '../game/config';
import { game } from '../game/engine';
import { HIDDEN, basic, unitBox } from './materials';

type Vec3 = [number, number, number];
interface Part {
  pos: Vec3;
  size: Vec3;
  rotZ?: number;
}
interface PartGroup {
  color: string;
  opacity?: number;
  additive?: boolean;
  parts: Part[];
}

const CRATE = { w: 1.8, h: 2.2, e: 0.07 };
const crateDiagonal = Math.hypot(CRATE.w, CRATE.h);
const crateAngle = Math.atan2(CRATE.w, CRATE.h);

const crateEdges: Part[] = [];
for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) {
    crateEdges.push({ pos: [(sx * CRATE.w) / 2, CRATE.h / 2, (sz * CRATE.w) / 2], size: [CRATE.e, CRATE.h, CRATE.e] });
  }
}
for (const y of [CRATE.e / 2, CRATE.h]) {
  for (const s of [-1, 1]) {
    crateEdges.push({ pos: [0, y, (s * CRATE.w) / 2], size: [CRATE.w, CRATE.e, CRATE.e] });
    crateEdges.push({ pos: [(s * CRATE.w) / 2, y, 0], size: [CRATE.e, CRATE.e, CRATE.w] });
  }
}
// "X" across the face that looks at the player.
for (const s of [-1, 1]) {
  crateEdges.push({ pos: [0, CRATE.h / 2, CRATE.w / 2 + 0.01], size: [0.06, crateDiagonal, 0.04], rotZ: s * crateAngle });
}

const DESIGNS: Record<ObstacleType, PartGroup[]> = {
  hurdle: [
    {
      color: COLORS.hurdle,
      parts: [
        { pos: [-0.85, 0.45, 0], size: [0.08, 0.9, 0.08] },
        { pos: [0.85, 0.45, 0], size: [0.08, 0.9, 0.08] },
        { pos: [0, 0.85, 0], size: [1.85, 0.12, 0.1] },
        { pos: [0, 0.55, 0], size: [1.7, 0.04, 0.04] },
        { pos: [-0.85, 0.02, 0], size: [0.1, 0.04, 0.55] },
        { pos: [0.85, 0.02, 0], size: [0.1, 0.04, 0.55] },
      ],
    },
    { color: COLORS.hurdle, opacity: 0.25, additive: true, parts: [{ pos: [0, 0.85, 0], size: [2.05, 0.4, 0.3] }] },
  ],
  barrier: [
    { color: '#2a1000', opacity: 0.85, parts: [{ pos: [0, 1.35, 0], size: [1.9, 0.55, 0.05] }] },
    {
      color: COLORS.barrier,
      parts: [
        { pos: [-1.0, 0.825, 0], size: [0.1, 1.65, 0.1] },
        { pos: [1.0, 0.825, 0], size: [0.1, 1.65, 0.1] },
        { pos: [0, 1.63, 0], size: [2.0, 0.07, 0.1] },
        { pos: [0, 1.07, 0], size: [2.0, 0.07, 0.1] },
        ...[-0.6, -0.2, 0.2, 0.6].map((x): Part => ({ pos: [x, 1.35, 0.04], size: [0.07, 0.6, 0.04], rotZ: 0.6 })),
      ],
    },
    { color: COLORS.barrier, opacity: 0.2, additive: true, parts: [{ pos: [0, 1.35, 0], size: [2.3, 0.85, 0.3] }] },
  ],
  block: [
    { color: '#150628', parts: [{ pos: [0, CRATE.h / 2, 0], size: [CRATE.w - 0.02, CRATE.h - 0.02, CRATE.w - 0.02] }] },
    { color: COLORS.block, parts: crateEdges },
    { color: COLORS.block, opacity: 0.12, additive: true, parts: [{ pos: [0, CRATE.h / 2, 0], size: [CRATE.w + 0.35, CRATE.h + 0.35, CRATE.w + 0.35] }] },
  ],
};

const base = new THREE.Matrix4();
const out = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const one = new THREE.Vector3(1, 1, 1);
const scl = new THREE.Vector3();

function PartGroupMesh({ type, group }: { type: ObstacleType; group: PartGroup }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pool = game.obstacles[type];

  const { material, partMatrices } = useMemo(
    () => ({
      material: basic(group.color, { opacity: group.opacity, additive: group.additive }),
      partMatrices: group.parts.map((p) =>
        new THREE.Matrix4().compose(
          new THREE.Vector3(...p.pos),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, p.rotZ ?? 0)),
          new THREE.Vector3(...p.size),
        ),
      ),
    }),
    [group],
  );

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const n = partMatrices.length;
    pool.forEach((o, i) => {
      const visible = o.active && o.hitT < 0.7;
      if (!visible) {
        for (let j = 0; j < n; j++) mesh.setMatrixAt(i * n + j, HIDDEN);
        return;
      }
      if (o.hitT >= 0) {
        // Knocked away: fly up, spin and shrink.
        const t = o.hitT;
        pos.set(LANES[o.lane] + t * 3, t * 7 - t * t * 6, o.z - t * 4);
        quat.setFromEuler(euler.set(-t * 9, t * 4, t * 6));
        base.compose(pos, quat, scl.setScalar(Math.max(0.01, 1 - t * 1.3)));
      } else {
        pos.set(LANES[o.lane], 0, o.z);
        base.compose(pos, quat.identity(), one);
      }
      for (let j = 0; j < n; j++) mesh.setMatrixAt(i * n + j, out.multiplyMatrices(base, partMatrices[j]));
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[unitBox, material, pool.length * partMatrices.length]} frustumCulled={false} />;
}

export function Obstacles() {
  return (
    <group>
      {(Object.keys(DESIGNS) as ObstacleType[]).flatMap((type) =>
        DESIGNS[type].map((group, i) => <PartGroupMesh key={`${type}-${i}`} type={type} group={group} />),
      )}
    </group>
  );
}
