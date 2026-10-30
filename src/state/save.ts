import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { DEFAULT_RUNNER, RUNNERS, TEST_UNLOCKED } from '../game/characters';
import type { Upgrades } from '../game/engine';

export interface HighScore {
  distance: number;
  coins: number;
  date: number;
}

export interface SaveData {
  coins: number;
  highScores: HighScore[];
  ownedRunners: string[];
  /** Selected runner id (stick figure color or 3D character). */
  runner: string;
  upgrades: Upgrades;
  settings: { music: boolean; sfx: boolean; haptics: boolean };
}

const KEY = 'neon-run/save/v1';
const MAX_SCORES = 10;

const DEFAULT_SAVE: SaveData = {
  coins: 0,
  highScores: [],
  ownedRunners: [DEFAULT_RUNNER.id],
  runner: DEFAULT_RUNNER.id,
  upgrades: { magnet: 0, shield: 0, multiplier: 0 },
  settings: { music: true, sfx: true, haptics: true },
};

let data: SaveData = DEFAULT_SAVE;
const listeners = new Set<() => void>();

export async function loadSave() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      // Older saves stored stick colors as `skin`/`ownedSkins` or 3D characters as `character`/`ownedCharacters`.
      const parsed = JSON.parse(raw) as Partial<SaveData> & {
        ownedSkins?: string[];
        skin?: string;
        ownedCharacters?: string[];
        character?: string;
      };
      // ownedCharacters is dropped on purpose: Fit Grandma was free then and is now a paid unlock.
      const { ownedSkins = [], skin, ownedCharacters, character, ...rest } = parsed;
      const owned = [DEFAULT_RUNNER.id, ...(rest.ownedRunners ?? []), ...ownedSkins];
      data = {
        ...DEFAULT_SAVE,
        ...rest,
        ownedRunners: [...new Set(owned)].filter((id) => RUNNERS.some((r) => r.id === id)),
        runner: rest.runner ?? character ?? skin ?? DEFAULT_RUNNER.id,
        upgrades: { ...DEFAULT_SAVE.upgrades, ...rest.upgrades },
        settings: { ...DEFAULT_SAVE.settings, ...rest.settings },
      };
      if (!isRunnerOwned(data, data.runner)) data.runner = DEFAULT_RUNNER.id;
      listeners.forEach((l) => l());
    }
  } catch (e) {
    console.warn('Failed to load save', e);
  }
}

/** Bought, or unlocked for testing via TEST_UNLOCKED. */
export function isRunnerOwned(d: SaveData, id: string) {
  return d.ownedRunners.includes(id) || TEST_UNLOCKED.includes(id);
}

export function getSave() {
  return data;
}

export function updateSave(fn: (d: SaveData) => SaveData) {
  data = fn(data);
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(data)).catch((e) => console.warn('Failed to write save', e));
}

/** Records a finished run. Returns the 0-based leaderboard rank, or -1 if it didn't place. */
export function recordRun(distance: number, coins: number) {
  const entry: HighScore = { distance: Math.floor(distance), coins, date: Date.now() };
  const scores = [...data.highScores, entry].sort((a, b) => b.distance - a.distance).slice(0, MAX_SCORES);
  updateSave((d) => ({ ...d, coins: d.coins + coins, highScores: scores }));
  return scores.indexOf(entry);
}

export function useSave() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => data,
  );
}
