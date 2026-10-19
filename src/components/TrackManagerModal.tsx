import React from 'react';
import { X, Layers, Volume2, VolumeX, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { MidiTrack, MidiNote } from '../types';

interface TrackManagerModalProps {
  isOpen: boolean;
  tracks: MidiTrack[];
  notes: MidiNote[];
  activeTrackId: number;
  onClose: () => void;
  onUpdateTrack: (trackId: number, changes: Partial<MidiTrack>) => void;
  onSelectActiveTrack: (trackId: number) => void;
  onAddTrack: () => void;
}

export const TrackManagerModal: React.FC<TrackManagerModalProps> = ({
  isOpen,
  tracks,
  notes,
  activeTrackId,
  onClose,
  onUpdateTrack,
  onSelectActiveTrack,
  onAddTrack,
}) => {
  if (!isOpen) return null;

  // Count notes per track
  const noteCounts = new Map<number, number>();
  notes.forEach((n) => {
    noteCounts.set(n.trackId, (noteCounts.get(n.trackId) || 0) + 1);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0f111a] border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#131520]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">MIDI Track Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Track List */}
        <div className="p-5 space-y-2.5 text-xs max-h-[60vh] overflow-y-auto">
          {tracks.map((track) => {
            const count = noteCounts.get(track.id) || 0;
            const isActive = activeTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => onSelectActiveTrack(track.id)}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-950/20'
                    : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                }`}
              >
                {/* Track Color Picker & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="color"
                    value={track.color}
                    onChange={(e) => onUpdateTrack(track.id, { color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
                    title="Change Track Color"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={track.name}
                      onChange={(e) => onUpdateTrack(track.id, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent text-white font-medium text-xs hover:bg-neutral-800/60 focus:bg-neutral-800 px-1.5 py-0.5 rounded outline-none border border-transparent focus:border-neutral-700 w-full truncate"
                    />
                    <div className="text-[10px] text-neutral-500 font-mono pl-1.5">
                      Ch: {track.channel + 1} · {count} notes
                    </div>
                  </div>
                </div>

                {/* Mute, Solo, Visibility Toggles */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Mute Button */}
                  <button
                    onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                      track.muted
                        ? 'bg-red-950/80 text-red-300 border border-red-800'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title="Mute Track"
                  >
                    M
                  </button>

                  {/* Solo Button */}
                  <button
                    onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                      track.solo
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-700'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title="Solo Track"
                  >
                    S
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    onClick={() => onUpdateTrack(track.id, { visible: !track.visible })}
                    className={`p-1.5 rounded transition-colors ${
                      track.visible
                        ? 'text-cyan-400 hover:bg-neutral-800'
                        : 'text-neutral-600 hover:bg-neutral-800'
                    }`}
                    title={track.visible ? 'Hide in Visualizer' : 'Show in Visualizer'}
                  >
                    {track.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-[#131520]">
          <button
            onClick={onAddTrack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Track
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
