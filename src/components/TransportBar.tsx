import React from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sliders,
} from 'lucide-react';
import { AudioTrackState, PianoSoundPreset, PianoVisualTheme, AppLanguage } from '../types';

interface TransportBarProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  tempo: number;
  speedMultiplier: number;
  isLooping: boolean;
  masterVolume: number;
  isMuted: boolean;
  audioTrack: AudioTrackState;
  isFullscreen: boolean;
  soundPreset: PianoSoundPreset;
  pianoStyle: PianoVisualTheme;
  lang: AppLanguage;
  onPlayToggle: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onTempoChange: (bpm: number) => void;
  onSpeedChange: (speed: number) => void;
  onLoopToggle: () => void;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onAudioOffsetChange: (offsetMs: number) => void;
  onFullscreenToggle: () => void;
  onSoundPresetChange: (p: PianoSoundPreset) => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  currentTime,
  totalDuration,
  tempo,
  speedMultiplier,
  isLooping,
  masterVolume,
  isMuted,
  audioTrack,
  isFullscreen,
  soundPreset,
  pianoStyle,
  lang,
  onPlayToggle,
  onStop,
  onRestart,
  onSeek,
  onTempoChange,
  onSpeedChange,
  onLoopToggle,
  onVolumeChange,
  onMuteToggle,
  onAudioOffsetChange,
  onFullscreenToggle,
  onSoundPresetChange,
}) => {
  const isAr = lang === 'ar';

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const secondsPerBeat = 60 / (tempo || 120);
  const totalBeats = Math.floor(currentTime / secondsPerBeat);
  const currentBar = Math.floor(totalBeats / 4) + 1;
  const currentBeat = (totalBeats % 4) + 1;

  return (
    <footer className="h-16 bg-[#0c0d14] border-t border-neutral-800 flex items-center justify-between px-3 sm:px-6 select-none shrink-0 gap-3 sm:gap-6">
      {/* 1. Playback Engine Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onRestart}
          className="p-2 sm:p-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title={isAr ? 'البداية (Home)' : 'Return to Start (Home)'}
        >
          <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>

        <button
          onClick={onStop}
          className="p-2 sm:p-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title={isAr ? 'إيقاف' : 'Stop'}
        >
          <Square className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>

        <button
          onClick={onPlayToggle}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 flex items-center justify-center shadow-lg shadow-cyan-950/60 transition-all active:scale-95 cursor-pointer"
          title={isPlaying ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل' : 'Play')}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white fill-white" />
          ) : (
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={onLoopToggle}
          className={`p-2 sm:p-2.5 rounded-lg transition-colors ${
            isLooping
              ? 'bg-neutral-800 text-cyan-400 font-semibold'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
          title={isAr ? 'تكرار التشغيل' : 'Toggle Loop'}
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Timeline Scrubber & Counter */}
      <div className="flex-1 flex items-center gap-2 sm:gap-4 max-w-2xl min-w-0">
        <div className="font-mono text-[11px] sm:text-xs text-neutral-300 tabular-nums shrink-0 flex items-center gap-1">
          <span className="text-white font-medium">{formatTime(currentTime)}</span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-500 hidden sm:inline">{formatTime(totalDuration)}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[11px] font-mono text-cyan-400 tabular-nums shrink-0">
          <span>{isAr ? `مازورة ${currentBar}` : `Bar ${currentBar}`}</span>
          <span className="text-neutral-600">:</span>
          <span>{isAr ? `نغمة ${currentBeat}` : `Beat ${currentBeat}`}</span>
        </div>

        <div className="flex-1 relative flex items-center min-w-[80px]">
          <input
            type="range"
            min={0}
            max={Math.max(1, totalDuration)}
            step={0.05}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-1.5 sm:h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* 3. Tempo, Speed, Audio Sync, Volume, Fullscreen */}
      <div className="flex items-center gap-2 sm:gap-4 text-xs text-neutral-400 shrink-0">
        {/* Tempo */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-neutral-500 font-mono">BPM:</span>
          <input
            type="number"
            min={30}
            max={300}
            value={tempo}
            onChange={(e) => onTempoChange(Math.max(30, Math.min(300, Number(e.target.value))))}
            className="w-13 bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-mono tabular-nums rounded px-1.5 py-0.5 text-center outline-none"
          />
        </div>

        {/* Speed */}
        <div className="hidden xl:flex items-center gap-1">
          <span className="text-neutral-500">{isAr ? 'السرعة:' : 'Speed:'}</span>
          <select
            value={speedMultiplier}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded px-1.5 py-0.5 outline-none cursor-pointer"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onMuteToggle}
            className="text-neutral-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || masterVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : masterVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="hidden sm:block w-14 sm:w-18 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-cyan-400"
            title="Master Volume"
          />
        </div>

        {/* Fullscreen */}
        <button
          onClick={onFullscreenToggle}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </footer>
  );
};
