import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MidiNote,
  MidiTrack,
  VisualizerSettings,
  VisualizerMode,
  AudioTrackState,
  ProjectData,
  VideoExportOptions,
  PianoSoundPreset,
  PianoVisualTheme,
  AppLanguage,
  DEFAULT_VISUAL_SETTINGS,
} from './types';
import { parseMidiFile } from './utils/midi-parser';
import { downloadMidiFile } from './utils/midi-exporter';
import { globalAudioEngine } from './utils/audio-engine';
import { DEMO_SONGS, DemoSong } from './utils/demo-songs';
import {
  saveProjectToJson,
  downloadProjectFile,
  loadProjectFromFile,
  saveToLocalStorage,
  loadFromLocalStorage,
} from './utils/project-manager';
import { downloadStandaloneApp } from './utils/standalone-bundle';
import { VideoExporter, ExportProgress } from './utils/video-exporter';
import { AudioToMidiResult } from './utils/pitch-detector';

// Components
import { TopToolbar } from './components/TopToolbar';
import { CinematicVisualizer } from './components/CinematicVisualizer';
import { PianoRollEditor } from './components/PianoRollEditor';
import { TransportBar } from './components/TransportBar';
import { ExportVideoModal } from './components/ExportVideoModal';
import { SettingsModal } from './components/SettingsModal';
import { TrackManagerModal } from './components/TrackManagerModal';
import { AudioToMidiModal } from './components/AudioToMidiModal';
import { TutorialModal } from './components/TutorialModal';
import { HeroUploadModal } from './components/HeroUploadModal';

export default function App() {
  const defaultDemo = DEMO_SONGS[0];

  // Language state (defaulting to Arabic as requested by user)
  const [lang, setLang] = useState<AppLanguage>('ar');

  // Main Project State
  const [project, setProject] = useState<ProjectData>(() => {
    const saved = loadFromLocalStorage();
    if (saved && saved.notes && saved.notes.length > 0) {
      return saved;
    }
    return {
      version: '1.0.0',
      title: defaultDemo.title,
      tempo: defaultDemo.bpm,
      timeSignature: defaultDemo.timeSignature,
      notes: defaultDemo.notes,
      tracks: defaultDemo.tracks,
      visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
      audioSyncOffsetMs: 0,
    };
  });

  // Keep AudioEngine synchronized with chosen sound model
  useEffect(() => {
    globalAudioEngine.setSoundPreset(project.visualSettings.soundPreset || 'concert-grand');
  }, [project.visualSettings.soundPreset]);

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<ProjectData[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectData[]>([]);

  // Playback & Timing
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [masterVolume, setMasterVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeTrackId, setActiveTrackId] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Audio Backing Track
  const [audioTrack, setAudioTrack] = useState<AudioTrackState>({
    file: null,
    name: '',
    duration: 0,
    audioBuffer: null,
    volume: 1.0,
    muted: false,
    offsetMs: 0,
  });

  // Modals
  const [isHeroUploadOpen, setIsHeroUploadOpen] = useState<boolean>(false);
  const [isExportVideoOpen, setIsExportVideoOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isTrackManagerOpen, setIsTrackManagerOpen] = useState<boolean>(false);
  const [isAudioToMidiOpen, setIsAudioToMidiOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  // Video Export Execution
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const videoExporterRef = useRef<VideoExporter>(new VideoExporter());

  // Refs for animation loop
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isExportingRef = useRef<boolean>(false);

  currentTimeRef.current = currentTime;
  isPlayingRef.current = isPlaying;

  const totalDuration = React.useMemo(() => {
    let max = 0;
    project.notes.forEach((n) => {
      const end = n.startTime + n.duration;
      if (end > max) max = end;
    });
    if (audioTrack.audioBuffer) {
      max = Math.max(max, audioTrack.duration + audioTrack.offsetMs / 1000);
    }
    return Math.max(6, Math.ceil(max + 1));
  }, [project.notes, audioTrack.audioBuffer, audioTrack.duration, audioTrack.offsetMs]);

  const recordHistory = useCallback((currentProj: ProjectData) => {
    setUndoStack((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(currentProj))]);
    setRedoStack([]);
  }, []);

  useEffect(() => {
    saveToLocalStorage(project);
  }, [project]);

  // Playback Loop
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = now;
      }
      const deltaSec = ((now - lastTimestampRef.current) / 1000) * speedMultiplier;
      lastTimestampRef.current = now;

      if (isPlayingRef.current) {
        const prev = currentTimeRef.current;
        let next = prev + deltaSec;

        if (next >= totalDuration) {
          if (isLooping) {
            next = 0;
            globalAudioEngine.startExternalAudio(0, audioTrack.offsetMs);
          } else {
            next = totalDuration;
            setIsPlaying(false);
            globalAudioEngine.stopAll();
          }
        }

        const trkMap = new Map<number, MidiTrack>();
        project.tracks.forEach((t) => trkMap.set(t.id, t));
        const hasSolo = project.tracks.some((t) => t.solo);

        project.notes.forEach((n) => {
          const trk = trkMap.get(n.trackId);
          const isAudible = trk ? (!trk.muted && (!hasSolo || trk.solo)) : true;

          if (isAudible && prev < n.startTime && next >= n.startTime) {
            globalAudioEngine.triggerNote(n.pitch, n.velocity, n.duration);
          }
        });

        setCurrentTime(next);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [
    speedMultiplier,
    totalDuration,
    isLooping,
    project.notes,
    project.tracks,
    audioTrack.offsetMs,
  ]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.code === 'Home') {
        e.preventDefault();
        handleRestart();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  });

  const handlePlayToggle = () => {
    globalAudioEngine.init();
    if (!isPlaying) {
      lastTimestampRef.current = performance.now();
      setIsPlaying(true);
      globalAudioEngine.startExternalAudio(currentTime, audioTrack.offsetMs);
    } else {
      setIsPlaying(false);
      globalAudioEngine.stopAll();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    globalAudioEngine.stopAll();
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (isPlaying) {
      globalAudioEngine.stopAll();
      globalAudioEngine.startExternalAudio(0, audioTrack.offsetMs);
      lastTimestampRef.current = performance.now();
    }
  };

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, time));
    setCurrentTime(clamped);
    if (isPlaying) {
      globalAudioEngine.stopAll();
      globalAudioEngine.startExternalAudio(clamped, audioTrack.offsetMs);
      lastTimestampRef.current = performance.now();
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(project))]);
    setUndoStack((prev) => prev.slice(0, -1));
    setProject(last);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(project))]);
    setRedoStack((prev) => prev.slice(0, -1));
    setProject(next);
  };

  const handleKeyPlay = (pitch: number, velocity: number = 80) => {
    globalAudioEngine.triggerNote(pitch, velocity, 0.8);
  };

  const handleNotesChange = (newNotes: MidiNote[], record: boolean = false) => {
    if (record) recordHistory(project);
    setProject((prev) => ({ ...prev, notes: newNotes }));
  };

  // Import MIDI
  const handleImportMidi = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseMidiFile(buffer, file.name);

      recordHistory(project);
      setProject((prev) => ({
        ...prev,
        title: parsed.title,
        tempo: parsed.bpm,
        timeSignature: parsed.timeSignature,
        tracks: parsed.tracks,
        notes: parsed.notes,
      }));

      setCurrentTime(0);
      setIsPlaying(false);
      globalAudioEngine.stopAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse MIDI file';
      alert(`Could not parse MIDI file: ${msg}`);
    }
  };

  // Import Audio
  const handleImportAudio = async (file: File) => {
    try {
      const buffer = await globalAudioEngine.loadAudioFile(file);
      setAudioTrack({
        file,
        name: file.name,
        duration: buffer.duration,
        audioBuffer: buffer,
        volume: 1.0,
        muted: false,
        offsetMs: 0,
      });
      alert(lang === 'ar' ? `تم تحميل الملف الصوتي "${file.name}" بنجاح` : `Loaded audio track "${file.name}" successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decode audio';
      alert(`Could not load audio file: ${msg}`);
    }
  };

  // Transcribe Complete Callback (from Hero Box)
  const handleTranscribeComplete = (
    transcribedNotes: MidiNote[],
    transcribedTracks: MidiTrack[],
    title: string,
    audioFile?: File,
    audioBuffer?: AudioBuffer
  ) => {
    recordHistory(project);
    setProject((prev) => ({
      ...prev,
      title,
      notes: transcribedNotes,
      tracks: transcribedTracks,
      visualSettings: {
        ...prev.visualSettings,
        mode: 'cinematic',
      },
    }));

    if (audioFile && audioBuffer) {
      globalAudioEngine.setExternalAudioBuffer(audioBuffer);
      setAudioTrack({
        file: audioFile,
        name: audioFile.name,
        duration: audioBuffer.duration,
        audioBuffer,
        volume: 1.0,
        muted: false,
        offsetMs: 0,
      });
    }

    setCurrentTime(0);
    // Start auto-playback with the new transcribed notes!
    setTimeout(() => {
      globalAudioEngine.init();
      lastTimestampRef.current = performance.now();
      setIsPlaying(true);
    }, 200);
  };

  const handleExportMidi = () => {
    downloadMidiFile(
      project.notes,
      project.tracks,
      project.tempo,
      project.timeSignature,
      `${project.title || 'PianoVision_Export'}.mid`
    );
  };

  const handleNewProject = () => {
    const confirmMsg = lang === 'ar' ? 'إنشاء مشروع جديد فارغ؟ سيتم مسح التغييرات غير المحفوظة.' : 'Create new empty project?';
    if (confirm(confirmMsg)) {
      recordHistory(project);
      setProject({
        version: '1.0.0',
        title: lang === 'ar' ? 'مشروع بيانو جديد' : 'New Piano Composition',
        tempo: 120,
        timeSignature: [4, 4],
        notes: [],
        tracks: [
          {
            id: 0,
            name: 'Grand Piano',
            channel: 0,
            color: '#f59e0b',
            muted: false,
            solo: false,
            visible: true,
          },
        ],
        visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
        audioSyncOffsetMs: 0,
      });
      setCurrentTime(0);
      setIsPlaying(false);
      globalAudioEngine.stopAll();
    }
  };

  const handleOpenProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.pianovision';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        try {
          const loaded = await loadProjectFromFile(target.files[0]);
          recordHistory(project);
          setProject(loaded);
          setCurrentTime(0);
          setIsPlaying(false);
          globalAudioEngine.stopAll();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Invalid project JSON';
          alert(`Failed to load project: ${msg}`);
        }
      }
    };
    input.click();
  };

  const handleSaveProject = () => {
    downloadProjectFile(project);
  };

  const handleSelectDemoSong = (demo: DemoSong) => {
    recordHistory(project);
    setProject((prev) => ({
      ...prev,
      title: demo.title,
      tempo: demo.bpm,
      timeSignature: demo.timeSignature,
      tracks: demo.tracks,
      notes: demo.notes,
    }));
    setCurrentTime(0);
    setIsPlaying(false);
    globalAudioEngine.stopAll();
  };

  // Video Export Execution
  const handleStartVideoExport = async (options: VideoExportOptions) => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) {
      alert('Visualizer canvas is not ready.');
      return;
    }

    globalAudioEngine.init();
    const audioStream = globalAudioEngine.getMediaStream();

    isExportingRef.current = true;
    setCurrentTime(options.startTime);
    setIsPlaying(true);
    globalAudioEngine.startExternalAudio(options.startTime, audioTrack.offsetMs);
    lastTimestampRef.current = performance.now();

    try {
      const exporter = videoExporterRef.current;
      await exporter.exportVideo(canvas, audioStream, options, (prog) => {
        setExportProgress(prog);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Recording failed';
      alert(`Export error: ${msg}`);
    } finally {
      isExportingRef.current = false;
      setIsPlaying(false);
      globalAudioEngine.stopAll();
    }
  };

  const handleCancelVideoExport = () => {
    videoExporterRef.current.cancel();
    setIsPlaying(false);
    globalAudioEngine.stopAll();
    setExportProgress(null);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
            handleImportMidi(file);
          } else {
            setIsHeroUploadOpen(true);
          }
        }
      }}
      className="flex flex-col h-screen w-screen overflow-hidden bg-[#08080a] text-neutral-100 font-sans select-none"
    >
      {/* 1. Top Navigation Toolbar */}
      <TopToolbar
        projectTitle={project.title}
        mode={project.visualSettings.mode}
        soundPreset={project.visualSettings.soundPreset || 'concert-grand'}
        pianoStyle={project.visualSettings.pianoStyle || 'classic-wood'}
        lang={lang}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onTitleChange={(title) => setProject((p) => ({ ...p, title }))}
        onModeChange={(mode) =>
          setProject((p) => ({
            ...p,
            visualSettings: { ...p.visualSettings, mode },
          }))
        }
        onSoundPresetChange={(soundPreset) => {
          setProject((p) => ({
            ...p,
            visualSettings: { ...p.visualSettings, soundPreset },
          }));
          globalAudioEngine.setSoundPreset(soundPreset);
          // Play preview note
          globalAudioEngine.triggerNote(60, 90, 0.8);
        }}
        onPianoStyleChange={(pianoStyle) =>
          setProject((p) => ({
            ...p,
            visualSettings: { ...p.visualSettings, pianoStyle },
          }))
        }
        onToggleLang={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onImportMidi={handleImportMidi}
        onImportAudio={handleImportAudio}
        onExportMidi={handleExportMidi}
        onOpenExportVideo={() => {
          setExportProgress(null);
          setIsExportVideoOpen(true);
        }}
        onOpenTrackManager={() => setIsTrackManagerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenHeroUpload={() => setIsHeroUploadOpen(true)}
        onDownloadStandalone={downloadStandaloneApp}
        onSelectDemoSong={handleSelectDemoSong}
      />

      {/* 2. Central Visualization Workspace */}
      <main className="flex-1 relative overflow-hidden bg-neutral-950">
        {project.visualSettings.mode === 'cinematic' ? (
          <CinematicVisualizer
            canvasRef={visualizerCanvasRef}
            notes={project.notes}
            tracks={project.tracks}
            currentTime={currentTime}
            totalDuration={totalDuration}
            settings={project.visualSettings}
            onSeek={handleSeek}
            onKeyPlay={handleKeyPlay}
          />
        ) : (
          <PianoRollEditor
            notes={project.notes}
            tracks={project.tracks}
            currentTime={currentTime}
            totalDuration={totalDuration}
            tempo={project.tempo}
            activeTrackId={activeTrackId}
            onNotesChange={handleNotesChange}
            onSeek={handleSeek}
            onKeyPlay={handleKeyPlay}
          />
        )}
      </main>

      {/* 3. Transport Control Bar */}
      <TransportBar
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        tempo={project.tempo}
        speedMultiplier={speedMultiplier}
        isLooping={isLooping}
        masterVolume={masterVolume}
        isMuted={isMuted}
        audioTrack={audioTrack}
        isFullscreen={isFullscreen}
        soundPreset={project.visualSettings.soundPreset || 'concert-grand'}
        pianoStyle={project.visualSettings.pianoStyle || 'classic-wood'}
        lang={lang}
        onPlayToggle={handlePlayToggle}
        onStop={handleStop}
        onRestart={handleRestart}
        onSeek={handleSeek}
        onTempoChange={(bpm) => setProject((p) => ({ ...p, tempo: bpm }))}
        onSpeedChange={setSpeedMultiplier}
        onLoopToggle={() => setIsLooping(!isLooping)}
        onVolumeChange={(v) => {
          setMasterVolume(v);
          globalAudioEngine.setMasterVolume(v);
        }}
        onMuteToggle={() => {
          const next = !isMuted;
          setIsMuted(next);
          globalAudioEngine.setMuted(next);
        }}
        onAudioOffsetChange={(offsetMs) => {
          setAudioTrack((a) => ({ ...a, offsetMs }));
          setProject((p) => ({ ...p, audioSyncOffsetMs: offsetMs }));
        }}
        onFullscreenToggle={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
          } else {
            document.exitFullscreen();
            setIsFullscreen(false);
          }
        }}
        onSoundPresetChange={(soundPreset) => {
          setProject((p) => ({
            ...p,
            visualSettings: { ...p.visualSettings, soundPreset },
          }));
          globalAudioEngine.setSoundPreset(soundPreset);
          globalAudioEngine.triggerNote(60, 90, 0.8);
        }}
      />

      {/* 4. Modals */}
      <HeroUploadModal
        isOpen={isHeroUploadOpen}
        lang={lang}
        onClose={() => setIsHeroUploadOpen(false)}
        onTranscribeComplete={handleTranscribeComplete}
      />

      <ExportVideoModal
        isOpen={isExportVideoOpen}
        totalDuration={totalDuration}
        lang={lang}
        onClose={() => setIsExportVideoOpen(false)}
        onStartExport={handleStartVideoExport}
        onCancelExport={handleCancelVideoExport}
        exportProgress={exportProgress}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={project.visualSettings}
        lang={lang}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={(newSettings) =>
          setProject((p) => ({
            ...p,
            visualSettings: { ...p.visualSettings, ...newSettings },
          }))
        }
      />

      <TrackManagerModal
        isOpen={isTrackManagerOpen}
        tracks={project.tracks}
        notes={project.notes}
        activeTrackId={activeTrackId}
        onClose={() => setIsTrackManagerOpen(false)}
        onSelectActiveTrack={setActiveTrackId}
        onUpdateTrack={(tid, changes) =>
          setProject((p) => ({
            ...p,
            tracks: p.tracks.map((t) => (t.id === tid ? { ...t, ...changes } : t)),
          }))
        }
        onAddTrack={() => {
          const newId = Math.max(0, ...project.tracks.map((t) => t.id)) + 1;
          const newTrack: MidiTrack = {
            id: newId,
            name: `Track ${newId + 1}`,
            channel: newId % 16,
            color: '#10b981',
            muted: false,
            solo: false,
            visible: true,
          };
          setProject((p) => ({ ...p, tracks: [...p.tracks, newTrack] }));
          setActiveTrackId(newId);
        }}
      />

      <AudioToMidiModal
        isOpen={isAudioToMidiOpen}
        audioTrack={audioTrack}
        onClose={() => setIsAudioToMidiOpen(false)}
        onTranscribeComplete={(result) => {
          recordHistory(project);
          setProject((p) => ({
            ...p,
            notes: [...p.notes, ...result.notes],
            tracks: [...p.tracks, ...result.tracks],
          }));
        }}
      />

      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
