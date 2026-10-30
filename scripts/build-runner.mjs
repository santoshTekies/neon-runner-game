// Builds the character's .glb files from the Mixamo FBX files in assets/3d-models:
//   assets/models/runner.glb           mesh + skeleton + gameplay clips (loaded at startup)
//   assets/models/runner-showcase.glb  skeleton + animations for the shop's character viewer
//                                      (no mesh; loaded only when the viewer opens)
// Run with: node scripts/build-runner.mjs
//
// - Takes the character mesh + skeleton from the base FBX.
// - Pulls one animation from each FBX, renames it, trims it and strips root motion
//   (the game moves the runner; animations must play in place).
// - Re-attaches the embedded textures, downscaled for mobile.
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, resample } from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets', '3d-models');
const OUT = path.join(ROOT, 'assets', 'models', 'runner.glb');
const SHOWCASE_OUT = path.join(ROOT, 'assets', 'models', 'runner-showcase.glb');
const FPS = 30;
const MAX_TEXTURE = 1024;
const HIPS = 'mixamorigHips';

/** Which FBX provides each clip. Times are in seconds of the source clip. */
const BASE = 'Running.fbx';
const CLIPS = [
  { file: 'Running.fbx', name: 'Run' },
  // The game's physics does the actual lift, so flatten the hips' vertical motion.
  { file: 'Jump.fbx', name: 'Jump', to: 0.73, lockY: true },
  // Drop + hold, skipping the slow get-up at the end.
  { file: 'Running Slide.fbx', name: 'Slide', from: 0.07, to: 1.2 },
  { file: 'Jogging Stumble.fbx', name: 'Hit' },
  { file: 'Dying Backwards.fbx', name: 'Death', to: 2.5 },
];

/** Character viewer animation (loops in place on the pedestal). */
const SHOWCASE_CLIPS = [{ file: 'Idle.fbx', name: 'Idle' }];

// ---------- minimal browser shims for three's FBXLoader / GLTFExporter in Node ----------
const blobs = new Map();
globalThis.self = globalThis;
URL.createObjectURL = (blob) => {
  const url = `blob:fbx/${blobs.size}`;
  blobs.set(url, blob);
  return url;
};
globalThis.document = {
  createElementNS: () => {
    const listeners = {};
    const img = {
      style: {},
      width: 1,
      height: 1,
      addEventListener: (type, fn) => (listeners[type] = fn),
      removeEventListener: () => {},
      setAttribute: () => {},
    };
    Object.defineProperty(img, 'src', {
      get: () => img._src,
      set: (v) => {
        img._src = v;
        queueMicrotask(() => listeners.load?.call(img));
      },
    });
    return img;
  },
};
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((r) => {
      this.result = r;
      this.onloadend?.();
    });
  }
};

// ---------- helpers ----------
function loadFbx(file) {
  const buf = fs.readFileSync(path.join(SRC, file));
  return new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
}

function prepareClip(source, { name, from, to, lockY }) {
  const raw = source.animations.find((a) => a.duration > 0 && a.tracks.length > 0);
  if (!raw) throw new Error(`No animation found for ${name}`);
  // Resample every track at FPS over [from, to]. Unlike AnimationUtils.subclip this keeps
  // bones whose only keyframe lies before `from`, and includes the end frame so loops close.
  const t0 = from ?? 0;
  const frames = Math.round(((to ?? raw.duration) - t0) * FPS);
  const times = Float32Array.from({ length: frames + 1 }, (_, i) => i / FPS);
  const tracks = raw.tracks.map((track) => {
    const size = track.getValueSize();
    const interpolant = track.createInterpolant();
    const values = new Float32Array(times.length * size);
    times.forEach((t, i) => values.set(interpolant.evaluate(Math.min(raw.duration, t0 + t)), i * size));
    return new track.constructor(track.name, times, values);
  });
  const clip = new THREE.AnimationClip(name, times[times.length - 1], tracks);

  const hips = clip.tracks.find((t) => t.name === `${HIPS}.position`);
  if (hips) {
    const v = hips.values;
    const [x0, y0, z0] = [v[0], v[1], v[2]];
    for (let i = 0; i < v.length; i += 3) {
      v[i] = x0;
      v[i + 2] = z0;
      if (lockY) v[i + 1] = y0;
    }
  }
  // Only the hips should translate; other position/scale tracks are redundant on a Mixamo rig.
  clip.tracks = clip.tracks.filter((t) => t.name.endsWith('.quaternion') || t.name === `${HIPS}.position`);
  return clip;
}

/**
 * FBXLoader builds one nested copy of the skeleton per skinned mesh. Point every skin at the
 * animated copy and drop the rest, so bone names are unique and external clips bind by name.
 * The copies sit exactly on top of each other, so inverse bind matrices stay valid.
 */
function mergeSkeletons(doc) {
  const root = doc.getRoot();
  const animatedHips = root
    .listAnimations()
    .flatMap((a) => a.listChannels())
    .map((c) => c.getTargetNode())
    .find((n) => n?.getName() === HIPS);
  if (!animatedHips) throw new Error('No animated hips bone found');

  const canonical = new Map([[HIPS, animatedHips]]);
  const queue = [animatedHips];
  while (queue.length) {
    for (const child of queue.shift().listChildren()) {
      if (canonical.has(child.getName())) continue; // a nested duplicate
      canonical.set(child.getName(), child);
      queue.push(child);
    }
  }

  for (const skin of root.listSkins()) {
    const joints = skin.listJoints();
    joints.forEach((j) => skin.removeJoint(j));
    for (const j of joints) {
      const c = canonical.get(j.getName());
      if (!c) throw new Error(`No canonical bone for ${j.getName()}`);
      skin.addJoint(c);
    }
    skin.setSkeleton(animatedHips);
  }

  let removed = 0;
  for (const node of root.listNodes()) {
    if (canonical.has(node.getName()) && canonical.get(node.getName()) !== node) {
      node.dispose();
      removed++;
    }
  }
  // Keep the single skeleton directly under the scene.
  const scene = root.listScenes()[0];
  animatedHips.getParentNode()?.removeChild(animatedHips);
  scene.addChild(animatedHips);
  for (const n of [...scene.listChildren()]) if (!n.getMesh() && n !== animatedHips && n.listChildren().length === 0) n.dispose();
  console.log(`  merged skeletons: ${canonical.size} bones kept, ${removed} duplicates removed`);
}

async function shrink(blob) {
  const input = Buffer.from(await blob.arrayBuffer());
  const png = blob.type === 'image/png';
  // FBX UVs assume a bottom-up image (three's flipY = true); glTF reads images top-down.
  // GLTFExporter normally bakes this flip, but textures are attached here, so flip them ourselves.
  const img = sharp(input).flip().resize(MAX_TEXTURE, MAX_TEXTURE, { fit: 'inside', withoutEnlargement: true });
  return { data: png ? await img.png().toBuffer() : await img.jpeg({ quality: 85 }).toBuffer(), mime: png ? 'image/png' : 'image/jpeg' };
}

// ---------- build ----------
console.log('Loading base model', BASE);
const model = loadFbx(BASE);
await new Promise((r) => setTimeout(r, 0)); // let stubbed images "load"

const textures = new Map(); // material name -> blob
model.traverse((o) => {
  if (!o.isMesh) return;
  const mats = [].concat(o.material).map((m) => {
    const src = m.map?.image?.src;
    if (src && blobs.has(src)) textures.set(m.name, blobs.get(src));
    // Textures are re-attached after export; normal maps are dropped (the game uses simple lighting).
    return new THREE.MeshStandardMaterial({
      name: m.name,
      color: m.color,
      roughness: 0.85,
      metalness: 0,
      transparent: m.transparent,
      opacity: m.opacity,
      side: m.side,
    });
  });
  o.material = Array.isArray(o.material) ? mats : mats[0];
});

const clips = CLIPS.map((c) => {
  const clip = prepareClip(c.file === BASE ? model : loadFbx(c.file), c);
  console.log(`  ${clip.name.padEnd(6)} ${clip.duration.toFixed(2)}s  ${clip.tracks.length} tracks  <- ${c.file}`);
  return clip;
});
model.animations = [];

console.log('Exporting GLB...');
const glb = await new GLTFExporter().parseAsync(model, { binary: true, animations: clips, onlyVisible: false });

const io = new NodeIO();
const doc = await io.readBinary(new Uint8Array(glb));
mergeSkeletons(doc);
for (const material of doc.getRoot().listMaterials()) {
  const blob = textures.get(material.getName());
  if (!blob) continue;
  const { data, mime } = await shrink(blob);
  const tex = doc.createTexture(material.getName()).setImage(new Uint8Array(data)).setMimeType(mime);
  material.setBaseColorTexture(tex).setBaseColorFactor([1, 1, 1, material.getBaseColorFactor()[3]]);
  // Face features (eyes, brows, mouth) are cut-outs from a shared PNG atlas.
  if (mime === 'image/png') material.setAlphaMode('MASK').setAlphaCutoff(0.5);
  console.log(`  texture ${material.getName()} ${(data.length / 1024).toFixed(0)} KB`);
}
await doc.transform(dedup(), resample(), prune());

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = await io.writeBinary(doc);
fs.writeFileSync(OUT, out);
console.log(`Wrote ${path.relative(ROOT, OUT)} (${(out.length / 1024 / 1024).toFixed(2)} MB)`);

// ---------- showcase animations (skeleton only) ----------
console.log('Building showcase animations');
const sources = SHOWCASE_CLIPS.map((c) => ({ config: c, fbx: loadFbx(c.file) }));
const skeleton = sources[0].fbx;
// Source files may include the character mesh ("With Skin"); the showcase file only needs bones.
const meshes = [];
skeleton.traverse((o) => o.isMesh && meshes.push(o));
meshes.forEach((m) => m.removeFromParent());
const showcaseClips = sources.map(({ config, fbx }) => {
  const clip = prepareClip(fbx, config);
  console.log(`  ${clip.name.padEnd(14)} ${clip.duration.toFixed(2)}s  <- ${config.file}`);
  return clip;
});
skeleton.animations = [];
const showcaseGlb = await new GLTFExporter().parseAsync(skeleton, { binary: true, animations: showcaseClips, onlyVisible: false });
const showcaseDoc = await io.readBinary(new Uint8Array(showcaseGlb));
// keepLeaves: bones without children (finger tips, head top) are still animation targets.
await showcaseDoc.transform(dedup(), resample(), prune({ keepLeaves: true }));
const showcaseOut = await io.writeBinary(showcaseDoc);
fs.writeFileSync(SHOWCASE_OUT, showcaseOut);
console.log(`Wrote ${path.relative(ROOT, SHOWCASE_OUT)} (${(showcaseOut.length / 1024 / 1024).toFixed(2)} MB)`);
