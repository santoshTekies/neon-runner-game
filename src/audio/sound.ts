import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { getSave } from '../state/save';

const SOURCES = {
  jump: require('../../assets/sounds/jump.wav'),
  slide: require('../../assets/sounds/slide.wav'),
  swoosh: require('../../assets/sounds/swoosh.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  powerup: require('../../assets/sounds/powerup.wav'),
  energy: require('../../assets/sounds/energy.wav'),
  sprint: require('../../assets/sounds/sprint.wav'),
  smash: require('../../assets/sounds/smash.wav'),
  hit: require('../../assets/sounds/hit.wav'),
  shield: require('../../assets/sounds/shield.wav'),
  gameover: require('../../assets/sounds/gameover.wav'),
  click: require('../../assets/sounds/click.wav'),
};

export type SoundName = keyof typeof SOURCES;

/** Several players per sound so rapid repeats (coins) can overlap. */
const VOICES: Partial<Record<SoundName, number>> = { coin: 3, swoosh: 2, smash: 2 };
const VOLUME: Partial<Record<SoundName, number>> = { coin: 0.5, swoosh: 0.6, click: 0.6 };

const players: Partial<Record<SoundName, { list: AudioPlayer[]; next: number }>> = {};
let music: AudioPlayer | null = null;
let musicWanted = false;

export async function initAudio() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
  } catch (e) {
    console.warn('Audio mode failed', e);
  }
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    const list = Array.from({ length: VOICES[name] ?? 1 }, () => {
      const p = createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME[name] ?? 1;
      return p;
    });
    players[name] = { list, next: 0 };
  }
  music = createAudioPlayer(require('../../assets/sounds/music.wav'));
  music.loop = true;
  music.volume = 0.45;
  syncMusic();
}

export function playSound(name: SoundName) {
  if (!getSave().settings.sfx) return;
  const entry = players[name];
  if (!entry) return;
  const p = entry.list[entry.next];
  entry.next = (entry.next + 1) % entry.list.length;
  p.seekTo(0).catch(() => {});
  p.play();
}

export function setMusicPlaying(playing: boolean) {
  musicWanted = playing;
  syncMusic();
}

/** Applies the current music setting; call after toggling it. */
export function syncMusic() {
  if (!music) return;
  if (musicWanted && getSave().settings.music) music.play();
  else music.pause();
}

export function haptic(kind: 'light' | 'heavy' | 'success') {
  if (!getSave().settings.haptics) return;
  const run =
    kind === 'success'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  run.catch(() => {});
}
