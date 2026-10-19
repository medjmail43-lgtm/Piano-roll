import React from 'react';
import { X, Sliders, Palette, Camera, Sparkles, Monitor, Music } from 'lucide-react';
import { VisualizerSettings, VisualizerTheme, PianoVisualTheme, PianoSoundPreset, COLOR_PALETTES, AppLanguage } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: VisualizerSettings;
  lang?: AppLanguage;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<VisualizerSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  lang = 'ar',
  onClose,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const pianoStyles: { id: PianoVisualTheme; name: string; desc: string }[] = [
    {
      id: 'classic-wood',
      name: isAr ? 'كلاسيكي خشبي فاخر (Classic Wood)' : 'Classic Mahogany Grand',
      desc: isAr ? 'هيكل خشبي مصقول مع لوحة اسم ذهبية ونغمات كلاسيكية دافئة' : 'Polished rosewood chassis with brass fallboard',
    },
    {
      id: 'cinematic-neon',
      name: isAr ? 'سينمائي نيون مشع (Cinematic Neon)' : 'Cinematic Neon 3D',
      desc: isAr ? 'خط ليزري مشع وألوان سايبر سنث ملائمة لفيديوهات يوتيوب الحديثة' : 'Cybernetic horizon, neon laser strike line & glow',
    },
    {
      id: 'dark-studio',
      name: isAr ? 'دارك استوديو نوار (Dark Studio)' : 'Matte Studio Noir',
      desc: isAr ? 'تصميم أسود مطفي حديث مع إضاءة بيانو خافتة ومريحة للعين' : 'Stealth obsidian black with minimal cyan glow',
    },
    {
      id: 'royal-gold',
      name: isAr ? 'ملكي ذهبي أسطوري (Royal Gold)' : 'Royal Gold Edition',
      desc: isAr ? 'بيانو أسطوري مزين بلمسات من الذهب والجسيمات الذهبية المشعة' : 'Lustrous gold inlays and warm candlelight bloom',
    },
  ];

  const soundPresets: { id: PianoSoundPreset; name: string; desc: string }[] = [
    {
      id: 'concert-grand',
      name: isAr ? 'بيانو غراند كلاسيكي (Concert Grand)' : 'Concert Grand (Steinway Model)',
      desc: isAr ? 'صوت بيانو عميق ودافئ مع رنين صندوق الصوت الخشبي الواقعي' : 'Rich multi-harmonic acoustic strings & body resonance',
    },
    {
      id: 'studio-bright',
      name: isAr ? 'بيانو استوديو ساطع (Bright Studio)' : 'Bright Studio (Yamaha C7)',
      desc: isAr ? 'نبرة صوت ساطعة وواضحة جداً مع استجابة ضربات المطرقة السريعة' : 'Crisp attack, punchy transient, sparkling highs',
    },
    {
      id: 'vintage-electric',
      name: isAr ? 'بيانو كهربائي كلاسيكي (Vintage Rhodes)' : 'Vintage Electric Rhodes',
      desc: isAr ? 'صوت رودز دافئ رنان مع كورس متماوج ونغمات جرسية رائعة' : 'Warm bell-like tine overtones with lush chorus vibe',
    },
  ];

  const themes: { id: VisualizerTheme; name: string }[] = [
    { id: 'cyber-synth', name: isAr ? 'سايبر سنث (أزرق وبنفسجي)' : 'Cyber Synth (Cyan & Purple)' },
    { id: 'neon-sunset', name: isAr ? 'غروب النيون (وردي وبرتقالي)' : 'Neon Sunset (Pink & Orange)' },
    { id: 'emerald-aurora', name: isAr ? 'شفق الزمرد (أخضر زمردي)' : 'Emerald Aurora (Jade & Mint)' },
    { id: 'golden-grand', name: isAr ? 'ذهبي ملكي (عنبر وذهب)' : 'Golden Grand (Amber & Gold)' },
    { id: 'deep-cosmic', name: isAr ? 'كوني عميق (بنفسجي وأزرق)' : 'Deep Cosmic (Violet & Indigo)' },
    { id: 'rainbow-chroma', name: isAr ? 'قوس قزح متعدد الألوان' : 'Rainbow Chroma (Full Spectrum)' },
    { id: 'track-colors', name: isAr ? 'ألوان المسارات المستقلة' : 'Track Colors (Individual Tracks)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div
        className={`bg-[#0f111a] border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-neutral-200 ${
          isAr ? 'text-right' : 'text-left'
        }`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#131522]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              {isAr ? 'تخصيص البيانو والصوت والتأثيرات' : 'Visualizer & Audio Settings'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* 1. Piano Visual Theme Selection */}
          <div>
            <div className="flex items-center gap-1.5 text-neutral-200 font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تصميم وشكل البيانو (Piano Design Style)' : 'Piano Visual Style'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pianoStyles.map((s) => {
                const isSelected = settings.pianoStyle === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onUpdateSettings({ pianoStyle: s.id })}
                    className={`p-3 rounded-xl border text-start transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-950/20 text-white shadow-sm'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{s.name}</div>
                    <div className="text-[10px] text-neutral-400 mt-1 leading-snug">{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Piano Sound Model Selection */}
          <div className="border-t border-neutral-800/80 pt-4">
            <div className="flex items-center gap-1.5 text-neutral-200 font-bold mb-2">
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'صوت البيانو ومحرك التوليد (Piano Sound Engine)' : 'Piano Sound Engine'}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {soundPresets.map((sp) => {
                const isSelected = settings.soundPreset === sp.id;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => onUpdateSettings({ soundPreset: sp.id })}
                    className={`p-3 rounded-xl border text-start flex items-center justify-between gap-3 transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/30 text-white shadow-sm'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{sp.name}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{sp.desc}</div>
                    </div>
                    {isSelected && (
                      <span className="text-[11px] font-bold text-cyan-400 shrink-0">
                        {isAr ? 'مفعل ✓' : 'Active ✓'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Note Colors Palette */}
          <div className="border-t border-neutral-800/80 pt-4">
            <div className="flex items-center gap-1.5 text-neutral-200 font-bold mb-2">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAr ? 'ألوان النوتات المتساقطة' : 'Falling Notes Color Palette'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {themes.map((t) => {
                const colors = COLOR_PALETTES[t.id];
                const isSelected = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className={`p-2.5 rounded-lg border text-start flex flex-col gap-1.5 transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/20 text-white shadow-sm'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-medium text-xs text-white">{t.name}</span>
                    <div className="flex items-center gap-1">
                      {colors.slice(0, 5).map((c, idx) => (
                        <div
                          key={idx}
                          className="w-3 h-3 rounded-full shadow-inner"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Perspective Camera Angle & Speed */}
          <div className="border-t border-neutral-800/80 pt-4">
            <div className="flex items-center gap-1.5 text-neutral-200 font-bold mb-3">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'زاوية الكاميرا ثلاثية الأبعاد والسرعة' : 'Camera Perspective & Speed'}</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>{isAr ? 'زاوية الميل ثلاثية الأبعاد:' : '3D Camera Tilt:'}</span>
                  <span className="font-mono text-cyan-400">{settings.cameraAngle}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={settings.cameraAngle}
                  onChange={(e) => onUpdateSettings({ cameraAngle: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded appearance-none accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>{isAr ? 'سرعة تساقط النوتات:' : 'Note Falling Speed:'}</span>
                  <span className="font-mono text-cyan-400">{settings.speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  value={settings.speed}
                  onChange={(e) => onUpdateSettings({ speed: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded appearance-none accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 5. Glow & Sparkles */}
          <div className="border-t border-neutral-800/80 pt-4">
            <div className="flex items-center gap-1.5 text-neutral-200 font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'توهج الإضاءة والشرارات' : 'Glow Bloom & Sparks'}</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>{isAr ? 'شدة التوهج (Bloom Glow):' : 'Bloom Glow Intensity:'}</span>
                  <span className="font-mono text-cyan-400">{Math.round(settings.glowIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.glowIntensity}
                  onChange={(e) => onUpdateSettings({ glowIntensity: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded appearance-none accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-lg cursor-pointer">
                  <span className="text-neutral-300">{isAr ? 'شرارات ضرب المفاتيح' : 'Hit Sparks'}</span>
                  <input
                    type="checkbox"
                    checked={settings.particles}
                    onChange={(e) => onUpdateSettings({ particles: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-700 accent-cyan-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-lg cursor-pointer">
                  <span className="text-neutral-300">{isAr ? 'إضاءة المفاتيح المشعة' : 'Key Lighting'}</span>
                  <input
                    type="checkbox"
                    checked={settings.keyIllumination}
                    onChange={(e) => onUpdateSettings({ keyIllumination: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-700 accent-cyan-500"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3.5 border-t border-neutral-800 bg-[#131522]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {isAr ? 'تم الحفظ' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
