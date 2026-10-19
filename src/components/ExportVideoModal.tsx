import React, { useState } from 'react';
import { X, Film, Download, AlertCircle, CheckCircle, Loader2, Sparkles, Youtube } from 'lucide-react';
import { VideoExportOptions, AppLanguage } from '../types';
import { VideoExporter, ExportProgress } from '../utils/video-exporter';

interface ExportVideoModalProps {
  isOpen: boolean;
  totalDuration: number;
  lang?: AppLanguage;
  onClose: () => void;
  onStartExport: (options: VideoExportOptions) => void;
  onCancelExport: () => void;
  exportProgress: ExportProgress | null;
}

export const ExportVideoModal: React.FC<ExportVideoModalProps> = ({
  isOpen,
  totalDuration,
  lang = 'ar',
  onClose,
  onStartExport,
  onCancelExport,
  exportProgress,
}) => {
  const [resolution, setResolution] = useState<'1080p' | '720p' | '4k'>('1080p');
  const [fps, setFps] = useState<30 | 60>(60);
  const [bitrate, setBitrate] = useState<number>(14);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<'all' | 'custom'>('all');
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(Math.ceil(totalDuration));

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const isExporting = exportProgress?.state === 'recording' || exportProgress?.state === 'encoding';
  const isCompleted = exportProgress?.state === 'completed';

  const resMap = {
    '720p': { w: 1280, h: 720 },
    '1080p': { w: 1920, h: 1080 },
    '4k': { w: 3840, h: 2160 },
  };

  const handleStart = () => {
    const geom = resMap[resolution];
    const s = timeRange === 'all' ? 0 : Math.max(0, startTime);
    const e = timeRange === 'all' ? totalDuration : Math.min(totalDuration, Math.max(s + 1, endTime));

    onStartExport({
      resolution,
      width: geom.w,
      height: geom.h,
      fps,
      bitrateMbps: bitrate,
      includeAudio,
      timeRange,
      startTime: s,
      endTime: e,
      format: 'webm',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div
        className={`bg-[#0f111a] border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-neutral-200 ${
          isAr ? 'text-right' : 'text-left'
        }`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#131522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <Youtube className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isAr ? 'تصدير فيديو للنشر على يوتيوب' : 'Export Video for YouTube'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {isAr
                  ? 'تسجيل شلال النوتات بدقة عالية ومزامنة صوت البيانو تلقائياً'
                  : 'Capture high-definition falling notes with synchronized piano audio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 disabled:opacity-40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {!isExporting && !isCompleted ? (
            <>
              {/* Resolution Setting */}
              <div>
                <label className="block text-neutral-400 font-semibold mb-1.5">
                  {isAr ? 'دقة الفيديو (Resolution)' : 'Video Resolution'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1080p', label: '1080p Full HD', note: isAr ? '1920×1080 (مثالي ليوتيوب)' : '1920 × 1080 (Recommended)' },
                    { id: '720p', label: '720p HD', note: isAr ? '1280×720 (أسرع)' : '1280 × 720 (Fast)' },
                    { id: '4k', label: '4K Ultra HD', note: isAr ? '3840×2160 (فائق)' : '3840 × 2160' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setResolution(r.id as '1080p' | '720p' | '4k')}
                      className={`p-2.5 rounded-xl border text-center sm:text-start transition-all ${
                        resolution === r.id
                          ? 'border-cyan-500 bg-cyan-950/30 text-white shadow-sm'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{r.label}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{r.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate & Bitrate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1.5">
                    {isAr ? 'معدل الإطارات (FPS)' : 'Frame Rate'}
                  </label>
                  <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setFps(60)}
                      className={`flex-1 py-1 rounded text-center transition-colors ${
                        fps === 60 ? 'bg-neutral-800 text-cyan-300 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      60 FPS ({isAr ? 'فائق النعومة' : 'Smooth'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFps(30)}
                      className={`flex-1 py-1 rounded text-center transition-colors ${
                        fps === 30 ? 'bg-neutral-800 text-cyan-300 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      30 FPS
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1.5">
                    {isAr ? 'معدل البت:' : 'Bitrate:'}{' '}
                    <span className="text-white font-mono">{bitrate} Mbps</span>
                  </label>
                  <input
                    type="range"
                    min={6}
                    max={25}
                    value={bitrate}
                    onChange={(e) => setBitrate(Number(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded appearance-none accent-cyan-400 mt-2 cursor-pointer"
                  />
                </div>
              </div>

              {/* Audio Inclusion */}
              <div className="flex items-center justify-between p-3 bg-neutral-900/70 border border-neutral-800 rounded-xl">
                <div>
                  <div className="font-semibold text-white">
                    {isAr ? 'تضمين صوت البيانو المباشر' : 'Include Live Piano Audio'}
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    {isAr
                      ? 'مزامنة نغمات البيانو عالية النقاء مع الفيديو في ملف واحد'
                      : 'Sync pristine stereo piano synthesis inside the exported video'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Information callout */}
              <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-xl flex items-start gap-2.5 text-[11px] text-cyan-200">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  {isAr
                    ? 'يتم توليد الفيديو مباشرة في متصفحك بجودة 60 إطاراً في الثانية وبصيغة WebM عالية الوضوح المدعومة مباشرة على يوتيوب وتيك توك وفيسبوك.'
                    : 'The video is encoded directly inside your browser at 60 FPS in WebM format, fully compatible with direct YouTube, TikTok, and social uploads.'}
                </div>
              </div>
            </>
          ) : isExporting ? (
            /* Recording Progress View */
            <div className="py-8 space-y-4 text-center">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {isAr ? 'جارٍ تسجيل وتصدير الفيديو الآن...' : 'Recording & Encoding Video...'}
                </h3>
                <p className="text-neutral-400 text-xs mt-1">
                  {isAr
                    ? 'يتم تشغيل الشلال وتسجيل الإطارات بدقة 60FPS مع الصوت'
                    : 'Capturing 60FPS visualizer canvas frames with synchronized audio'}
                </p>
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${exportProgress?.progressPercent || 0}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[11px] text-neutral-400">
                  <span>{Math.round(exportProgress?.progressPercent || 0)}%</span>
                  <span>
                    {Math.round(exportProgress?.currentSecond || 0)}s /{' '}
                    {Math.round(exportProgress?.totalSeconds || totalDuration)}s
                  </span>
                </div>
              </div>

              <button
                onClick={onCancelExport}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء التصدير' : 'Cancel Export'}
              </button>
            </div>
          ) : (
            /* Completed View */
            <div className="py-8 space-y-4 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'اكتمل تصدير الفيديو بنجاح!' : 'Video Export Succeeded!'}
                </h3>
                <p className="text-neutral-400 text-xs mt-1">
                  {isAr
                    ? 'الفيديو جاهز الآن بالصوت والصورة، انقر على الزر بالأسفل لتحميله لجهازك'
                    : 'Your high-definition video is ready. Click below to download.'}
                </p>
              </div>

              {exportProgress?.downloadUrl && (
                <a
                  href={exportProgress.downloadUrl}
                  download="PianoVision_YouTube_Video.webm"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950 transition-all text-sm"
                >
                  <Download className="w-4 h-4" />
                  {isAr ? 'تحميل الفيديو (.webm)' : 'Download Video (.webm)'}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isExporting && !isCompleted && (
          <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-neutral-800 bg-[#131522]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md shadow-cyan-950 transition-all cursor-pointer active:scale-95"
            >
              <Film className="w-4 h-4" />
              <span>{isAr ? 'بدء تصدير الفيديو' : 'Start Exporting'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
