import React, { useRef, useState } from 'react';
import {
  FilePlus,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Upload,
  Download,
  Film,
  Music,
  Settings,
  Layers,
  HelpCircle,
  Sparkles,
  FileCode,
  Menu,
  X,
  Languages,
} from 'lucide-react';
import { VisualizerMode, PianoSoundPreset, PianoVisualTheme, AppLanguage } from '../types';
import { DEMO_SONGS, DemoSong } from '../utils/demo-songs';

interface TopToolbarProps {
  projectTitle: string;
  mode: VisualizerMode;
  soundPreset: PianoSoundPreset;
  pianoStyle: PianoVisualTheme;
  lang: AppLanguage;
  canUndo: boolean;
  canRedo: boolean;
  onTitleChange: (title: string) => void;
  onModeChange: (mode: VisualizerMode) => void;
  onSoundPresetChange: (preset: PianoSoundPreset) => void;
  onPianoStyleChange: (style: PianoVisualTheme) => void;
  onToggleLang: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onImportMidi: (file: File) => void;
  onImportAudio: (file: File) => void;
  onExportMidi: () => void;
  onOpenExportVideo: () => void;
  onOpenTrackManager: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  onOpenHeroUpload: () => void;
  onDownloadStandalone: () => void;
  onSelectDemoSong: (demo: DemoSong) => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  projectTitle,
  mode,
  soundPreset,
  pianoStyle,
  lang,
  canUndo,
  canRedo,
  onTitleChange,
  onModeChange,
  onSoundPresetChange,
  onPianoStyleChange,
  onToggleLang,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onUndo,
  onRedo,
  onImportMidi,
  onImportAudio,
  onExportMidi,
  onOpenExportVideo,
  onOpenTrackManager,
  onOpenSettings,
  onOpenTutorial,
  onOpenHeroUpload,
  onDownloadStandalone,
  onSelectDemoSong,
}) => {
  const midiInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const isAr = lang === 'ar';

  return (
    <header className="flex flex-col bg-[#0b0c12] border-b border-neutral-800 shrink-0 select-none">
      <input
        ref={midiInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onImportMidi(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onImportAudio(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Main Top Bar */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 border-b border-neutral-800/80">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]"></span>
              PianoVision
            </span>
          </div>

          <span className="text-neutral-700 hidden sm:inline">/</span>

          <input
            type="text"
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="hidden sm:inline bg-transparent text-xs sm:text-sm font-medium text-neutral-300 hover:text-white focus:text-white focus:bg-neutral-900 border border-transparent focus:border-neutral-700 rounded px-1.5 py-0.5 outline-none max-w-[150px] md:max-w-[190px] truncate"
            title="Click to rename project"
          />
        </div>

        {/* Center: Hero Transcribe Button + Piano Sound + Visual Style Selector */}
        <div className="hidden xl:flex items-center gap-3">
          {/* Hero Transcribe Song Button */}
          <button
            onClick={onOpenHeroUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-purple-950 transition-all cursor-pointer active:scale-95"
            title="Upload audio song to transcribe into piano notes"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isAr ? 'تحويل أغنية لنوتات' : 'Transcribe Song'}</span>
          </button>

          {/* Sound Presets */}
          <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 rounded-lg p-0.5 text-xs">
            <span className="text-neutral-500 px-1.5 text-[11px]">
              {isAr ? 'صوت البيانو:' : 'Sound:'}
            </span>
            {[
              { id: 'concert-grand', label: isAr ? 'غراند كلاسيكي' : 'Concert Grand' },
              { id: 'studio-bright', label: isAr ? 'استوديو ساطع' : 'Studio Bright' },
              { id: 'vintage-electric', label: isAr ? 'رودز كهربائي' : 'Vintage Rhodes' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onSoundPresetChange(p.id as PianoSoundPreset)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  soundPreset === p.id
                    ? 'bg-neutral-800 text-cyan-300 font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Piano Visual Style */}
          <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 rounded-lg p-0.5 text-xs">
            <span className="text-neutral-500 px-1.5 text-[11px]">
              {isAr ? 'تصميم البيانو:' : 'Style:'}
            </span>
            {[
              { id: 'classic-wood', label: isAr ? 'كلاسيكي خشبي' : 'Classic Wood' },
              { id: 'cinematic-neon', label: isAr ? 'سينمائي' : 'Cinematic' },
              { id: 'dark-studio', label: isAr ? 'دارك نوار' : 'Dark Studio' },
              { id: 'royal-gold', label: isAr ? 'ملكي ذهبي' : 'Royal Gold' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => onPianoStyleChange(s.id as PianoVisualTheme)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  pianoStyle === s.id
                    ? 'bg-neutral-800 text-amber-300 font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Mode Toggle + PROMINENT EXPORT VIDEO Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mode Switcher */}
          <div className="hidden sm:flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg">
            <button
              onClick={() => onModeChange('cinematic')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                mode === 'cinematic' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {isAr ? 'سينمائي 3D' : 'Cinematic 3D'}
            </button>
            <button
              onClick={() => onModeChange('pianoroll')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                mode === 'pianoroll' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Music className="w-3 h-3 text-purple-400" />
              {isAr ? 'محرر النوتات' : 'Piano Roll'}
            </button>
          </div>

          {/* HIGH-VISIBILITY EXPORT VIDEO BUTTON */}
          <button
            onClick={onOpenExportVideo}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 rounded-lg shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-400/40 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Export high definition video for YouTube with synchronized audio"
          >
            <Film className="w-4 h-4 text-cyan-200" />
            <span>{isAr ? 'تصدير فيديو' : 'Export Video'}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Toggle Arabic / English"
          >
            <span className="text-xs font-bold font-mono px-1">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer if open */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#10121b] border-b border-neutral-800 p-4 space-y-3 text-xs">
          {/* Quick Transcribe Button */}
          <button
            onClick={() => {
              onOpenHeroUpload();
              setMobileMenuOpen(false);
            }}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isAr ? 'تحويل أغنية لنوتات بيانو' : 'Transcribe Song to Piano'}</span>
          </button>

          {/* Sound Presets Mobile */}
          <div>
            <div className="text-neutral-400 mb-1.5 font-semibold">
              {isAr ? 'صوت البيانو:' : 'Piano Sound Model:'}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'concert-grand', label: isAr ? 'غراند كلاسيكي' : 'Grand' },
                { id: 'studio-bright', label: isAr ? 'استوديو ساطع' : 'Bright' },
                { id: 'vintage-electric', label: isAr ? 'رودز' : 'Rhodes' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSoundPresetChange(p.id as PianoSoundPreset)}
                  className={`py-1.5 px-2 rounded border text-center ${
                    soundPreset === p.id
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Style Mobile */}
          <div>
            <div className="text-neutral-400 mb-1.5 font-semibold">
              {isAr ? 'تصميم البيانو:' : 'Piano Design Style:'}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'classic-wood', label: isAr ? 'كلاسيكي خشبي' : 'Classic Wood' },
                { id: 'cinematic-neon', label: isAr ? 'سينمائي نيون' : 'Cinematic Neon' },
                { id: 'dark-studio', label: isAr ? 'دارك نوار' : 'Dark Studio' },
                { id: 'royal-gold', label: isAr ? 'ملكي ذهبي' : 'Royal Gold' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => onPianoStyleChange(s.id as PianoVisualTheme)}
                  className={`py-1.5 px-2 rounded border text-center ${
                    pianoStyle === s.id
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <div className="text-neutral-400 mb-1.5 font-semibold">
              {isAr ? 'أغاني كلاسيكية تجريبية:' : 'Demo Presets:'}
            </div>
            <select
              onChange={(e) => {
                const found = DEMO_SONGS.find((s) => s.id === e.target.value);
                if (found) {
                  onSelectDemoSong(found);
                  setMobileMenuOpen(false);
                }
              }}
              defaultValue=""
              className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded p-2"
            >
              <option value="" disabled>
                {isAr ? 'اختر أغنية تجريبية...' : 'Select demo song...'}
              </option>
              {DEMO_SONGS.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title} - {song.composer}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Secondary Project Action Strip */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-1.5 bg-[#0e0f16] text-xs text-neutral-300 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onNewProject}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Create New Project"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'جديد' : 'New'}</span>
          </button>

          <button
            onClick={onOpenProject}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Open Project JSON"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'فتح' : 'Open'}</span>
          </button>

          <button
            onClick={onSaveProject}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Save Project JSON"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'حفظ' : 'Save'}</span>
          </button>

          <div className="h-4 w-px bg-neutral-800 mx-0.5" />

          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 rounded hover:bg-neutral-800 disabled:opacity-30 text-neutral-400 hover:text-white"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 rounded hover:bg-neutral-800 disabled:opacity-30 text-neutral-400 hover:text-white"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-800 mx-0.5" />

          {/* Import MIDI */}
          <button
            onClick={() => midiInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 rounded text-neutral-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAr ? 'استيراد MIDI' : 'Import MIDI'}</span>
          </button>

          {/* Import Audio */}
          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 rounded text-neutral-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? 'استيراد صوت' : 'Import Audio'}</span>
          </button>

          {/* Export MIDI */}
          <button
            onClick={onExportMidi}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تصدير MIDI' : 'Export MIDI'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenTrackManager}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isAr ? 'المسارات' : 'Tracks'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isAr ? 'الإعدادات' : 'Settings'}</span>
          </button>

          <button
            onClick={onDownloadStandalone}
            className="hidden lg:flex items-center gap-1 px-2 py-1 text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Download offline standalone file"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{isAr ? 'تطبيق أوفلاين' : 'Offline App'}</span>
          </button>

          <button
            onClick={onOpenTutorial}
            className="flex items-center gap-1 px-2 py-1 text-neutral-400 hover:text-white transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'دليل' : 'Guide'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
