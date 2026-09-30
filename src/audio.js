// All sounds are synthesized with the Web Audio API, so there are no audio files.
// One shared instance lives across scenes and restarts so the music keeps playing.
import { VOLUME } from './config.js';

// A major pentatonic, A3 up to C#5: calm, and no two notes clash.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16].map((semitones) => 220 * 2 ** (semitones / 12));

// Chiptunes: bars of eight eighth notes, melody in semitones from A4 (null =
// rest), one bass root per bar in semitones from A2, and seconds per note.
const CHIPTUNES = {
  // Title theme: gentle. Bass A, D, F#, E.
  title: {
    melody: [
      0, 4, 7, 9, 7, 4, 0, null,
      2, 4, 2, 0, -3, null, 0, null,
      0, 4, 7, 12, 9, 7, 4, null,
      2, 4, 7, 4, 0, null, null, null,
    ],
    bass: [0, 5, -3, 7],
    step: 0.22,
  },
  // High scores: bright, bouncing arpeggios, faster. Bass A, D, E, A.
  highscore: {
    melody: [
      0, 4, 7, 12, 7, 4, 0, 4,
      5, 9, 12, 17, 12, 9, 5, 9,
      7, 11, 14, 19, 14, 11, 7, 11,
      12, 7, 4, 0, 4, 7, 12, null,
    ],
    bass: [0, 5, 7, 0],
    step: 0.14,
  },
};

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
    // (iPhones only count some events, like touchend, as that interaction.)
    const events = ['keydown', 'pointerdown', 'touchend', 'click'];
    const start = () => {
      events.forEach((event) => window.removeEventListener(event, start));
      this.start();
    };
    events.forEach((event) => window.addEventListener(event, start));
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.ctx.resume();
    if (this.wantedMusic) this.playMusic(this.wantedMusic);
  }

  toggleMute() {
    this.muted = !this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0 : VOLUME.master, this.ctx.currentTime, 0.05);
  }

  // Switch to 'title', 'highscore' or 'lake' music, fading out whatever was playing.
  // Before the player has interacted, this just remembers what to play.
  playMusic(name) {
    this.wantedMusic = name;
    if (!this.started || this.music?.name === name) return;

    if (this.music) {
      const old = this.music;
      old.stop();
      old.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      setTimeout(() => old.gain.disconnect(), 1500);
    }

    const gain = this.ctx.createGain();
    gain.connect(this.musicBus);
    const stop = CHIPTUNES[name] ? this.startChiptune(CHIPTUNES[name], gain) : this.startLakeMusic(gain);
    this.music = { name, gain, stop };
  }

  // Lapping water plus slow, random notes. Returns a function that stops it.
  startLakeMusic(out) {
    const stopWater = this.startWater(out);
    let timer;
    const scheduleNote = () => {
      const freq = SCALE[Math.floor(Math.random() * SCALE.length)];
      this.playNote(freq, out);
      if (Math.random() < 0.3) this.playNote(freq * 1.5, out); // Sometimes add a fifth above.
      timer = setTimeout(scheduleNote, 1500 + Math.random() * 2500);
    };
    scheduleNote();
    return () => {
      clearTimeout(timer);
      stopWater();
    };
  }

  // A looping chiptune: square-wave melody over a triangle bass line.
  // Notes are scheduled slightly ahead on the audio clock so timing stays tight.
  startChiptune(tune, out) {
    const { ctx } = this;
    let step = 0;
    let nextTime = ctx.currentTime + 0.1;
    let timer;
    const tick = () => {
      while (nextTime < ctx.currentTime + 0.3) {
        const melody = tune.melody[step];
        if (melody !== null) this.chipNote('square', 440 * 2 ** (melody / 12), nextTime, tune.step * 0.8, 0.07, out);
        if (step % 2 === 0) {
          const root = tune.bass[Math.floor(step / 8)];
          const octave = step % 4 === 2 ? 12 : 0;
          this.chipNote('triangle', 110 * 2 ** ((root + octave) / 12), nextTime, tune.step * 1.4, 0.18, out);
        }
        step = (step + 1) % tune.melody.length;
        nextTime += tune.step;
      }
      timer = setTimeout(tick, 100);
    };
    tick();
    return () => clearTimeout(timer);
  }

  // Fade the music out entirely (the next playMusic() call brings it back).
  stopMusic() {
    this.wantedMusic = null;
    if (!this.music) return;
    const old = this.music;
    old.stop();
    old.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    setTimeout(() => old.gain.disconnect(), 2000);
    this.music = null;
  }

  // A bald eagle's piercing, chattering scream: a high whistle that jumps up
  // and falls away, with a fast warble and a breathy edge.
  screech() {
    if (!this.started) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const length = 0.9;

    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.linearRampToValueAtTime(3200, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(1900, t + length);
    const warble = ctx.createOscillator();
    warble.frequency.value = 28;
    const warbleDepth = ctx.createGain();
    warbleDepth.gain.value = 140;
    warble.connect(warbleDepth).connect(osc.frequency);

    const breath = ctx.createBufferSource();
    breath.buffer = this.noiseBuffer;
    const breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = 3000;
    breathFilter.Q.value = 3;
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);

    osc.connect(gain);
    breath.connect(breathFilter).connect(breathGain).connect(gain);
    gain.connect(this.sfxBus);
    gain.connect(this.echo);
    osc.start(t);
    warble.start(t);
    breath.start(t, 0, length);
    osc.stop(t + length);
    warble.stop(t + length);
  }

  // A heavy whoosh for one beat of the eagle's wings.
  wingFlap() {
    if (!this.started) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.linearRampToValueAtTime(700, t + 0.12);
    filter.frequency.linearRampToValueAtTime(250, t + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    noise.connect(filter).connect(gain).connect(this.sfxBus);
    noise.start(t, Math.random() * 1.5, 0.32);
  }

  // Sparkly rising arpeggio as HP grows back.
  heal() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    [0, 4, 7, 12, 16, 19, 24].forEach((semitones, i) => {
      this.chipNote('triangle', 523 * 2 ** (semitones / 12), t + i * 0.08, 0.3, 0.14, this.sfxBus);
    });
  }

  // Short falling blip when the loon loses HP.
  hurt() {
    if (!this.started) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Slow falling arpeggio in a minor key for running out of HP.
  gameOver() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    [12, 7, 3, 0, -5].forEach((semitones, i) => {
      this.chipNote('square', 440 * 2 ** (semitones / 12), t + i * 0.22, 0.4, 0.1, this.sfxBus);
      this.chipNote('triangle', 220 * 2 ** (semitones / 12), t + i * 0.22, 0.45, 0.15, this.sfxBus);
    });
  }

  // Classic arcade coin drop: two quick rising notes.
  coin() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.chipNote('square', 988, t, 0.08, 0.1, this.sfxBus); // B5
    this.chipNote('square', 1319, t + 0.08, 0.35, 0.1, this.sfxBus); // E6
  }

  // Short arcade blip for menus, e.g. picking initials. Higher `semitones` for confirming.
  blip(semitones = 0) {
    if (!this.started) return;
    this.chipNote('square', 880 * 2 ** (semitones / 12), this.ctx.currentTime, 0.07, 0.08, this.sfxBus);
  }

  // Quick rising arpeggio for starting the game.
  startJingle() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    [0, 4, 7, 12, 16].forEach((semitones, i) => {
      this.chipNote('square', 440 * 2 ** (semitones / 12), t + i * 0.07, 0.2, 0.1, this.sfxBus);
    });
  }

  chipNote(type, freq, t, length, volume, out) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + length);
  }

  // Looping low-passed noise that slowly swells, for lapping water.
  // Returns a function that stops it.
  startWater(out) {
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

    noise.connect(filter).connect(swell).connect(out);
    noise.start();
    lfo.start();
    return () => {
      noise.stop();
      lfo.stop();
    };
  }

  playNote(freq, out) {
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
    gain.connect(out);
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

  // A splash of noise swept between two filter frequencies, for diving and surfacing.
  splash(fromFreq, toFreq, length, volume) {
    const { ctx } = this;
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(fromFreq, t);
    filter.frequency.exponentialRampToValueAtTime(toFreq, t + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + length);
    noise.connect(filter).connect(gain).connect(this.sfxBus);
    noise.start(t, Math.random() * 1.5, length);
  }

  // A low "bloop" under a splash that sinks in pitch as the loon goes under.
  dive() {
    if (!this.started) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    this.splash(1800, 300, 0.35, 0.35);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  // A rising splash as the loon pops back up.
  surface() {
    if (!this.started) return;
    this.splash(400, 2000, 0.3, 0.3);
  }

  // Out of air: a breathless gasp (a quick rising hiss) with a falling blip.
  gasp() {
    if (!this.started) return;
    this.splash(900, 3000, 0.4, 0.25);
    this.hurt();
  }

  // Snapping up a fish: a quick wet snap and a bright blip.
  chomp() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.splash(2500, 900, 0.08, 0.3);
    this.chipNote('square', 1175, t + 0.03, 0.08, 0.08, this.sfxBus);
  }

  // A deep boom for a big moment: a sine kick diving in pitch, under a burst of low noise.
  boom() {
    if (!this.started) return;
    const { ctx } = this;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.62);
    this.splash(900, 120, 0.6, 0.45);
  }

  // Victory fanfare for a perfect (3-star) level: a fast run up two octaves,
  // then a big held major chord, with a bass underneath.
  fanfare() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const run = [0, 4, 7, 12, 16, 19, 24, 28, 31, 36];
    run.forEach((semitones, i) => {
      this.chipNote('square', 262 * 2 ** (semitones / 12), t + i * 0.055, 0.12, 0.08, this.sfxBus);
    });
    const hold = t + run.length * 0.055;
    for (const semitones of [12, 16, 19, 24]) {
      this.chipNote('square', 262 * 2 ** (semitones / 12), hold, 1.4, 0.07, this.sfxBus);
      this.chipNote('triangle', 262 * 2 ** (semitones / 12), hold + 0.02, 1.6, 0.06, this.sfxBus);
    }
    this.chipNote('triangle', 65.4, hold, 1.6, 0.25, this.sfxBus);
  }

  // A shower of coin chimes over `seconds`, faster and higher as it goes,
  // like a slot machine paying out.
  coinShower(seconds = 1.8) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    let at = 0;
    let i = 0;
    while (at < seconds) {
      const progress = at / seconds;
      const pitch = 988 * 2 ** ((Math.floor(progress * 12) + (i % 2) * 5) / 12);
      this.chipNote('square', pitch, t + at, 0.06, 0.05, this.sfxBus);
      at += 0.09 - progress * 0.05; // Speeds up from about 11 to 25 chimes a second.
      i++;
    }
  }

  // A star appearing on the reunion screen; each one (0, 1, 2) a step higher.
  star(index) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const base = 660 * 2 ** ((index * 4) / 12);
    this.chipNote('square', base, t, 0.1, 0.09, this.sfxBus);
    this.chipNote('triangle', base * 2, t + 0.07, 0.3, 0.12, this.sfxBus);
  }

  // A frog's two quick croaks as it hops off its lily pad.
  ribbit() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.chipNote('square', 196, t, 0.06, 0.07, this.sfxBus);
    this.chipNote('square', 165, t + 0.09, 0.08, 0.07, this.sfxBus);
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
