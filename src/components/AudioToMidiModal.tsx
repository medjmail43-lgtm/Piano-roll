import React, { useState } from 'react';
import { X, Mic, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { AudioTrackState, MidiNote, MidiTrack } from '../types';
import { LocalPitchDetectionEngine, AudioToMidiResult } from '../utils/pitch-detector';

interface AudioToMidiModalProps {
  isOpen: boolean;
  audioTrack: AudioTrackState;
  onClose: () => void;
  onTranscribeComplete: (result: AudioToMidiResult) => void;
}

export const AudioToMidiModal: React.FC<AudioToMidiModalProps> = ({
  isOpen,
  audioTrack,
  onClose,
  onTranscribeComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [result, setResult] = useState<AudioToMidiResult | null>(null);

  if (!isOpen) return null;

  const handleRunTranscription = async () => {
    if (!audioTrack.audioBuffer) {
      alert('Please import an audio file first using the "Import Audio" button in the toolbar.');
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setStatusMessage('Analyzing audio waveform and autocorrelation lag windows...');

    try {
      const engine = new LocalPitchDetectionEngine();
      const res = await engine.transcribe(audioTrack.audioBuffer, (p) => {
        setProgress(p);
        if (p < 50) setStatusMessage('Calculating autocorrelation pitch candidates...');
        else if (p < 85) setStatusMessage('Filtering silence and harmonic multiples...');
        else setStatusMessage('Grouping continuous pitch frames into discrete MIDI notes...');
      });

      setResult(res);
      setIsProcessing(false);
      setStatusMessage('');
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      alert(`Pitch detection failed: ${msg}`);
    }
  };

  const handleApplyNotes = () => {
    if (result) {
      onTranscribeComplete(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0f111a] border border-neutral-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-[#131520]">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Audio-to-MIDI Transcription Engine</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Engineering Limitations Notice (as requested by prompt) */}
          <div className="p-3.5 bg-amber-950/25 border border-amber-800/40 rounded-lg flex items-start gap-3 text-amber-200/90 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300 mb-1">
                Acoustic Science & Polyphony Notice
              </div>
              <div>
                Standard client-side pitch trackers extract fundamental frequencies using
                autocorrelation. This works well on <strong>isolated monophonic lines</strong> (such
                as solo flute, whistling, humming, or clean single-finger piano melodies). It
                cannot demix full polyphonic mastered songs containing simultaneous drums, bass,
                and vocals into separate tracks without heavy specialized neural networks.
              </div>
            </div>
          </div>

          {/* Current Audio Status */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg">
            <div className="text-neutral-400 font-medium mb-1">Loaded Audio Source:</div>
            {audioTrack.audioBuffer ? (
              <div className="flex items-center justify-between">
                <span className="text-white font-medium truncate max-w-[300px]">
                  {audioTrack.name || 'Imported Audio Track'}
                </span>
                <span className="font-mono text-cyan-400">
                  {audioTrack.duration.toFixed(1)}s (
                  {Math.round(audioTrack.audioBuffer.sampleRate / 1000)} kHz)
                </span>
              </div>
            ) : (
              <div className="text-neutral-500 italic">
                No audio file loaded. Please use "Import Audio" in the top toolbar first.
              </div>
            )}
          </div>

          {/* Running progress */}
          {isProcessing && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  {statusMessage}
                </span>
                <span className="font-mono text-cyan-400">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results preview */}
          {result && (
            <div className="p-3.5 bg-cyan-950/20 border border-cyan-800/40 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Detected {result.notes.length} MIDI Note Events
              </div>
              <p className="text-neutral-300 text-[11px]">{result.limitationsNotice}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-[#131520]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {!result ? (
              <button
                onClick={handleRunTranscription}
                disabled={!audioTrack.audioBuffer || isProcessing}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-medium rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analyze Audio
              </button>
            ) : (
              <button
                onClick={handleApplyNotes}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Add Extracted Notes to Project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
