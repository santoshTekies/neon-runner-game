import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { CHARACTERS, DEFAULT_CHARACTER } from '../game/characters';
import type { Upgrades } from '../game/engine';

export interface HighScore {
  distance: number;
  coins: number;
  date: number;
}

export interface SaveData {
  coins: number;
  highScores: HighScore[];
  ownedCharacters: string[];
  character: string;
  upgrades: Upgrades;
  settings: { music: boolean; sfx: boolean; haptics: boolean };
}

const KEY = 'neon-run/save/v1';
const MAX_SCORES = 10;

const DEFAULT_SAVE: SaveData = {
  coins: 0,
  highScores: [],
  ownedCharacters: [DEFAULT_CHARACTER.id],
  character: DEFAULT_CHARACTER.id,
  upgrades: { magnet: 0, shield: 0, multiplier: 0 },
  settings: { music: true, sfx: true, haptics: true },
};

let data: SaveData = DEFAULT_SAVE;
const listeners = new Set<() => void>();

export async function loadSave() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      data = {
        ...DEFAULT_SAVE,
        ...parsed,
        upgrades: { ...DEFAULT_SAVE.upgrades, ...parsed.upgrades },
        settings: { ...DEFAULT_SAVE.settings, ...parsed.settings },
      };
      // Drop characters that no longer exist (and fall back if the selected one is gone).
      data.ownedCharacters = [...new Set([DEFAULT_CHARACTER.id, ...data.ownedCharacters])].filter((id) =>
        CHARACTERS.some((c) => c.id === id),
      );
      if (!data.ownedCharacters.includes(data.character)) data.character = DEFAULT_CHARACTER.id;
      listeners.forEach((l) => l());
    }
  } catch (e) {
    console.warn('Failed to load save', e);
  }
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
