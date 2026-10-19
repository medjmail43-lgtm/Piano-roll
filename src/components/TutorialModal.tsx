import React from 'react';
import { X, HelpCircle, Film, Music, Keyboard, Sliders, Download } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0f111a] border border-neutral-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#131520]">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">PianoVision Visualizer Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto leading-relaxed">
          {/* Section 1: Workflow */}
          <div>
            <h3 className="font-semibold text-white flex items-center gap-1.5 mb-2">
              <Film className="w-4 h-4 text-cyan-400" />
              YouTube Video Creator Workflow
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-neutral-300">
              <li>
                <strong className="text-white">Import MIDI:</strong> Click "Import MIDI" or select
                a classic preset (Moonlight Sonata, Für Elise, etc.) from the Presets menu.
              </li>
              <li>
                <strong className="text-white">Customize Aesthetics:</strong> Open "Visualizer
                Settings" to choose color themes, camera tilt angle (35° recommended for YouTube),
                glow bloom, and spark density.
              </li>
              <li>
                <strong className="text-white">Fine-tune in Piano Roll:</strong> Switch to the
                "Piano Roll Editor" anytime to add, drag, duplicate, or delete notes.
              </li>
              <li>
                <strong className="text-white">Export Video:</strong> Click "Export Video", select
                1080p 60 FPS and start recording to download a high-definition video with
                synchronized stereo audio ready for YouTube!
              </li>
            </ol>
          </div>

          {/* Section 2: Keyboard Shortcuts */}
          <div className="border-t border-neutral-800 pt-4">
            <h3 className="font-semibold text-white flex items-center gap-1.5 mb-2.5">
              <Keyboard className="w-4 h-4 text-purple-400" />
              Keyboard Shortcuts Cheatsheet
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Play / Pause:</span>
                <span className="text-cyan-400 font-semibold">Space</span>
              </div>
              <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Stop / Reset:</span>
                <span className="text-cyan-400 font-semibold">Home</span>
              </div>
              <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Delete Notes:</span>
                <span className="text-cyan-400 font-semibold">Delete / Backspace</span>
              </div>
              <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Duplicate Notes:</span>
                <span className="text-cyan-400 font-semibold">Ctrl + D</span>
              </div>
              <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Undo:</span>
                <span className="text-cyan-400 font-semibold">Ctrl + Z</span>
              </div>
              <div className="p-2 bg-neutral-900/60 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Redo:</span>
                <span className="text-cyan-400 font-semibold">Ctrl + Y</span>
              </div>
            </div>
          </div>

          {/* Section 3: Standalone Offline App */}
          <div className="border-t border-neutral-800 pt-4 p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-lg">
            <div className="flex items-center gap-2 font-semibold text-cyan-300 mb-1">
              <Download className="w-4 h-4 text-cyan-400" />
              100% Offline Standalone Bundle
            </div>
            <p className="text-neutral-300 text-[11px]">
              Need to run this tool on a laptop with no internet connection and zero installation?
              Click <strong>"Export Standalone HTML"</strong> in the top toolbar to download a
              single <code className="text-cyan-200">.html</code> file that opens in any browser
              with full synthesis and visualizer support directly via <code className="text-cyan-200">file://</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-neutral-800 bg-[#131520]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
