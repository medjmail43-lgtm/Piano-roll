import React, { useState, useRef } from 'react';
import { Upload, Music, Sparkles, CheckCircle2, Loader2, X, FileAudio, AlertCircle } from 'lucide-react';
import { AudioTrackState, MidiNote, MidiTrack } from '../types';
import { LocalPitchDetectionEngine, AudioToMidiResult } from '../utils/pitch-detector';
import { parseMidiFile } from '../utils/midi-parser';

interface HeroUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscribeComplete: (notes: MidiNote[], tracks: MidiTrack[], title: string, audioFile?: File, audioBuffer?: AudioBuffer) => void;
  lang?: 'ar' | 'en';
}

export const HeroUploadModal: React.FC<HeroUploadModalProps> = ({
  isOpen,
  onClose,
  onTranscribeComplete,
  lang = 'ar',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(10);
    setStatusMessage(lang === 'ar' ? 'جارٍ قراءة الملف الصوتي...' : 'Reading audio file...');

    try {
      // If it's already a MIDI file, parse directly
      if (selectedFile.name.endsWith('.mid') || selectedFile.name.endsWith('.midi')) {
        const buffer = await selectedFile.arrayBuffer();
        const parsed = parseMidiFile(buffer, selectedFile.name);
        setProgress(100);
        setStatusMessage(lang === 'ar' ? 'تم استخراج النوتات بنجاح!' : 'MIDI parsed successfully!');
        setTimeout(() => {
          onTranscribeComplete(parsed.notes, parsed.tracks, parsed.title);
          onClose();
        }, 400);
        return;
      }

      // Audio file (.mp3, .wav): decode and transcribe
      setStatusMessage(lang === 'ar' ? 'جارٍ فك تشفير الصوت وتحليل الترددات...' : 'Decoding audio waveform...');
      setProgress(25);

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const arrayBuffer = await selectedFile.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      setProgress(50);
      setStatusMessage(lang === 'ar' ? 'جارٍ تتبع نوتات البيانو...' : 'Tracking piano pitch candidate notes...');

      const engine = new LocalPitchDetectionEngine();
      const result = await engine.transcribe(audioBuffer, (p) => {
        setProgress(Math.min(95, 50 + Math.round(p * 0.45)));
      });

      setProgress(100);
      setStatusMessage(lang === 'ar' ? `تم استخراج ${result.notes.length} نوتة بيانو جاهزة!` : `Transcribed ${result.notes.length} piano notes!`);

      setTimeout(() => {
        onTranscribeComplete(result.notes, result.tracks, selectedFile.name.replace(/\.[^/.]+$/, ''), selectedFile, audioBuffer);
        onClose();
      }, 500);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      alert(lang === 'ar' ? `حدث خطأ أثناء معالجة الصوت: ${msg}` : `Error processing audio: ${msg}`);
    }
  };

  const isArabic = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        className={`bg-[#0f111a] border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-neutral-200 ${
          isArabic ? 'text-right' : 'text-left'
        }`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#131522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isArabic ? 'تحويل الأغنية إلى نوتات بيانو' : 'Transcribe Song to Piano Notes'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isArabic
                  ? 'ضع أغنيتك هنا لتحويلها فوراً إلى شلال نوتات بيانو جاهز لليوتيوب'
                  : 'Drop your song here to transform it into falling piano notes for YouTube'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Drag and Drop Box */}
        <div className="p-6 space-y-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.mid,.midi"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500/60 bg-emerald-950/20'
                : 'border-neutral-700/80 hover:border-cyan-500/60 bg-[#141624]/60 hover:bg-[#141624]'
            }`}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <FileAudio className="w-12 h-12 text-emerald-400 mx-auto" />
                <div className="text-white font-semibold text-sm truncate max-w-sm mx-auto">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-emerald-400/90 font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ·{' '}
                  {isArabic ? 'الملف جاهز للتحويل' : 'Ready to transcribe'}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  {isArabic ? 'انقر لتغيير الملف' : 'Click to change file'}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {isArabic ? 'اسحب وأفلت ملف الأغنية هنا' : 'Drag & drop song file here'}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {isArabic
                      ? 'يدعم ملفات MP3، WAV، M4A، أو ملفات MIDI'
                      : 'Supports MP3, WAV, M4A, or MIDI files'}
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {isArabic ? 'استعراض من جهازك' : 'Browse from computer'}
                </button>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="space-y-2 p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  {statusMessage}
                </span>
                <span className="font-mono text-cyan-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Transcribe Action Button */}
          <button
            onClick={handleTranscribe}
            disabled={!selectedFile || isProcessing}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isArabic ? 'جارٍ التحويل...' : 'Transcribing...'}</span>
              </>
            ) : (
              <>
                <Music className="w-4 h-4" />
                <span>
                  {isArabic ? 'تحويل الأغنية إلى نوتات بيانو' : 'Transcribe to Piano Notes'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
