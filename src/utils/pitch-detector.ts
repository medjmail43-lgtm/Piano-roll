import { MidiNote, MidiTrack } from '../types';

export interface AudioToMidiResult {
  notes: MidiNote[];
  tracks: MidiTrack[];
  detectedBpm: number;
  confidenceScore: number;
  limitationsNotice: string;
}

export interface AudioToMidiEngine {
  name: string;
  transcribe(
    audioBuffer: AudioBuffer,
    onProgress?: (percent: number) => void
  ): Promise<AudioToMidiResult>;
}

/**
 * Normalized Square Difference / Autocorrelation pitch detector (YIN simplified)
 * Designed strictly for monophonic solo acoustic lines (e.g., humming, whistling, solo flute, single-finger piano).
 */
export class LocalPitchDetectionEngine implements AudioToMidiEngine {
  public name = 'Local Monophonic Pitch Tracker (Experimental)';

  public async transcribe(
    audioBuffer: AudioBuffer,
    onProgress?: (percent: number) => void
  ): Promise<AudioToMidiResult> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Mono analysis
    const notes: MidiNote[] = [];

    // Frame configuration
    const frameSize = 2048;
    const hopSize = 512;
    const totalFrames = Math.floor((channelData.length - frameSize) / hopSize);

    if (totalFrames <= 0) {
      throw new Error('Audio file too short to analyze.');
    }

    interface RawPitchFrame {
      time: number;
      midiPitch: number;
      confidence: number;
      rms: number;
    }

    const pitchFrames: RawPitchFrame[] = [];
    const minFreq = 55; // A1 (~55Hz)
    const maxFreq = 1760; // A6 (~1760Hz)
    const minPeriod = Math.floor(sampleRate / maxFreq);
    const maxPeriod = Math.floor(sampleRate / minFreq);

    // RMS threshold for silence gate
    const SILENCE_THRESHOLD = 0.02;

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (frameIdx % 50 === 0 && onProgress) {
        onProgress(Math.round((frameIdx / totalFrames) * 80));
      }

      const offset = frameIdx * hopSize;
      let sumSquares = 0;
      for (let i = 0; i < frameSize; i++) {
        const s = channelData[offset + i];
        sumSquares += s * s;
      }
      const rms = Math.sqrt(sumSquares / frameSize);

      if (rms < SILENCE_THRESHOLD) {
        continue;
      }

      // Autocorrelation over lag range [minPeriod, maxPeriod]
      let bestCorrelation = -1;
      let bestPeriod = -1;

      for (let tau = minPeriod; tau <= maxPeriod; tau++) {
        let corr = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < frameSize - tau; i++) {
          const x1 = channelData[offset + i];
          const x2 = channelData[offset + i + tau];
          corr += x1 * x2;
          norm1 += x1 * x1;
          norm2 += x2 * x2;
        }

        const denom = Math.sqrt(norm1 * norm2);
        const normCorr = denom > 0.0001 ? corr / denom : 0;

        if (normCorr > bestCorrelation) {
          bestCorrelation = normCorr;
          bestPeriod = tau;
        }
      }

      if (bestCorrelation > 0.65 && bestPeriod > 0) {
        const freq = sampleRate / bestPeriod;
        const midiPitch = Math.round(69 + 12 * Math.log2(freq / 440));
        if (midiPitch >= 21 && midiPitch <= 108) {
          pitchFrames.push({
            time: offset / sampleRate,
            midiPitch,
            confidence: bestCorrelation,
            rms,
          });
        }
      }
    }

    if (onProgress) onProgress(85);

    // Segment frames into discrete note events
    let currentPitch: number | null = null;
    let noteStartTime = 0;
    let noteDuration = 0;
    let sumVel = 0;
    let frameCount = 0;
    let noteIdCounter = 0;

    const MIN_NOTE_DURATION = 0.08; // 80ms minimum note length

    for (let i = 0; i < pitchFrames.length; i++) {
      const f = pitchFrames[i];
      const prev = i > 0 ? pitchFrames[i - 1] : null;
      const isContinuation = prev && Math.abs(f.time - prev.time) < 0.06 && f.midiPitch === currentPitch;

      if (isContinuation) {
        noteDuration = f.time + hopSize / sampleRate - noteStartTime;
        sumVel += Math.min(127, Math.max(40, Math.round(f.rms * 300)));
        frameCount++;
      } else {
        // Finalize previous note if long enough
        if (currentPitch !== null && noteDuration >= MIN_NOTE_DURATION) {
          notes.push({
            id: `transcribed-${++noteIdCounter}`,
            pitch: currentPitch,
            startTime: Number(noteStartTime.toFixed(3)),
            duration: Number(noteDuration.toFixed(3)),
            velocity: Math.min(120, Math.round(sumVel / Math.max(1, frameCount))),
            trackId: 0,
          });
        }

        currentPitch = f.midiPitch;
        noteStartTime = f.time;
        noteDuration = hopSize / sampleRate;
        sumVel = Math.min(127, Math.max(40, Math.round(f.rms * 300)));
        frameCount = 1;
      }
    }

    if (currentPitch !== null && noteDuration >= MIN_NOTE_DURATION) {
      notes.push({
        id: `transcribed-${++noteIdCounter}`,
        pitch: currentPitch,
        startTime: Number(noteStartTime.toFixed(3)),
        duration: Number(noteDuration.toFixed(3)),
        velocity: Math.min(120, Math.round(sumVel / Math.max(1, frameCount))),
        trackId: 0,
      });
    }

    if (onProgress) onProgress(100);

    const track: MidiTrack = {
      id: 0,
      name: 'Transcribed Solo Pitch',
      channel: 0,
      color: '#06b6d4',
      muted: false,
      solo: false,
      visible: true,
    };

    return {
      notes,
      tracks: [track],
      detectedBpm: 120,
      confidenceScore: notes.length > 0 ? 0.72 : 0,
      limitationsNotice:
        'This client-side pitch detector uses monophonic normalized autocorrelation. It works best on clean, single-instrument solo recordings (e.g. whistling, humming, solo flute, single-note piano). It cannot separate full multi-instrument mixes with drums, bass, and vocals.',
    };
  }
}
