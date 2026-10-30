// Synthesizes all game audio (SFX + music loop) into assets/sounds/*.wav.
// Run with: node scripts/generate-sounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

// ---------- helpers ----------
const buf = (seconds) => new Float32Array(Math.ceil(seconds * SR));
const TAU = Math.PI * 2;
const square = (p) => (p % 1 < 0.5 ? 1 : -1);
const saw = (p) => 2 * (p % 1) - 1;
const tri = (p) => 1 - 4 * Math.abs((p % 1) - 0.5);

let seed = 1234567;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

/** Adds a tone with a frequency function f(t) and amplitude envelope env(t). */
function tone(out, start, dur, { f, env, wave = Math.sin, gain = 1, radians = wave === Math.sin }) {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let phase = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR;
    phase += f(t) / SR;
    const v = radians ? wave(phase * TAU) : wave(phase);
    out[s0 + i] += v * env(t, dur) * gain;
  }
}

function noiseBurst(out, start, dur, { env, gain = 1, highpass = 0 }) {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  let lp = 0;
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / SR;
    const x = noise();
    lp += (x - lp) * (1 - highpass);
    const v = highpass > 0 ? x - lp : lp;
    out[s0 + i] += v * env(t, dur) * gain;
  }
}

const expDecay = (k) => (t) => Math.exp(-t * k);
const adsr = (a, r) => (t, d) => Math.min(1, t / a) * Math.min(1, Math.max(0, (d - t) / r));

function writeWav(name, data, volume = 0.9) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const norm = peak > 0 ? volume / peak : 1;
  const pcm = Buffer.alloc(44 + data.length * 2);
  pcm.write('RIFF', 0);
  pcm.writeUInt32LE(36 + data.length * 2, 4);
  pcm.write('WAVE', 8);
  pcm.write('fmt ', 12);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20); // PCM
  pcm.writeUInt16LE(1, 22); // mono
  pcm.writeUInt32LE(SR, 24);
  pcm.writeUInt32LE(SR * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write('data', 36);
  pcm.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => {
    const s = Math.tanh(v * norm * 1.1); // soft clip
    pcm.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  });
  writeFileSync(join(OUT, `${name}.wav`), pcm);
  console.log(`  ${name}.wav  ${(pcm.length / 1024).toFixed(0)} KB`);
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

mkdirSync(OUT, { recursive: true });
console.log('Generating sounds ->', OUT);

// ---------- SFX ----------
{
  const b = buf(0.22);
  tone(b, 0, 0.22, { f: (t) => 280 + 900 * (t / 0.22), env: adsr(0.005, 0.12), wave: square, gain: 0.5 });
  tone(b, 0, 0.22, { f: (t) => 560 + 1200 * (t / 0.22), env: adsr(0.005, 0.15), gain: 0.4 });
  writeWav('jump', b, 0.6);
}
{
  const b = buf(0.3);
  noiseBurst(b, 0, 0.3, { env: adsr(0.01, 0.25), gain: 0.8, highpass: 0.6 });
  tone(b, 0, 0.3, { f: (t) => 500 - 900 * t, env: adsr(0.01, 0.2), wave: tri, gain: 0.4 });
  writeWav('slide', b, 0.5);
}
{
  const b = buf(0.12);
  noiseBurst(b, 0, 0.12, { env: (t, d) => Math.sin((Math.PI * t) / d), gain: 1, highpass: 0.85 });
  writeWav('swoosh', b, 0.35);
}
{
  const b = buf(0.22);
  tone(b, 0, 0.06, { f: () => midi(83), env: adsr(0.002, 0.01), wave: square, gain: 0.5 });
  tone(b, 0.06, 0.16, { f: () => midi(88), env: expDecay(18), wave: square, gain: 0.5 });
  writeWav('coin', b, 0.45);
}
{
  const b = buf(0.6);
  [72, 76, 79, 84, 88].forEach((n, i) =>
    tone(b, i * 0.08, 0.25, { f: () => midi(n), env: expDecay(10), wave: square, gain: 0.45 }),
  );
  tone(b, 0, 0.6, { f: (t) => 300 + 600 * t, env: adsr(0.05, 0.3), gain: 0.25 });
  writeWav('powerup', b, 0.6);
}
{
  const b = buf(0.45);
  tone(b, 0, 0.45, { f: (t) => 140 * Math.exp(-t * 6) + 40, env: expDecay(7), gain: 1.2 });
  noiseBurst(b, 0, 0.35, { env: expDecay(12), gain: 0.9 });
  tone(b, 0, 0.2, { f: () => 90, env: expDecay(20), wave: square, gain: 0.4 });
  writeWav('hit', b, 0.85);
}
{
  const b = buf(0.35);
  tone(b, 0, 0.35, { f: (t) => 600 + 400 * Math.sin(t * 60), env: expDecay(8), wave: tri, gain: 0.6 });
  noiseBurst(b, 0, 0.2, { env: expDecay(25), gain: 0.4, highpass: 0.7 });
  writeWav('shield', b, 0.6);
}
{
  const b = buf(1.1);
  [76, 72, 67, 60].forEach((n, i) =>
    tone(b, i * 0.2, 0.35, { f: (t) => midi(n) * (1 - t * 0.15), env: expDecay(5), wave: square, gain: 0.45 }),
  );
  writeWav('gameover', b, 0.6);
}
{
  const b = buf(0.06);
  tone(b, 0, 0.06, { f: () => 1400, env: expDecay(60), wave: square, gain: 0.4 });
  writeWav('click', b, 0.4);
}

{
  const b = buf(0.3);
  tone(b, 0, 0.3, { f: (t) => 600 + 1800 * t + 200 * Math.sin(t * 120), env: expDecay(9), wave: saw, gain: 0.45 });
  tone(b, 0.05, 0.25, { f: () => midi(91), env: expDecay(14), wave: square, gain: 0.25 });
  writeWav('energy', b, 0.55);
}
{
  const b = buf(1.0);
  noiseBurst(b, 0, 1.0, { env: (t, d) => Math.sin((Math.PI * t) / d) * (1 - t * 0.3), gain: 0.9, highpass: 0.7 });
  tone(b, 0, 1.0, { f: (t) => 120 + 900 * t * t, env: adsr(0.05, 0.4), wave: saw, gain: 0.5 });
  [72, 79, 84, 91].forEach((n, i) => tone(b, i * 0.06, 0.3, { f: () => midi(n), env: expDecay(9), wave: square, gain: 0.25 }));
  writeWav('sprint', b, 0.7);
}
{
  const b = buf(0.3);
  noiseBurst(b, 0, 0.3, { env: expDecay(14), gain: 1 });
  tone(b, 0, 0.18, { f: (t) => 220 - 500 * t, env: expDecay(18), wave: square, gain: 0.5 });
  writeWav('smash', b, 0.6);
}

// ---------- Music: 8 bars synthwave loop @ 112 bpm ----------
{
  const bpm = 112;
  const beat = 60 / bpm;
  const bars = 8;
  const total = bars * 4 * beat;
  const m = buf(total);
  // A minor -> F -> C -> G, two bars each
  const chords = [
    [57, 60, 64],
    [53, 57, 60],
    [48, 52, 55],
    [55, 59, 62],
  ];
  for (let bar = 0; bar < bars; bar++) {
    const ch = chords[Math.floor(bar / 2)];
    const barStart = bar * 4 * beat;
    for (let b = 0; b < 4; b++) {
      const t0 = barStart + b * beat;
      // kick
      tone(m, t0, 0.3, { f: (t) => 50 + 110 * Math.exp(-t * 30), env: expDecay(9), gain: 1.1 });
      // snare on 2 and 4
      if (b % 2 === 1) {
        noiseBurst(m, t0, 0.22, { env: expDecay(16), gain: 0.45, highpass: 0.4 });
        tone(m, t0, 0.12, { f: () => 190, env: expDecay(30), wave: tri, gain: 0.25 });
      }
      for (let e = 0; e < 2; e++) {
        const te = t0 + e * (beat / 2);
        // hats on 8ths
        noiseBurst(m, te, 0.05, { env: expDecay(70), gain: e ? 0.18 : 0.1, highpass: 0.95 });
        // bass 8ths (octave pumping)
        const root = ch[0] - 24 + (e ? 12 : 0);
        tone(m, te, beat / 2 - 0.01, { f: () => midi(root), env: adsr(0.005, 0.05), wave: saw, gain: 0.32 });
      }
      // arp 16ths
      for (let s = 0; s < 4; s++) {
        const ts = t0 + s * (beat / 4);
        const idx = (b * 4 + s) % 4;
        const note = [ch[0], ch[1], ch[2], ch[1] + 12][idx] + 12;
        tone(m, ts, beat / 4, { f: () => midi(note), env: expDecay(14), wave: square, gain: 0.09 });
      }
    }
    // pad
    for (const n of ch) {
      tone(m, barStart, 4 * beat, { f: (t) => midi(n) * (1 + 0.003 * Math.sin(t * 5)), env: adsr(0.3, 0.3), wave: saw, gain: 0.05 });
    }
  }
  writeWav('music', m, 0.75);
}
console.log('Done.');
