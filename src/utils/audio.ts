class SoundEffects {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.noiseBuf) {
      const length = this.ctx.sampleRate * 1.5;
      const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        // Warm pink-ish noise blend
        lastOut = (lastOut + 0.08 * white) / 1.08;
        data[i] = lastOut * 2.4 + white * 0.35;
      }
      this.noiseBuf = buf;
    }
    return this.ctx;
  }

  public playFootstep(onConcrete: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuf) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.setValueAtTime(
      (onConcrete ? 1.35 : 0.85) + (Math.random() - 0.5) * 0.16,
      now
    );

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(onConcrete ? 780 : 380, now);
    filter.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now, Math.random() * 0.8, 0.07);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(245, now + 0.11);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLand(heavyImpact: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuf) return;
    const now = ctx.currentTime;

    // Sub thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavyImpact ? 110 : 85, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + (heavyImpact ? 0.28 : 0.12));

    oscGain.gain.setValueAtTime(heavyImpact ? 0.26 : 0.1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + (heavyImpact ? 0.3 : 0.13));

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (heavyImpact ? 0.31 : 0.14));

    if (heavyImpact) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.18, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      src.start(now, 0.1, 0.25);
    }
  }

  public playScavenge(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuf) return;
    const now = ctx.currentTime;

    // Filtered scrape + dual metallic clink
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.09, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    src.start(now, Math.random() * 0.5, 0.15);

    [560, 740].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 50, now + i * 0.055);
      osc.frequency.exponentialRampToValueAtTime(240, now + i * 0.055 + 0.09);

      gain.gain.setValueAtTime(0.11, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.11);
    });
  }

  public playLoreTerminal(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const tones = [980, 1320, 1180, 1560];
    tones.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);
      gain.gain.setValueAtTime(0.09, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.09);
    });
  }

  public playRareFind(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [523.25, 659.25, 880, 1046.5];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.075);
      gain.gain.setValueAtTime(0.13, now + idx * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.075 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.3);
    });
  }

  public playBuild(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.24);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playConsume(type: 'food' | 'water'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    if (type === 'water') {
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(610, now + 0.14);
    } else {
      osc.frequency.setValueAtTime(270, now);
      osc.frequency.exponentialRampToValueAtTime(375, now + 0.12);
    }

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playGeigerClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1450 + Math.random() * 650, now);
    gain.gain.setValueAtTime(0.042, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.018);
  }

  public playWeatherRumble(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuf) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.setValueAtTime(0.45, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(190, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now, 0, 1.4);
  }

  public playFlareLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuf) return;
    const now = ctx.currentTime;

    // Rocket roar noise + ascending whistle
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(1850, now + 0.9);
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.22, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    src.start(now, 0, 1.0);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.88);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.94);
  }
}

export const soundFX = new SoundEffects();
