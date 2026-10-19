export interface MidiNote {
  id: string;
  pitch: number; // 21 (A0) to 108 (C8), standard 88-key piano
  startTime: number; // in seconds
  duration: number; // in seconds
  velocity: number; // 1 to 127
  trackId: number;
  color?: string;
}

export interface MidiTrack {
  id: number;
  name: string;
  channel: number;
  color: string;
  muted: boolean;
  solo: boolean;
  visible: boolean;
  instrument?: string;
}

export type VisualizerMode = 'cinematic' | 'pianoroll';
export type VisualizerTheme =
  | 'neon-sunset'
  | 'cyber-synth'
  | 'emerald-aurora'
  | 'golden-grand'
  | 'deep-cosmic'
  | 'rainbow-chroma'
  | 'track-colors';

export type PianoVisualTheme = 'classic-wood' | 'cinematic-neon' | 'dark-studio' | 'royal-gold';

export type PianoSoundPreset = 'concert-grand' | 'studio-bright' | 'vintage-electric';

export type AppLanguage = 'ar' | 'en';

export interface VisualizerSettings {
  mode: VisualizerMode;
  theme: VisualizerTheme;
  pianoStyle: PianoVisualTheme;
  soundPreset: PianoSoundPreset;
  speed: number; // Note falling speed (0.5 - 2.5)
  cameraAngle: number; // Perspective angle in degrees (0 = top-down, 35 = cinematic, 60 = steep)
  cameraFov: number; // Field of view
  glowIntensity: number; // 0 to 1
  bloom: boolean;
  particles: boolean;
  particleDensity: number; // 1 to 5
  keyIllumination: boolean;
  showKeyLabels: boolean;
  showMeasureLines: boolean;
  keyboardHeightRatio: number; // 0.14 to 0.25
  backgroundStyle: 'abyss' | 'stars' | 'subtle-grid' | 'vignette';
  quality: 'ultra' | 'high' | 'medium';
  noteBorderRadius: number;
}

export interface AudioTrackState {
  file: File | null;
  name: string;
  duration: number;
  audioBuffer: AudioBuffer | null;
  volume: number;
  muted: boolean;
  offsetMs: number;
}

export interface ProjectData {
  version: string;
  title: string;
  tempo: number; // BPM
  timeSignature: [number, number];
  notes: MidiNote[];
  tracks: MidiTrack[];
  visualSettings: VisualizerSettings;
  audioSyncOffsetMs: number;
}

export interface VideoExportOptions {
  resolution: '1080p' | '720p' | '4k';
  width: number;
  height: number;
  fps: 30 | 60;
  bitrateMbps: number;
  includeAudio: boolean;
  timeRange: 'all' | 'custom';
  startTime: number;
  endTime: number;
  format: 'webm' | 'mp4';
}

export const PIANO_KEYS_COUNT = 88;
export const MIDI_A0 = 21;
export const MIDI_C8 = 108;

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(pitch: number): string {
  const note = NOTE_NAMES[pitch % 12];
  const octave = Math.floor(pitch / 12) - 1;
  return `${note}${octave}`;
}

export function isBlackKey(pitch: number): boolean {
  const noteIndex = pitch % 12;
  return [1, 3, 6, 8, 10].includes(noteIndex);
}

export function getKeyIndex88(pitch: number): number {
  return pitch - 21;
}

export const COLOR_PALETTES: Record<VisualizerTheme, string[]> = {
  'neon-sunset': ['#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#c084fc', '#818cf8'],
  'cyber-synth': ['#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#0ea5e9', '#6366f1'],
  'emerald-aurora': ['#10b981', '#059669', '#34d399', '#06b6d4', '#14b8a6', '#84cc16'],
  'golden-grand': ['#f59e0b', '#d97706', '#fbbf24', '#fde68a', '#eab308', '#ca8a04'],
  'deep-cosmic': ['#a855f7', '#6366f1', '#3b82f6', '#ec4899', '#8b5cf6', '#4f46e5'],
  'rainbow-chroma': ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'],
  'track-colors': ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'],
};

export const DEFAULT_VISUAL_SETTINGS: VisualizerSettings = {
  mode: 'cinematic',
  theme: 'cyber-synth',
  pianoStyle: 'classic-wood',
  soundPreset: 'concert-grand',
  speed: 1.0,
  cameraAngle: 35,
  cameraFov: 400,
  glowIntensity: 0.85,
  bloom: true,
  particles: true,
  particleDensity: 3,
  keyIllumination: true,
  showKeyLabels: true,
  showMeasureLines: true,
  keyboardHeightRatio: 0.18,
  backgroundStyle: 'stars',
  quality: 'high',
  noteBorderRadius: 4,
};
