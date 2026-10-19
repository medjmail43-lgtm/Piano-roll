import { MidiNote, PianoSoundPreset } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  // External audio track
  private audioBufferSource: AudioBufferSourceNode | null = null;
  private audioTrackGain: GainNode | null = null;
  private externalAudioBuffer: AudioBuffer | null = null;

  // Sound preset
  private soundPreset: PianoSoundPreset = 'concert-grand';
  private activeVoices: Map<string, { stop: () => void }> = new Map();
  private isMuted: boolean = false;
  private masterVolume: number = 0.85;

  constructor() {}

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master dynamics compressor to ensure smooth, punchy, unclipped dynamics
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      // Create acoustic soundboard / hall impulse response
      this.reverbNode = this.createSyntheticReverb(this.ctx, 2.2, 1.8);

      // MediaStream destination for synchronized video export
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();

      // External audio gain
      this.audioTrackGain = this.ctx.createGain();
      this.audioTrackGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Signal routing:
      // Voice / Audio -> compressor -> dryGain -> masterGain -> destination & mediaStreamDest
      //                             -> reverbNode -> reverbGain -> masterGain
      this.compressor.connect(this.dryGain);
      this.dryGain.connect(this.masterGain);

      this.compressor.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);

      this.audioTrackGain.connect(this.masterGain);

      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.mediaStreamDest);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public setSoundPreset(preset: PianoSoundPreset): void {
    this.soundPreset = preset;
    // Adjust reverb mix based on preset
    if (this.reverbGain && this.dryGain && this.ctx) {
      if (preset === 'concert-grand') {
        this.reverbGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.05);
        this.dryGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.05);
      } else if (preset === 'studio-bright') {
        this.reverbGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.05);
        this.dryGain.gain.setTargetAtTime(0.82, this.ctx.currentTime, 0.05);
      } else if (preset === 'vintage-electric') {
        this.reverbGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.05);
        this.dryGain.gain.setTargetAtTime(0.78, this.ctx.currentTime, 0.05);
      }
    }
  }

  public getSoundPreset(): PianoSoundPreset {
    return this.soundPreset;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMediaStream(): MediaStream | null {
    if (!this.mediaStreamDest) {
      this.init();
    }
    return this.mediaStreamDest ? this.mediaStreamDest.stream : null;
  }

  private createSyntheticReverb(ctx: AudioContext, duration: number, decay: number): ConvolverNode {
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      const envelope = Math.pow(1 - n / length, decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }

    convolver.buffer = impulse;
    return convolver;
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * High-fidelity multi-sound piano synthesis:
   * 1. Concert Grand: Warm, rich harmonics, acoustic body resonance, long natural decay
   * 2. Bright Studio: Punchy attack, crystalline highs, crisp modern sound
   * 3. Vintage Electric: Rhodes-style tine tone, bell warmth, lush chorus
   */
  public triggerNote(pitch: number, velocity: number = 80, duration?: number): { stop: () => void } {
    const ctx = this.init();
    if (!this.compressor) return { stop: () => {} };

    // Standard A440 tuning formula
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const velFactor = Math.pow(Math.max(1, Math.min(127, velocity)) / 127, 1.15);
    const startTime = ctx.currentTime;

    // Stereo Panning across 88 keys (-0.55 on bass to +0.55 on treble)
    const panVal = Math.max(-0.55, Math.min(0.55, ((pitch - 21) / 88) * 1.1 - 0.55));
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(panVal, startTime);
    }

    const voiceGain = ctx.createGain();
    const peakGain = 0.32 * velFactor;

    // Fast acoustic strike attack
    voiceGain.gain.setValueAtTime(0, startTime);
    voiceGain.gain.linearRampToValueAtTime(peakGain, startTime + (this.soundPreset === 'vintage-electric' ? 0.008 : 0.003));

    // Natural piano decay curve: low bass notes sustain longer than high treble notes
    const baseDecay = Math.max(0.8, Math.min(7.0, 5.2 * Math.pow(261.63 / freq, 0.38)));
    const decayDuration = duration !== undefined ? Math.min(duration, baseDecay) : baseDecay;

    voiceGain.gain.setTargetAtTime(peakGain * 0.28, startTime + 0.04, decayDuration * 0.35);

    const oscillators: OscillatorNode[] = [];

    // Distinct harmonic profiles for each sound preset
    if (this.soundPreset === 'concert-grand') {
      // Warm, rich concert grand piano
      const harmonics = [
        { mult: 1.0, type: 'sine' as OscillatorType, gain: 1.0, decay: 1.0, detune: (Math.random() - 0.5) * 2 },
        { mult: 2.0, type: 'triangle' as OscillatorType, gain: 0.45 * velFactor, decay: 0.85, detune: (Math.random() - 0.5) * 3 },
        { mult: 3.0, type: 'sine' as OscillatorType, gain: 0.22 * velFactor, decay: 0.65, detune: (Math.random() - 0.5) * 4 },
        { mult: 4.0, type: 'sine' as OscillatorType, gain: 0.12 * velFactor, decay: 0.45, detune: (Math.random() - 0.5) * 5 },
      ];

      harmonics.forEach((h) => {
        const osc = ctx.createOscillator();
        const hGain = ctx.createGain();
        osc.type = h.type;
        osc.frequency.setValueAtTime(freq * h.mult, startTime);
        osc.detune.setValueAtTime(h.detune, startTime);

        hGain.gain.setValueAtTime(h.gain, startTime);
        hGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDuration * h.decay + 0.1);

        osc.connect(hGain);
        hGain.connect(voiceGain);
        osc.start(startTime);
        oscillators.push(osc);
      });

      // Warm acoustic soundboard low-mid resonance
      const bodyFilter = ctx.createBiquadFilter();
      bodyFilter.type = 'peaking';
      bodyFilter.frequency.setValueAtTime(180, startTime);
      bodyFilter.Q.setValueAtTime(1.5, startTime);
      bodyFilter.gain.setValueAtTime(2.5, startTime);
      voiceGain.connect(bodyFilter);
      if (panner) bodyFilter.connect(panner);
      else bodyFilter.connect(this.compressor);

    } else if (this.soundPreset === 'studio-bright') {
      // Crisp, punchy studio piano
      const harmonics = [
        { mult: 1.0, type: 'sine' as OscillatorType, gain: 0.9, decay: 0.95 },
        { mult: 2.0, type: 'triangle' as OscillatorType, gain: 0.65 * velFactor, decay: 0.85 },
        { mult: 3.0, type: 'triangle' as OscillatorType, gain: 0.40 * velFactor, decay: 0.70 },
        { mult: 4.0, type: 'sine' as OscillatorType, gain: 0.28 * velFactor, decay: 0.55 },
        { mult: 5.0, type: 'sine' as OscillatorType, gain: 0.18 * velFactor, decay: 0.40 },
      ];

      harmonics.forEach((h) => {
        const osc = ctx.createOscillator();
        const hGain = ctx.createGain();
        osc.type = h.type;
        osc.frequency.setValueAtTime(freq * h.mult, startTime);

        hGain.gain.setValueAtTime(h.gain, startTime);
        hGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDuration * h.decay + 0.1);

        osc.connect(hGain);
        hGain.connect(voiceGain);
        osc.start(startTime);
        oscillators.push(osc);
      });

      // High-shelf boost for sparkling clarity
      const highShelf = ctx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.setValueAtTime(3200, startTime);
      highShelf.gain.setValueAtTime(3.5, startTime);
      voiceGain.connect(highShelf);
      if (panner) highShelf.connect(panner);
      else highShelf.connect(this.compressor);

    } else {
      // Vintage Electric Rhodes / Tine Piano
      const harmonics = [
        { mult: 1.0, type: 'sine' as OscillatorType, gain: 1.0, decay: 1.2 },
        { mult: 2.0, type: 'sine' as OscillatorType, gain: 0.35 * velFactor, decay: 0.9 },
        { mult: 4.0, type: 'sine' as OscillatorType, gain: 0.55 * velFactor, decay: 0.5 }, // Bell tine overtone
        { mult: 7.0, type: 'sine' as OscillatorType, gain: 0.20 * velFactor, decay: 0.3 }, // High chime
      ];

      harmonics.forEach((h) => {
        const osc = ctx.createOscillator();
        const hGain = ctx.createGain();
        osc.type = h.type;
        osc.frequency.setValueAtTime(freq * h.mult, startTime);

        // Subtle chorus pitch wobble for lush electric vibe
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(2.5, startTime);
        lfoGain.gain.setValueAtTime(3.0, startTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.detune);
        lfo.start(startTime);
        oscillators.push(lfo);

        hGain.gain.setValueAtTime(h.gain, startTime);
        hGain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDuration * h.decay + 0.1);

        osc.connect(hGain);
        hGain.connect(voiceGain);
        osc.start(startTime);
        oscillators.push(osc);
      });

      if (panner) voiceGain.connect(panner);
      else voiceGain.connect(this.compressor);
    }

    // Connect panner to compressor
    if (panner && this.soundPreset === 'vintage-electric') {
      panner.connect(this.compressor);
    } else if (panner && this.soundPreset !== 'concert-grand' && this.soundPreset !== 'studio-bright') {
      panner.connect(this.compressor);
    }

    // Hammer Strike Transient (short filtered noise burst for acoustic impact)
    if (this.soundPreset !== 'vintage-electric') {
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.0035));
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(Math.min(7500, freq * 2.2 + 350), startTime);
      noiseFilter.Q.setValueAtTime(2.2, startTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.14 * velFactor, startTime);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.compressor);
      noiseSource.start(startTime);
    }

    const stop = () => {
      const releaseTime = ctx.currentTime;
      voiceGain.gain.cancelScheduledValues(releaseTime);
      voiceGain.gain.setValueAtTime(voiceGain.gain.value, releaseTime);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, releaseTime + 0.15);
      setTimeout(() => {
        oscillators.forEach((o) => {
          try {
            o.stop();
            o.disconnect();
          } catch {
            // ignore
          }
        });
        voiceGain.disconnect();
      }, 180);
    };

    if (duration) {
      setTimeout(stop, duration * 1000);
    }

    return { stop };
  }

  public playNoteAt(pitch: number, velocity: number, duration: number): void {
    this.triggerNote(pitch, velocity, duration);
  }

  // Load external audio file
  public async loadAudioFile(file: File): Promise<AudioBuffer> {
    const ctx = this.init();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.externalAudioBuffer = audioBuffer;
    return audioBuffer;
  }

  public setExternalAudioBuffer(buffer: AudioBuffer | null): void {
    this.externalAudioBuffer = buffer;
  }

  public startExternalAudio(startTimeSeconds: number, offsetMs: number = 0): void {
    this.stopExternalAudio();
    if (!this.externalAudioBuffer || !this.ctx || !this.audioTrackGain) return;

    const audioOffsetSec = offsetMs / 1000;
    const playheadInAudio = startTimeSeconds - audioOffsetSec;

    if (playheadInAudio >= this.externalAudioBuffer.duration) return;

    this.audioBufferSource = this.ctx.createBufferSource();
    this.audioBufferSource.buffer = this.externalAudioBuffer;
    this.audioBufferSource.connect(this.audioTrackGain);

    if (playheadInAudio >= 0) {
      this.audioBufferSource.start(0, playheadInAudio);
    } else {
      const delayUntilStart = -playheadInAudio;
      this.audioBufferSource.start(this.ctx.currentTime + delayUntilStart, 0);
    }
  }

  public stopExternalAudio(): void {
    if (this.audioBufferSource) {
      try {
        this.audioBufferSource.stop();
        this.audioBufferSource.disconnect();
      } catch {
        // ignore
      }
      this.audioBufferSource = null;
    }
  }

  public setAudioTrackVolume(vol: number): void {
    if (this.audioTrackGain && this.ctx) {
      this.audioTrackGain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.02);
    }
  }

  public stopAll(): void {
    this.stopExternalAudio();
    this.activeVoices.forEach((voice) => voice.stop());
    this.activeVoices.clear();
  }
}

export const globalAudioEngine = new AudioEngine();
