import fitGrandma from '../../assets/models/runner.glb';
import fitGrandmaShowcase from '../../assets/models/runner-showcase.glb';
import fitGrandmaPortrait from '../../assets/portraits/fit-grandma.png';

export interface Character {
  id: string;
  name: string;
  price: number;
  /** Bundled .glb asset (built by scripts/build-runner.mjs). */
  model: number;
  /** Skeleton-only .glb with the animations shown in the character viewer (same rig as `model`). */
  showcase: number;
  /** Pre-rendered head shot for the shop card (square PNG). */
  portrait: number;
  /** Neon accent used for the runner's glow, the fallback stick figure and the shop card. */
  accent: string;
}

/** Add new characters here; the first one is free and selected by default. */
export const CHARACTERS: Character[] = [
  {
    id: 'fit-grandma',
    name: 'Fit Grandma',
    price: 0,
    model: fitGrandma,
     showcase: fitGrandmaShowcase,
    portrait: fitGrandmaPortrait,
    accent: '#2ef2ff',
  },
];

export const DEFAULT_CHARACTER = CHARACTERS[0];

export const getCharacter = (id: string) => CHARACTERS.find((c) => c.id === id) ?? DEFAULT_CHARACTER;
