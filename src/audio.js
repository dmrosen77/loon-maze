// All sounds are synthesized with the Web Audio API, so there are no audio files.
// One shared instance lives across scene restarts so the music keeps playing.
import { VOLUME } from './config.js';

// A major pentatonic, A3 up to C#5: calm, and no two notes clash.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16].map((semitones) => 220 * 2 ** (semitones / 12));

let instance = null;

export function getLakeAudio(scene) {
  const ctx = scene.sound.context;
  if (!ctx) return null; // Browser without Web Audio: play silently.
  if (!instance) instance = new LakeAudio(ctx);
  return instance;
}

class LakeAudio {
  constructor(ctx) {
    this.ctx = ctx;
    this.started = false;
    this.muted = false;

    this.master = ctx.createGain();
    this.master.gain.value = VOLUME.master;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = VOLUME.music;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = VOLUME.sfx;
    this.sfxBus.connect(this.master);

    // Two seconds of white noise, shared by the water loop and paddle strokes.
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.strokeSide = 1;

    // Echo on the music notes, like sound carrying over a still lake.
    this.echo = ctx.createDelay();
    this.echo.delayTime.value = 0.45;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    this.echo.connect(feedback).connect(this.echo);
    this.echo.connect(this.musicBus);

    // Browsers only allow audio after the player interacts with the page.
    const start = () => {
      window.removeEventListener('keydown', start);
      window.removeEventListener('pointerdown', start);
      this.start();
    };
    window.addEventListener('keydown', start);
    window.addEventListener('pointerdown', start);
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.ctx.resume();
    this.startWater();
    this.scheduleNote();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0 : VOLUME.master, this.ctx.currentTime, 0.05);
  }

  // Looping low-passed noise that slowly swells, for lapping water.
  startWater() {
    const { ctx } = this;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const swell = ctx.createGain();
    swell.gain.value = 0.15;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.08;
    lfo.connect(lfoDepth).connect(swell.gain);

    noise.connect(filter).connect(swell).connect(this.musicBus);
    noise.start();
    lfo.start();
  }

  // Plays a soft note, then schedules the next one at a random interval.
  scheduleNote() {
    const freq = SCALE[Math.floor(Math.random() * SCALE.length)];
    this.playNote(freq);
    if (Math.random() < 0.3) this.playNote(freq * 1.5); // Sometimes add a fifth above.
    setTimeout(() => this.scheduleNote(), 1500 + Math.random() * 2500);
  }

  playNote(freq) {
    const { ctx } = this;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 4);

    osc.connect(gain);
    gain.connect(this.musicBus);
    gain.connect(this.echo);
    osc.start(t);
    osc.stop(t + 4);
  }

  // One paddle stroke: a short swish of noise that sweeps upward in pitch.
  // Strokes alternate slightly left and right, like two feet paddling.
  paddle() {
    if (!this.started) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const length = 0.25;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.5;
    const pitch = 0.85 + Math.random() * 0.3; // Vary each stroke a little.
    filter.frequency.setValueAtTime(500 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(1400 * pitch, t + length);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);

    const pan = ctx.createStereoPanner();
    pan.pan.value = 0.3 * this.strokeSide;
    this.strokeSide *= -1;

    // Start at a random point in the buffer so strokes don't sound identical.
    noise.connect(filter).connect(gain).connect(pan).connect(this.sfxBus);
    noise.start(t, Math.random() * 1.5, length);
  }

  // Soft thud for swimming into the reeds.
  bump() {
    if (!this.started) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // The parent's wail, then the baby's higher, shorter reply.
  reunite() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.wail(t, [[523, 0], [784, 0.5], [784, 1.2], [698, 1.6]], 1.9, 0.35);
    this.wail(t + 2, [[1047, 0], [1175, 0.3], [1109, 0.6]], 0.8, 0.2);
  }

  // Sine glide through [frequency, time offset] points, with vibrato.
  wail(t, points, length, volume) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    points.forEach(([freq, offset], i) => {
      if (i === 0) osc.frequency.setValueAtTime(freq, t);
      else osc.frequency.linearRampToValueAtTime(freq, t + offset);
    });

    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.value = 8;
    vibrato.connect(vibratoDepth).connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.15);
    gain.gain.setValueAtTime(volume, t + length - 0.3);
    gain.gain.linearRampToValueAtTime(0, t + length);

    osc.connect(gain);
    gain.connect(this.sfxBus);
    gain.connect(this.echo);
    osc.start(t);
    vibrato.start(t);
    osc.stop(t + length);
    vibrato.stop(t + length);
  }
}
