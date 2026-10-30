import fitGrandma from '../../assets/models/runner.glb';
import fitGrandmaShowcase from '../../assets/models/runner-showcase.glb';
import fitGrandmaPortrait from '../../assets/portraits/fit-grandma.png';

interface RunnerBase {
  id: string;
  name: string;
  price: number;
  /** Neon color: the stick figure itself, or a 3D character's glow, fallback stick figure and shop card. */
  accent: string;
}

/** Procedural neon stick figure in a single color. */
export interface StickRunner extends RunnerBase {
  kind: 'stick';
}

/** Animated 3D character. */
export interface ModelRunner extends RunnerBase {
  kind: 'model';
  /** Bundled .glb asset (built by scripts/build-runner.mjs). */
  model: number;
  /** Skeleton-only .glb with the animation shown in the character viewer (same rig as `model`). */
  showcase: number;
  /** Pre-rendered head shot for the shop card (square PNG). */
  portrait: number;
}

export type Runner = StickRunner | ModelRunner;

/** Shown in the shop in this order; the first one is free and selected by default. */
export const RUNNERS: Runner[] = [
  { kind: 'stick', id: 'cyan', name: 'Volt', accent: '#2ef2ff', price: 0 },
  { kind: 'stick', id: 'magenta', name: 'Pulse', accent: '#ff3df0', price: 300 },
  { kind: 'stick', id: 'lime', name: 'Toxic', accent: '#9dff3a', price: 800 },
  { kind: 'stick', id: 'orange', name: 'Blaze', accent: '#ff8a1f', price: 1500 },
  { kind: 'stick', id: 'gold', name: 'Aurum', accent: '#ffd23f', price: 3000 },
  { kind: 'stick', id: 'white', name: 'Ghost', accent: '#f4f1ff', price: 5000 },
  {
    kind: 'model',
    id: 'fit-grandma',
    name: 'Fit Grandma',
    price: 10000,
    model: fitGrandma,
    showcase: fitGrandmaShowcase,
    portrait: fitGrandmaPortrait,
    accent: '#2ef2ff',
  },
];

/**
 * Runners treated as owned without buying them, for testing. Not written to the save,
 * so removing an id here locks it again for players who never bought it.
 */
export const TEST_UNLOCKED: string[] = ['fit-grandma'];

export const DEFAULT_RUNNER = RUNNERS[0];

export const getRunner = (id: string) => RUNNERS.find((r) => r.id === id) ?? DEFAULT_RUNNER;
