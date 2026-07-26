type WaveShape = OscillatorType;

export class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private crowdSource: AudioBufferSourceNode | null = null;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  private tone(freq: number, duration: number, shape: WaveShape, opts: { volume?: number; slideTo?: number; delay?: number } = {}): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(opts.slideTo, 1), t0 + duration);
    }
    const vol = opts.volume ?? 0.5;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(duration: number, opts: { volume?: number; delay?: number; lowpass?: number } = {}): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = opts.lowpass ?? 4000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.volume ?? 0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  shoot(): void {
    this.tone(320, 0.09, "sawtooth", { volume: 0.25, slideTo: 90 });
    this.noise(0.05, { volume: 0.15, lowpass: 6000 });
  }

  enemyHit(): void {
    this.tone(180, 0.07, "square", { volume: 0.18, slideTo: 60 });
  }

  enemyDeath(): void {
    this.tone(280, 0.35, "sawtooth", { volume: 0.3, slideTo: 40 });
    this.noise(0.2, { volume: 0.2, lowpass: 2500 });
  }

  playerHurt(): void {
    this.tone(140, 0.25, "square", { volume: 0.3, slideTo: 50 });
  }

  playerDeath(): void {
    this.tone(220, 1.1, "sawtooth", { volume: 0.35, slideTo: 30 });
  }

  pickup(): void {
    this.tone(520, 0.1, "sine", { volume: 0.25, delay: 0 });
    this.tone(780, 0.15, "sine", { volume: 0.25, delay: 0.08 });
  }

  waveStart(): void {
    this.tone(220, 0.18, "triangle", { volume: 0.28, delay: 0 });
    this.tone(330, 0.18, "triangle", { volume: 0.28, delay: 0.12 });
    this.tone(440, 0.28, "triangle", { volume: 0.3, delay: 0.24 });
  }

  waveClear(): void {
    this.tone(440, 0.16, "sine", { volume: 0.28, delay: 0 });
    this.tone(660, 0.16, "sine", { volume: 0.28, delay: 0.1 });
    this.tone(880, 0.3, "sine", { volume: 0.3, delay: 0.2 });
  }

  gameOver(): void {
    this.tone(300, 0.4, "sawtooth", { volume: 0.3, slideTo: 120, delay: 0 });
    this.tone(200, 0.6, "sawtooth", { volume: 0.3, slideTo: 60, delay: 0.3 });
  }

  jump(): void {
    this.tone(300, 0.12, "sine", { volume: 0.15, slideTo: 500 });
  }

  startCrowdAmbience(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.crowdSource) return;

    const duration = 5;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let walk = 0;
    for (let i = 0; i < bufferSize; i++) {
      walk += (Math.random() * 2 - 1) * 0.03;
      walk *= 0.997;
      data[i] = walk;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 450;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.14;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    this.crowdSource = src;
  }

  stopCrowdAmbience(): void {
    if (!this.crowdSource) return;
    try {
      this.crowdSource.stop();
    } catch {
      // already stopped
    }
    this.crowdSource.disconnect();
    this.crowdSource = null;
  }

  crowdCheer(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const t0 = ctx.currentTime;
    const duration = 1.6;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(300, t0);
    filter.frequency.linearRampToValueAtTime(1400, t0 + duration * 0.55);
    filter.frequency.linearRampToValueAtTime(500, t0 + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.4, t0 + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + duration + 0.05);
  }
}
