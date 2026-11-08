/**
 * Procedural Web Audio Sound Synthesizer
 * Zero external audio files. 100% generated in real-time.
 */

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private soundVolume = 0.8;
  private musicVolume = 0.4;
  private isMuted = false;
  private musicTimer: number | null = null;
  private musicGainNode: GainNode | null = null;

  private constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSoundVolume(volume: number) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGainNode && this.ctx) {
      this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.15, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Play footstep sound based on surface
  public playFootstep(surface: 'grass' | 'dirt' | 'stone' | 'wood' | 'sand' | 'water' | 'cloth' | 'glass' | string) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let baseFreq = 80;
    let filterFreq = 300;
    let dur = 0.08;

    if (surface === 'grass') {
      baseFreq = 120 + Math.random() * 40;
      filterFreq = 600;
      filter.type = 'bandpass';
    } else if (surface === 'stone') {
      baseFreq = 140 + Math.random() * 60;
      filterFreq = 1200;
      filter.type = 'lowpass';
    } else if (surface === 'wood') {
      baseFreq = 110 + Math.random() * 30;
      filterFreq = 500;
      filter.type = 'lowpass';
    } else if (surface === 'sand') {
      baseFreq = 90 + Math.random() * 30;
      filterFreq = 400;
      filter.type = 'bandpass';
      dur = 0.1;
    } else if (surface === 'water') {
      this.playSplash(0.3);
      return;
    }

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + dur);

    filter.frequency.setValueAtTime(filterFreq, t);

    gain.gain.setValueAtTime(this.soundVolume * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  // Play block breaking crunch
  public playBlockBreak(type: string = 'stone') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.15;

    // Noise buffer for tactile crunchy sound
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type === 'wood' || type === 'grass' ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(type === 'glass' ? 3000 : 800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.soundVolume * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(t);
    whiteNoise.stop(t + dur);
  }

  // Play block place thud
  public playBlockPlace() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

    gain.gain.setValueAtTime(this.soundVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Jump sound
  public playJump() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

    gain.gain.setValueAtTime(this.soundVolume * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Player / mob hit sound
  public playHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.18);

    gain.gain.setValueAtTime(this.soundVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // Splash sound
  public playSplash(vol = 0.5) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.25;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.soundVolume * vol * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Eating crunch sound
  public playEat() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(300 + Math.random() * 200, t + offset);
      osc.frequency.exponentialRampToValueAtTime(100, t + offset + 0.05);

      gain.gain.setValueAtTime(this.soundVolume * 0.2, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + offset);
      osc.stop(t + offset + 0.05);
    }
  }

  // Item pickup chime
  public playPickup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.setValueAtTime(1318.5, t + 0.08); // E6

    gain.gain.setValueAtTime(this.soundVolume * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Mob sound effects
  public playMobSound(type: 'zombie' | 'skeleton' | 'cow' | 'sheep' | 'pig') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'zombie') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.linearRampToValueAtTime(75, t + 0.3);
      osc.frequency.linearRampToValueAtTime(60, t + 0.6);

      gain.gain.setValueAtTime(this.soundVolume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    } else if (type === 'cow') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.linearRampToValueAtTime(110, t + 0.4);
      osc.frequency.linearRampToValueAtTime(80, t + 0.7);

      gain.gain.setValueAtTime(this.soundVolume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.7);
    } else if (type === 'sheep') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(260, t + 0.15);
      osc.frequency.linearRampToValueAtTime(190, t + 0.45);

      gain.gain.setValueAtTime(this.soundVolume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    } else if (type === 'pig') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);

      gain.gain.setValueAtTime(this.soundVolume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } else if (type === 'skeleton') {
      // Clattering bone sound
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      gain.gain.setValueAtTime(this.soundVolume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
    }
  }

  // Ambient gentle music synth (calm Minecraft-style chords)
  public startMusic() {
    if (this.isMuted || this.musicTimer !== null) return;
    this.initContext();

    const chords = [
      [261.63, 329.63, 392.00], // C major (C4, E4, G4)
      [220.00, 261.63, 329.63], // A minor (A3, C4, E4)
      [174.61, 220.00, 261.63], // F major (F3, A3, C4)
      [196.00, 246.94, 293.66], // G major (G3, B3, D4)
    ];

    let chordIndex = 0;

    const playNextChord = () => {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const chord = chords[chordIndex % chords.length];
      chordIndex++;

      const chordGain = this.ctx.createGain();
      chordGain.gain.setValueAtTime(0.001, t);
      chordGain.gain.linearRampToValueAtTime(this.musicVolume * 0.08, t + 2.5);
      chordGain.gain.exponentialRampToValueAtTime(0.001, t + 7.5);

      chord.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.connect(chordGain);
        osc.start(t);
        osc.stop(t + 8.0);
      });

      chordGain.connect(this.ctx.destination);
    };

    playNextChord();
    this.musicTimer = window.setInterval(playNextChord, 9000);
  }

  public stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
