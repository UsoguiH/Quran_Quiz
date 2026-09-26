// Tiny WebAudio synth: every sound effect and the ambient music are
// generated procedurally, so the game ships without audio assets.
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.6;
    this.musicVolume = 0.35;
    this.musicMode = null;
    this._musicTimer = 0;
    this._noise = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicVolume;
    // simple reverb-ish feedback delay for music
    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = 0.33;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.35;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    this.musicBus.connect(this.master);
    this.musicBus.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    lp.connect(this.master);

    const len = this.ctx.sampleRate * 1.0;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noise = buf;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicBus) this.musicBus.gain.value = v;
  }

  _env(gain, t, a, peak, dcy) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
  }

  tone(freq, dur = 0.15, type = 'sine', vol = 0.2, slide = 0, delay = 0, bus = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    this._env(g, t, 0.005, vol, dur);
    o.connect(g);
    g.connect(bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur = 0.2, freq = 1200, q = 1, vol = 0.3, type = 'bandpass', slideTo = null, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    this._env(g, t, 0.01, vol, dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'swing':
        this.noise(0.18, 900, 0.8, 0.25, 'bandpass', 3000);
        break;
      case 'heavySwing':
        this.noise(0.32, 400, 0.7, 0.35, 'bandpass', 1600);
        break;
      case 'hit':
        this.tone(160, 0.12, 'triangle', 0.35, -90);
        this.noise(0.08, 2500, 1.5, 0.25);
        break;
      case 'crit':
        this.tone(220, 0.15, 'square', 0.18, -140);
        this.noise(0.12, 3500, 1.2, 0.3);
        break;
      case 'bowDraw':
        this.noise(0.4, 600, 4, 0.08, 'bandpass', 1400);
        break;
      case 'bowShoot':
        this.tone(420, 0.1, 'triangle', 0.15, -250);
        this.noise(0.12, 2500, 2, 0.2, 'highpass');
        break;
      case 'hurt':
        this.tone(200, 0.25, 'sawtooth', 0.2, -120);
        this.noise(0.15, 800, 1, 0.25);
        break;
      case 'roll':
        this.noise(0.28, 300, 0.8, 0.3, 'lowpass', 1200);
        break;
      case 'block':
        this.tone(900, 0.12, 'square', 0.12, -400);
        this.tone(1300, 0.18, 'triangle', 0.1, -300);
        break;
      case 'coin':
        this.tone(1320, 0.08, 'square', 0.08);
        this.tone(1980, 0.22, 'square', 0.08, 0, 0.07);
        break;
      case 'sale':
        [880, 1109, 1319, 1760].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.14, 0, i * 0.07));
        break;
      case 'pickup':
        this.tone(660, 0.08, 'sine', 0.18, 300);
        this.tone(990, 0.12, 'sine', 0.12, 200, 0.05);
        break;
      case 'click':
        this.tone(700, 0.04, 'triangle', 0.1);
        break;
      case 'open':
        this.tone(330, 0.2, 'triangle', 0.15, 160);
        this.noise(0.2, 500, 1, 0.1);
        break;
      case 'door':
        this.noise(0.35, 250, 1, 0.3, 'lowpass', 120);
        this.tone(110, 0.3, 'sine', 0.2, -30);
        break;
      case 'slime':
        this.tone(240, 0.16, 'sine', 0.22, 260);
        break;
      case 'slam':
        this.tone(70, 0.5, 'sine', 0.55, -40);
        this.noise(0.5, 180, 0.7, 0.5, 'lowpass', 60);
        break;
      case 'shoot':
        this.tone(600, 0.2, 'sine', 0.12, -350);
        break;
      case 'die':
        this.tone(300, 0.4, 'triangle', 0.2, -250);
        this.noise(0.3, 1500, 0.8, 0.2, 'bandpass', 300);
        break;
      case 'chest':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14, 0, i * 0.09));
        break;
      case 'portal':
        this.tone(220, 1.2, 'sine', 0.2, 660);
        this.tone(330, 1.2, 'sine', 0.12, 990, 0.1);
        break;
      case 'drink':
        [0, 0.12, 0.24].forEach((d) => this.tone(380, 0.1, 'sine', 0.15, 180, d));
        break;
      case 'angry':
        this.tone(180, 0.3, 'sawtooth', 0.1, -60);
        break;
      case 'happy':
        this.tone(784, 0.12, 'sine', 0.12, 0);
        this.tone(1046, 0.18, 'sine', 0.12, 0, 0.1);
        break;
      case 'bell':
        [1568, 2093].forEach((f, i) => this.tone(f, 0.8, 'sine', 0.1, 0, i * 0.12));
        break;
      case 'error':
        this.tone(160, 0.15, 'square', 0.1, 0);
        this.tone(120, 0.2, 'square', 0.1, 0, 0.12);
        break;
      case 'levelup':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.13, 0, i * 0.1));
        break;
    }
  }

  // Generative ambient music: soft pentatonic plucks over a drone.
  setMusic(mode) {
    this.musicMode = mode;
  }

  update(dt) {
    if (!this.ctx || !this.musicMode) return;
    this._musicTimer -= dt;
    if (this._musicTimer > 0) return;
    const modes = {
      day: { scale: [0, 2, 4, 7, 9, 12, 14, 16], root: 392, gap: [0.45, 1.1], wave: 'triangle', vol: 0.07 },
      night: { scale: [0, 3, 5, 7, 10, 12, 15], root: 293.66, gap: [0.8, 1.8], wave: 'sine', vol: 0.08 },
      shop: { scale: [0, 2, 4, 5, 7, 9, 11, 12], root: 349.23, gap: [0.35, 0.8], wave: 'triangle', vol: 0.06 },
      dungeon: { scale: [0, 1, 5, 7, 8, 12], root: 146.83, gap: [1.2, 2.6], wave: 'sine', vol: 0.11 },
      boss: { scale: [0, 1, 3, 6, 7], root: 110, gap: [0.22, 0.35], wave: 'sawtooth', vol: 0.05 },
    };
    const m = modes[this.musicMode];
    if (!m) return;
    const n = m.scale[(Math.random() * m.scale.length) | 0];
    const f = m.root * Math.pow(2, n / 12);
    this.tone(f, 1.4, m.wave, m.vol, 0, 0, this.musicBus);
    if (Math.random() < 0.3) this.tone(f / 2, 2.2, 'sine', m.vol * 0.8, 0, 0, this.musicBus);
    this._musicTimer = m.gap[0] + Math.random() * (m.gap[1] - m.gap[0]);
  }
}
