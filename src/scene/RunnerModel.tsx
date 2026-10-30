import { useFrame, useLoader } from '@react-three/fiber/native';
import { Component, ReactNode, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GRAVITY, JUMP_VELOCITY, LANES, SLIDE_TIME } from '../game/config';
import { game } from '../game/engine';
import { createCharacterModel } from './characterModel';

const FADE = 0.12;
const AIR_TIME = (2 * JUMP_VELOCITY) / GRAVITY;
const HIT_SPEED = 1.4;

type ClipName = 'Run' | 'Jump' | 'Slide' | 'Hit' | 'Death';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Owns the loaded model and decides which animation clip plays from the game state. */
class RunnerRig {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: ClipName | null = null;
  private hitTimer = 0;

  constructor(gltf: GLTF) {
    const model = createCharacterModel(gltf);
    model.rotation.y = Math.PI; // Models face +z; the runner heads into the screen (-z).
    this.root.add(model);

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
  }

  onHit() {
    const clip = this.actions.get('Hit')?.getClip();
    if (clip) this.hitTimer = clip.duration / HIT_SPEED;
  }

  private play(name: ClipName, timeScale: number, once: boolean) {
    const next = this.actions.get(name);
    if (!next) return;
    next.timeScale = timeScale;
    if (this.current === name) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.play();
    const prev = this.current ? this.actions.get(this.current) : null;
    if (prev) next.crossFadeFrom(prev, FADE, false);
    this.current = name;
  }

  private duration(name: ClipName) {
    return this.actions.get(name)?.getClip().duration ?? 1;
  }

  update(dt: number) {
    const p = game.player;
    this.root.rotation.z = lerp(this.root.rotation.z, (p.x - LANES[p.lane]) * 0.25, Math.min(1, dt * 18));
    if (game.status === 'paused') return;

    this.hitTimer = Math.max(0, this.hitTimer - dt);
    if (game.status === 'dead') this.play('Death', 1, true);
    else if (p.y > 0.01) this.play('Jump', this.duration('Jump') / AIR_TIME, true);
    else if (p.slideTimer > 0) this.play('Slide', this.duration('Slide') / SLIDE_TIME, true);
    else if (this.hitTimer > 0) this.play('Hit', HIT_SPEED, true);
    else {
      const run = game.status === 'idle' ? 0.9 : (1.15 + game.difficulty * 0.7) * (game.sprinting ? 1.35 : 1);
      this.play('Run', run, false);
    }
    this.mixer.update(dt);
  }
}

export function RunnerModel({ model, onReady }: { model: number; onReady: () => void }) {
  const gltf = useLoader(GLTFLoader, model as unknown as string);
  const rig = useMemo(() => new RunnerRig(gltf), [gltf]);

  useEffect(() => game.on((e) => e === 'hit' && rig.onHit()), [rig]);
  useEffect(onReady, [onReady]);

  useFrame((_, dt) => rig.update(dt));

  return <primitive object={rig.root} />;
}

/** If the model fails to load (e.g. a texture issue on device), keep the built-in stick figure. */
export class ModelErrorBoundary extends Component<{ children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Runner model failed to load, using stick figure', error);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
