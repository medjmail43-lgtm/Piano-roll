import React, { useRef, useState, useEffect, useCallback } from 'react';
import { MidiNote, MidiTrack, isBlackKey, NOTE_NAMES, midiToNoteName } from '../types';

interface PianoRollEditorProps {
  notes: MidiNote[];
  tracks: MidiTrack[];
  currentTime: number;
  totalDuration: number;
  tempo: number;
  activeTrackId: number;
  onNotesChange: (newNotes: MidiNote[], recordHistory?: boolean) => void;
  onSeek: (time: number) => void;
  onKeyPlay: (pitch: number, velocity?: number) => void;
}

type SnapValue = 0.25 | 0.5 | 1 | 2 | 0; // in beats (0 = free)

export const PianoRollEditor: React.FC<PianoRollEditorProps> = ({
  notes,
  tracks,
  currentTime,
  totalDuration,
  tempo,
  activeTrackId,
  onNotesChange,
  onSeek,
  onKeyPlay,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Zoom & Viewport states
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(140);
  const [rowHeight, setRowHeight] = useState<number>(20);
  const [snapBeats, setSnapBeats] = useState<SnapValue>(0.25); // 16th notes default

  // Selection & Interaction states
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'marquee' | 'create';
    startX: number;
    startY: number;
    initialNotesState: MidiNote[];
    targetNoteId?: string;
    marqueeRect?: { x1: number; y1: number; x2: number; y2: number };
  } | null>(null);

  // Velocity popover state
  const [velocityValue, setVelocityValue] = useState<number>(85);

  const secondsPerBeat = 60 / tempo;
  const snapSeconds = snapBeats > 0 ? snapBeats * secondsPerBeat : 0.01;

  // Active track color
  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];
  const activeColor = activeTrack?.color || '#3b82f6';

  // 88 Keys from C8 (108) down to A0 (21)
  const pitches: number[] = [];
  for (let p = 108; p >= 21; p--) {
    pitches.push(p);
  }

  // Scroll to Middle C (C4 = 60) on initial load
  useEffect(() => {
    if (scrollAreaRef.current) {
      const c4Index = pitches.indexOf(60);
      if (c4Index !== -1) {
        scrollAreaRef.current.scrollTop = Math.max(0, c4Index * rowHeight - 200);
      }
    }
  }, []);

  // Snapping helper
  const snapTime = useCallback(
    (t: number): number => {
      if (snapBeats === 0) return Math.max(0, t);
      return Math.max(0, Math.round(t / snapSeconds) * snapSeconds);
    },
    [snapBeats, snapSeconds]
  );

  // Pitch from Y offset
  const getPitchFromY = useCallback(
    (y: number): number => {
      const idx = Math.floor(y / rowHeight);
      const clampedIdx = Math.max(0, Math.min(pitches.length - 1, idx));
      return pitches[clampedIdx];
    },
    [pitches, rowHeight]
  );

  // Y offset from pitch
  const getYFromPitch = useCallback(
    (pitch: number): number => {
      const idx = pitches.indexOf(pitch);
      return idx * rowHeight;
    },
    [pitches, rowHeight]
  );

  // Delete selected notes
  const handleDeleteSelected = useCallback(() => {
    if (selectedNoteIds.size === 0) return;
    const remaining = notes.filter((n) => !selectedNoteIds.has(n.id));
    onNotesChange(remaining, true);
    setSelectedNoteIds(new Set());
  }, [notes, selectedNoteIds, onNotesChange]);

  // Duplicate selected notes
  const handleDuplicateSelected = useCallback(() => {
    if (selectedNoteIds.size === 0) return;
    const selected = notes.filter((n) => selectedNoteIds.has(n.id));
    const offsetTime = 4 * secondsPerBeat; // 1 bar ahead
    const newNotes: MidiNote[] = selected.map((n, idx) => ({
      ...n,
      id: `copy-${Date.now()}-${idx}`,
      startTime: Number((n.startTime + offsetTime).toFixed(3)),
    }));
    onNotesChange([...notes, ...newNotes], true);
    setSelectedNoteIds(new Set(newNotes.map((n) => n.id)));
  }, [notes, selectedNoteIds, secondsPerBeat, onNotesChange]);

  // Keyboard shortcuts (Delete, Escape, Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedNoteIds(new Set());
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected, handleDuplicateSelected]);

  // Mouse event handlers for note interactions
  const handleMouseDownOnGrid = (e: React.MouseEvent<HTMLDivElement>) => {
    const gridRect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = scrollAreaRef.current ? scrollAreaRef.current.scrollLeft : 0;
    const scrollTop = scrollAreaRef.current ? scrollAreaRef.current.scrollTop : 0;

    const clickX = e.clientX - gridRect.left + scrollLeft;
    const clickY = e.clientY - gridRect.top + scrollTop;

    // Check if clicked directly on an existing note
    const targetPitch = getPitchFromY(clickY);
    const targetTime = clickX / pixelsPerSecond;

    const clickedNote = notes.find((n) => {
      return (
        n.pitch === targetPitch &&
        targetTime >= n.startTime &&
        targetTime <= n.startTime + n.duration
      );
    });

    if (clickedNote) {
      // Selected note
      const isShift = e.shiftKey;
      let newSelection = new Set(selectedNoteIds);

      if (isShift) {
        if (newSelection.has(clickedNote.id)) {
          newSelection.delete(clickedNote.id);
        } else {
          newSelection.add(clickedNote.id);
        }
      } else if (!newSelection.has(clickedNote.id)) {
        newSelection = new Set([clickedNote.id]);
      }

      setSelectedNoteIds(newSelection);
      setVelocityValue(clickedNote.velocity);
      onKeyPlay(clickedNote.pitch, clickedNote.velocity);

      // Check if clicked near right edge (resize handle)
      const noteRightX = (clickedNote.startTime + clickedNote.duration) * pixelsPerSecond;
      const isResize = Math.abs(clickX - noteRightX) <= 8;

      setDragState({
        type: isResize ? 'resize' : 'move',
        startX: clickX,
        startY: clickY,
        initialNotesState: JSON.parse(JSON.stringify(notes)),
        targetNoteId: clickedNote.id,
      });
    } else {
      // Clicked on empty space: create new note or start marquee
      if (!e.shiftKey) {
        setSelectedNoteIds(new Set());
      }

      const snappedStart = snapTime(targetTime);
      const standardDuration = Math.max(0.15, snapSeconds);
      const newNote: MidiNote = {
        id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        pitch: targetPitch,
        startTime: Number(snappedStart.toFixed(3)),
        duration: Number(standardDuration.toFixed(3)),
        velocity: velocityValue,
        trackId: activeTrackId,
        color: activeColor,
      };

      onKeyPlay(targetPitch, velocityValue);
      const updated = [...notes, newNote];
      onNotesChange(updated, true);
      setSelectedNoteIds(new Set([newNote.id]));

      setDragState({
        type: 'resize',
        startX: (newNote.startTime + newNote.duration) * pixelsPerSecond,
        startY: clickY,
        initialNotesState: updated,
        targetNoteId: newNote.id,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState) return;

    const gridRect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = scrollAreaRef.current ? scrollAreaRef.current.scrollLeft : 0;
    const scrollTop = scrollAreaRef.current ? scrollAreaRef.current.scrollTop : 0;

    const currentX = e.clientX - gridRect.left + scrollLeft;
    const currentY = e.clientY - gridRect.top + scrollTop;

    const deltaX = currentX - dragState.startX;
    const deltaTime = deltaX / pixelsPerSecond;

    if (dragState.type === 'move') {
      const deltaY = currentY - dragState.startY;
      const startPitch = getPitchFromY(dragState.startY);
      const currentPitch = getPitchFromY(currentY);
      const pitchDelta = currentPitch - startPitch;

      const updated = dragState.initialNotesState.map((n) => {
        if (selectedNoteIds.has(n.id)) {
          const newStart = Math.max(0, snapTime(n.startTime + deltaTime));
          const newPitch = Math.max(21, Math.min(108, n.pitch + pitchDelta));
          return {
            ...n,
            startTime: Number(newStart.toFixed(3)),
            pitch: newPitch,
          };
        }
        return n;
      });

      onNotesChange(updated, false);
    } else if (dragState.type === 'resize' && dragState.targetNoteId) {
      const updated = dragState.initialNotesState.map((n) => {
        if (n.id === dragState.targetNoteId) {
          const newEnd = Math.max(n.startTime + 0.05, snapTime(n.startTime + n.duration + deltaTime));
          return {
            ...n,
            duration: Number((newEnd - n.startTime).toFixed(3)),
          };
        }
        return n;
      });

      onNotesChange(updated, false);
    }
  };

  const handleMouseUp = () => {
    if (dragState) {
      onNotesChange(notes, true); // Commit to history
      setDragState(null);
    }
  };

  // Update velocity for selected notes
  const handleVelocityChange = (vel: number) => {
    setVelocityValue(vel);
    if (selectedNoteIds.size > 0) {
      const updated = notes.map((n) => {
        if (selectedNoteIds.has(n.id)) {
          return { ...n, velocity: vel };
        }
        return n;
      });
      onNotesChange(updated, true);
    }
  };

  // Calculate width of timeline
  const timelineWidth = Math.max(1200, (totalDuration + 8) * pixelsPerSecond);
  const totalBars = Math.ceil(totalDuration / (4 * secondsPerBeat)) + 2;

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full h-full bg-[#0a0b10] border-t border-neutral-800 text-neutral-300 text-xs select-none"
    >
      {/* Top Piano Roll Sub-Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#10121a] border-b border-neutral-800 shrink-0 gap-4">
        {/* Snap Grid Selector */}
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 font-medium">Grid Snap:</span>
          <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded p-0.5">
            {[
              { label: '1/4', val: 1 },
              { label: '1/8', val: 0.5 },
              { label: '1/16', val: 0.25 },
              { label: '1/32', val: 0.125 },
              { label: 'Free', val: 0 },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => setSnapBeats(s.val as SnapValue)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  snapBeats === s.val
                    ? 'bg-neutral-800 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Note Velocity */}
        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-medium">Velocity:</span>
          <input
            type="range"
            min={1}
            max={127}
            value={velocityValue}
            onChange={(e) => handleVelocityChange(Number(e.target.value))}
            className="w-24 h-1.5 bg-neutral-800 rounded appearance-none accent-cyan-400 cursor-pointer"
          />
          <span className="font-mono text-neutral-200 tabular-nums w-8 text-right">
            {velocityValue}
          </span>
        </div>

        {/* Action Buttons: Duplicate, Delete */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicateSelected}
            disabled={selectedNoteIds.size === 0}
            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none rounded text-neutral-200 transition-colors"
          >
            Duplicate (Ctrl+D)
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedNoteIds.size === 0}
            className="px-2.5 py-1 bg-red-950/40 border border-red-800/60 hover:bg-red-900/50 disabled:opacity-40 disabled:pointer-events-none rounded text-red-300 transition-colors"
          >
            Delete Note
          </button>
        </div>

        {/* Horizontal & Vertical Zoom */}
        <div className="flex items-center gap-3">
          <span className="text-neutral-400">Zoom X:</span>
          <input
            type="range"
            min={60}
            max={320}
            value={pixelsPerSecond}
            onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
            className="w-20 h-1.5 bg-neutral-800 rounded appearance-none accent-cyan-400 cursor-pointer"
          />
          <span className="text-neutral-400">Zoom Y:</span>
          <input
            type="range"
            min={14}
            max={32}
            value={rowHeight}
            onChange={(e) => setRowHeight(Number(e.target.value))}
            className="w-16 h-1.5 bg-neutral-800 rounded appearance-none accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Main Piano Roll Container with Left Keyboard & Right Scroll Grid */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Scrollable Viewport Area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-auto relative bg-[#090a0f]"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Timeline Bar Ruler at Top */}
          <div
            className="sticky top-0 z-20 h-7 bg-[#141622] border-b border-neutral-800 flex"
            style={{ width: `${timelineWidth + 72}px` }}
          >
            {/* Left corner spacer above keyboard */}
            <div className="sticky left-0 w-[72px] shrink-0 bg-[#141622] border-r border-neutral-800 flex items-center justify-center font-mono text-[10px] text-neutral-400 z-30">
              Keys
            </div>

            {/* Bar & Beat Markers */}
            <div
              className="relative flex-1 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                onSeek(Math.max(0, clickX / pixelsPerSecond));
              }}
            >
              {Array.from({ length: totalBars }).map((_, barIdx) => {
                const barStartSec = barIdx * 4 * secondsPerBeat;
                const leftPx = barStartSec * pixelsPerSecond;
                return (
                  <div
                    key={barIdx}
                    className="absolute top-0 bottom-0 border-l border-neutral-700/80 px-1 text-[10px] font-mono text-neutral-400"
                    style={{ left: `${leftPx}px` }}
                  >
                    Bar {barIdx + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid + Left Keys Flex Row */}
          <div className="flex" style={{ width: `${timelineWidth + 72}px` }}>
            {/* Left Piano Keys Column (Sticky on Horizontal Scroll) */}
            <div className="sticky left-0 z-10 w-[72px] shrink-0 bg-[#12131b] border-r border-neutral-800 select-none">
              {pitches.map((p) => {
                const isBlack = isBlackKey(p);
                const noteName = midiToNoteName(p);
                const isC = p % 12 === 0;

                return (
                  <div
                    key={p}
                    onClick={() => onKeyPlay(p, velocityValue)}
                    className={`flex items-center justify-between px-2 cursor-pointer transition-colors border-b ${
                      isBlack
                        ? 'bg-[#181a24] text-neutral-400 border-neutral-900 hover:bg-[#252838]'
                        : isC
                        ? 'bg-neutral-200 text-neutral-900 font-semibold border-neutral-400 hover:bg-white'
                        : 'bg-neutral-100 text-neutral-800 border-neutral-300 hover:bg-white'
                    }`}
                    style={{ height: `${rowHeight}px` }}
                  >
                    <span className="font-mono text-[10px]">{noteName}</span>
                    {isC && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Note Canvas / Grid Area */}
            <div
              className="relative flex-1 cursor-crosshair"
              style={{
                height: `${pitches.length * rowHeight}px`,
                width: `${timelineWidth}px`,
              }}
              onMouseDown={handleMouseDownOnGrid}
            >
              {/* Pitch Row Backgrounds & Octave separators */}
              {pitches.map((p) => {
                const isBlack = isBlackKey(p);
                const isC = p % 12 === 0;
                return (
                  <div
                    key={p}
                    className={`absolute left-0 right-0 border-b ${
                      isBlack
                        ? 'bg-[#0b0c13] border-neutral-900/60'
                        : isC
                        ? 'bg-[#12141f] border-neutral-800'
                        : 'bg-[#0e0f17] border-neutral-900/40'
                    }`}
                    style={{
                      top: `${getYFromPitch(p)}px`,
                      height: `${rowHeight}px`,
                    }}
                  />
                );
              })}

              {/* Vertical Bar & Beat Lines */}
              {Array.from({ length: totalBars }).map((_, barIdx) => {
                const barStartSec = barIdx * 4 * secondsPerBeat;
                const leftPx = barStartSec * pixelsPerSecond;
                return (
                  <React.Fragment key={barIdx}>
                    {/* Main Bar Line */}
                    <div
                      className="absolute top-0 bottom-0 border-l border-neutral-700/50 pointer-events-none"
                      style={{ left: `${leftPx}px` }}
                    />
                    {/* 4 Beat Lines per Bar */}
                    {[1, 2, 3].map((b) => (
                      <div
                        key={b}
                        className="absolute top-0 bottom-0 border-l border-neutral-800/30 pointer-events-none"
                        style={{
                          left: `${leftPx + b * secondsPerBeat * pixelsPerSecond}px`,
                        }}
                      />
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Rendered Notes */}
              {notes.map((n) => {
                const top = getYFromPitch(n.pitch);
                const left = n.startTime * pixelsPerSecond;
                const width = Math.max(6, n.duration * pixelsPerSecond);
                const isSelected = selectedNoteIds.has(n.id);
                const trk = tracks.find((t) => t.id === n.trackId);
                const noteColor = trk?.color || n.color || activeColor;

                return (
                  <div
                    key={n.id}
                    className={`absolute rounded flex items-center px-1 overflow-hidden text-[10px] font-mono text-white select-none transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-white shadow-lg shadow-cyan-500/30 z-10 brightness-110'
                        : 'hover:brightness-125'
                    }`}
                    style={{
                      top: `${top + 1}px`,
                      left: `${left}px`,
                      width: `${width}px`,
                      height: `${rowHeight - 2}px`,
                      backgroundColor: noteColor,
                    }}
                  >
                    {/* Note name label if wide enough */}
                    {width > 28 && (
                      <span className="truncate drop-shadow-sm font-medium">
                        {midiToNoteName(n.pitch)}
                      </span>
                    )}

                    {/* Resize handle bar on right edge */}
                    <div className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/30 cursor-ew-resize" />
                  </div>
                );
              })}

              {/* Playhead Scrub Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_8px_#06b6d4] z-20 pointer-events-none"
                style={{ left: `${currentTime * pixelsPerSecond}px` }}
              >
                <div className="w-2.5 h-2.5 -ml-1 bg-cyan-400 rotate-45 -mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
