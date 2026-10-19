import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MidiNote, MidiTrack, VisualizerSettings, COLOR_PALETTES, isBlackKey, NOTE_NAMES, PianoVisualTheme } from '../types';

interface CinematicVisualizerProps {
  notes: MidiNote[];
  tracks: MidiTrack[];
  currentTime: number;
  totalDuration: number;
  settings: VisualizerSettings;
  onSeek: (time: number) => void;
  onKeyPlay?: (pitch: number) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  qualityMultiplier?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

// 88 keys: MIDI 21 (A0) to 108 (C8)
const WHITE_KEY_INDICES: number[] = [];
let wCount = 0;
for (let p = 21; p <= 108; p++) {
  if (!isBlackKey(p)) {
    WHITE_KEY_INDICES.push(p);
    wCount++;
  }
}
const TOTAL_WHITE_KEYS = 52;

export const CinematicVisualizer: React.FC<CinematicVisualizerProps> = ({
  notes,
  tracks,
  currentTime,
  totalDuration,
  settings,
  onKeyPlay,
  canvasRef: externalCanvasRef,
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const lastActiveNotesRef = useRef<Set<number>>(new Set());
  const backgroundStarsRef = useRef<{ x: number; y: number; r: number; alpha: number }[]>([]);

  useEffect(() => {
    const stars: { x: number; y: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.7,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }
    backgroundStarsRef.current = stars;
  }, []);

  const trackMap = useRef<Map<number, MidiTrack>>(new Map());
  useEffect(() => {
    const map = new Map<number, MidiTrack>();
    tracks.forEach((t) => map.set(t.id, t));
    trackMap.current = map;
  }, [tracks]);

  const palette = COLOR_PALETTES[settings.theme] || COLOR_PALETTES['cyber-synth'];

  const getNoteColor = useCallback(
    (note: MidiNote): string => {
      if (settings.pianoStyle === 'classic-wood') {
        // Warm classic amber / gold / bronze colors
        const classicColors = ['#f59e0b', '#d97706', '#fbbf24', '#fde68a', '#ea580c', '#c2410c'];
        return classicColors[note.pitch % classicColors.length];
      }
      if (settings.pianoStyle === 'royal-gold') {
        const goldColors = ['#facc15', '#eab308', '#ca8a04', '#a16207', '#fde047', '#fef08a'];
        return goldColors[note.pitch % goldColors.length];
      }
      if (settings.theme === 'track-colors') {
        const trk = trackMap.current.get(note.trackId);
        return trk?.color || note.color || '#3b82f6';
      }
      return palette[note.pitch % palette.length];
    },
    [palette, settings.theme, settings.pianoStyle]
  );

  const getKeyGeometry = useCallback((pitch: number) => {
    if (pitch < 21 || pitch > 108) return null;
    const isBlack = isBlackKey(pitch);

    let whiteIndexBefore = 0;
    for (let p = 21; p < pitch; p++) {
      if (!isBlackKey(p)) whiteIndexBefore++;
    }

    if (!isBlack) {
      return {
        isBlack: false,
        normStart: whiteIndexBefore / TOTAL_WHITE_KEYS,
        normWidth: 1 / TOTAL_WHITE_KEYS,
      };
    } else {
      const baseStart = (whiteIndexBefore - 1) / TOTAL_WHITE_KEYS;
      const whiteWidth = 1 / TOTAL_WHITE_KEYS;
      const blackWidth = whiteWidth * 0.68;
      const blackStart = baseStart + whiteWidth * 0.66;
      return {
        isBlack: true,
        normStart: blackStart,
        normWidth: blackWidth,
      };
    }
  }, []);

  // Main 3D Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background color & ambiance based on Piano Visual Style
      if (settings.pianoStyle === 'classic-wood') {
        // Warm classic concert hall ambiance
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0a0807');
        bgGrad.addColorStop(0.5, '#16120e');
        bgGrad.addColorStop(1, '#241a13');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (settings.pianoStyle === 'royal-gold') {
        // Deep obsidian with warm golden radial glow
        const bgGrad = ctx.createRadialGradient(width / 2, height * 0.4, 50, width / 2, height * 0.4, width);
        bgGrad.addColorStop(0, '#1c160c');
        bgGrad.addColorStop(0.7, '#0c0a06');
        bgGrad.addColorStop(1, '#050403');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (settings.pianoStyle === 'dark-studio') {
        // Pure matte studio noir
        ctx.fillStyle = '#060709';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Cinematic Neon cyberpunk
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#040407');
        bgGrad.addColorStop(0.55, '#090a12');
        bgGrad.addColorStop(1, '#0e1019');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Background stars / subtle dust
      if (settings.backgroundStyle === 'stars') {
        ctx.save();
        backgroundStarsRef.current.forEach((s) => {
          ctx.fillStyle =
            settings.pianoStyle === 'classic-wood' || settings.pianoStyle === 'royal-gold'
              ? `rgba(255, 230, 180, ${s.alpha * 0.6})`
              : `rgba(180, 200, 255, ${s.alpha * 0.7})`;
          ctx.beginPath();
          ctx.arc(s.x * width, s.y * height, s.r * dpr, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // Camera Perspective Calculations
      const angleRad = (settings.cameraAngle * Math.PI) / 180;
      const horizonY = height * (0.08 + (1 - Math.cos(angleRad)) * 0.12);
      const keyboardHeight = Math.max(65 * dpr, height * settings.keyboardHeightRatio);
      const fallboardHeight = 14 * dpr; // Wooden fallboard strip
      const strikeY = height - keyboardHeight - fallboardHeight;

      const topConvergence = Math.max(0.4, Math.min(1.0, 1.0 - Math.sin(angleRad) * 0.45));

      const project3D = (normX: number, dist: number): { x: number; y: number; scale: number } => {
        const maxDist = strikeY - horizonY;
        const t = Math.max(0, Math.min(1, dist / maxDist));
        const factor = Math.pow(1 - t, 1.25);
        const y = strikeY - t * (strikeY - horizonY);

        const currentWidth = width * (topConvergence + (1 - topConvergence) * factor);
        const currentLeft = (width - currentWidth) / 2;
        const x = currentLeft + normX * currentWidth;

        return { x, y, scale: factor };
      };

      // 1. Grid & Octave Lines
      if (settings.showMeasureLines) {
        ctx.save();
        ctx.strokeStyle =
          settings.pianoStyle === 'classic-wood' || settings.pianoStyle === 'royal-gold'
            ? 'rgba(217, 119, 6, 0.08)'
            : 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1 * dpr;

        [24, 36, 48, 60, 72, 84, 96, 108].forEach((cPitch) => {
          const geom = getKeyGeometry(cPitch);
          if (geom) {
            const bottom = project3D(geom.normStart, 0);
            const top = project3D(geom.normStart, strikeY - horizonY);
            ctx.beginPath();
            ctx.moveTo(bottom.x, bottom.y);
            ctx.lineTo(top.x, top.y);
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // 2. Falling Notes
      const speedPxPerSec = 280 * settings.speed * dpr;
      const visibleLookaheadSec = (strikeY - horizonY) / speedPxPerSec + 1;
      const minStartTime = currentTime - 0.5;
      const maxStartTime = currentTime + visibleLookaheadSec;

      const currentlyActiveKeys = new Set<number>();
      const activeKeyVelocities = new Map<number, number>();

      const visibleNotes = notes.filter((n) => {
        const trk = trackMap.current.get(n.trackId);
        if (trk && (trk.muted || !trk.visible)) return false;
        return n.startTime + n.duration >= minStartTime && n.startTime <= maxStartTime;
      });

      visibleNotes.forEach((n) => {
        const geom = getKeyGeometry(n.pitch);
        if (!geom) return;

        const isCurrentlyStriking = currentTime >= n.startTime && currentTime <= n.startTime + n.duration;
        if (isCurrentlyStriking) {
          currentlyActiveKeys.add(n.pitch);
          activeKeyVelocities.set(n.pitch, n.velocity);
        }

        const headDist = (n.startTime - currentTime) * speedPxPerSec;
        const tailDist = (n.startTime + n.duration - currentTime) * speedPxPerSec;

        if (tailDist < 0) return;

        const clampedHeadDist = Math.max(0, headDist);
        const clampedTailDist = Math.max(0, tailDist);

        const pHeadLeft = project3D(geom.normStart, clampedHeadDist);
        const pHeadRight = project3D(geom.normStart + geom.normWidth, clampedHeadDist);
        const pTailLeft = project3D(geom.normStart, clampedTailDist);
        const pTailRight = project3D(geom.normStart + geom.normWidth, clampedTailDist);

        const noteColor = getNoteColor(n);

        ctx.save();

        if (settings.bloom && settings.glowIntensity > 0) {
          ctx.shadowColor = noteColor;
          ctx.shadowBlur = Math.round(18 * settings.glowIntensity * dpr);
        }

        ctx.beginPath();
        ctx.moveTo(pHeadLeft.x, pHeadLeft.y);
        ctx.lineTo(pHeadRight.x, pHeadRight.y);
        ctx.lineTo(pTailRight.x, pTailRight.y);
        ctx.lineTo(pTailLeft.x, pTailLeft.y);
        ctx.closePath();

        const noteGrad = ctx.createLinearGradient(0, pHeadLeft.y, 0, pTailLeft.y);
        noteGrad.addColorStop(0, noteColor);
        noteGrad.addColorStop(1, `${noteColor}88`);

        ctx.fillStyle = noteGrad;
        ctx.fill();

        // Top glossy specular highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.moveTo(pHeadLeft.x + 1, pHeadLeft.y);
        ctx.lineTo(pHeadRight.x - 1, pHeadRight.y);
        ctx.stroke();

        ctx.restore();
      });

      // 3. Particle Sparks
      if (settings.particles) {
        currentlyActiveKeys.forEach((pitch) => {
          if (!lastActiveNotesRef.current.has(pitch) && Math.random() < 0.85) {
            const geom = getKeyGeometry(pitch);
            if (geom) {
              const strikePos = project3D(geom.normStart + geom.normWidth / 2, 0);
              const color =
                settings.pianoStyle === 'classic-wood' || settings.pianoStyle === 'royal-gold'
                  ? '#fbbf24'
                  : palette[pitch % palette.length];
              const pCount = settings.particleDensity * 3;

              for (let i = 0; i < pCount; i++) {
                particlesRef.current.push({
                  x: strikePos.x + (Math.random() - 0.5) * 14 * dpr,
                  y: strikeY - Math.random() * 8 * dpr,
                  vx: (Math.random() - 0.5) * 4 * dpr,
                  vy: -(Math.random() * 5 + 2) * dpr,
                  color,
                  size: Math.random() * 2.5 + 1.2,
                  alpha: 1.0,
                  life: 0,
                  maxLife: Math.floor(Math.random() * 24 + 18),
                });
              }
            }
          }
        });

        ctx.save();
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.12 * dpr;
          p.life++;
          p.alpha = 1 - p.life / p.maxLife;

          if (p.life >= p.maxLife) {
            particlesRef.current.splice(i, 1);
            continue;
          }

          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      lastActiveNotesRef.current = currentlyActiveKeys;

      // 4. Strike Line / Laser Bar
      ctx.save();
      if (settings.pianoStyle === 'classic-wood') {
        // Brass / Golden strike bar
        const strikeGrad = ctx.createLinearGradient(0, strikeY, width, strikeY);
        strikeGrad.addColorStop(0, '#92400e');
        strikeGrad.addColorStop(0.5, '#f59e0b');
        strikeGrad.addColorStop(1, '#92400e');
        ctx.strokeStyle = strikeGrad;
        ctx.lineWidth = 2.5 * dpr;
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 8 * dpr;
      } else if (settings.pianoStyle === 'royal-gold') {
        ctx.strokeStyle = '#eab308';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12 * dpr;
        ctx.lineWidth = 3 * dpr;
      } else {
        const strikeLineGrad = ctx.createLinearGradient(0, strikeY, width, strikeY);
        strikeLineGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        strikeLineGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.85)');
        strikeLineGrad.addColorStop(1, 'rgba(139, 92, 246, 0.4)');
        ctx.strokeStyle = strikeLineGrad;
        ctx.lineWidth = 2.5 * dpr;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12 * dpr;
      }

      ctx.beginPath();
      ctx.moveTo(0, strikeY);
      ctx.lineTo(width, strikeY);
      ctx.stroke();
      ctx.restore();

      // 5. Piano Fallboard Trim (Chassis top rim)
      const fallboardY = strikeY;
      ctx.save();
      if (settings.pianoStyle === 'classic-wood') {
        // Polished Mahogany wood fallboard with golden brand insignia
        const woodGrad = ctx.createLinearGradient(0, fallboardY, 0, fallboardY + fallboardHeight);
        woodGrad.addColorStop(0, '#3a1f14');
        woodGrad.addColorStop(0.5, '#4a2818');
        woodGrad.addColorStop(1, '#2b150d');
        ctx.fillStyle = woodGrad;
        ctx.fillRect(0, fallboardY, width, fallboardHeight);

        // Gold inlay trim line
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, fallboardY + fallboardHeight);
        ctx.lineTo(width, fallboardY + fallboardHeight);
        ctx.stroke();

        // Center Brass Plaque Wordmark
        ctx.fillStyle = '#f59e0b';
        ctx.font = `600 ${9 * dpr}px 'Plus Jakarta Sans', serif`;
        ctx.textAlign = 'center';
        ctx.fillText('PIANOVISION CONCERT GRAND', width / 2, fallboardY + fallboardHeight - 3 * dpr);

      } else if (settings.pianoStyle === 'royal-gold') {
        const marbleGrad = ctx.createLinearGradient(0, fallboardY, 0, fallboardY + fallboardHeight);
        marbleGrad.addColorStop(0, '#1c1917');
        marbleGrad.addColorStop(0.5, '#292524');
        marbleGrad.addColorStop(1, '#0c0a09');
        ctx.fillStyle = marbleGrad;
        ctx.fillRect(0, fallboardY, width, fallboardHeight);

        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, fallboardY + fallboardHeight);
        ctx.lineTo(width, fallboardY + fallboardHeight);
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = `700 ${9 * dpr}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('ROYAL EDITION', width / 2, fallboardY + fallboardHeight - 3 * dpr);

      } else {
        // Dark Studio / Cinematic Neon sleek fallboard
        const darkGrad = ctx.createLinearGradient(0, fallboardY, 0, fallboardY + fallboardHeight);
        darkGrad.addColorStop(0, '#12141c');
        darkGrad.addColorStop(1, '#090a0f');
        ctx.fillStyle = darkGrad;
        ctx.fillRect(0, fallboardY, width, fallboardHeight);

        ctx.strokeStyle = '#27293a';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, fallboardY + fallboardHeight);
        ctx.lineTo(width, fallboardY + fallboardHeight);
        ctx.stroke();
      }
      ctx.restore();

      // 6. 88-Key Piano Keyboard
      const keysStartY = fallboardY + fallboardHeight;
      const whiteKeyWidth = width / TOTAL_WHITE_KEYS;
      const blackKeyWidth = whiteKeyWidth * 0.65;
      const blackKeyHeight = keyboardHeight * 0.62;

      // A. White Keys
      let currentWhiteIdx = 0;
      for (let pitch = 21; pitch <= 108; pitch++) {
        if (!isBlackKey(pitch)) {
          const kx = currentWhiteIdx * whiteKeyWidth;
          const isPressed = currentlyActiveKeys.has(pitch);
          const keyDip = isPressed ? 4 * dpr : 0;
          const activeColor = getNoteColor({ pitch } as MidiNote);

          if (isPressed && settings.keyIllumination) {
            const pressGrad = ctx.createLinearGradient(kx, keysStartY, kx, height);
            pressGrad.addColorStop(0, activeColor);
            pressGrad.addColorStop(0.7, '#f8fafc');
            ctx.fillStyle = pressGrad;
          } else {
            // Ivory finish for classic wood / warm tone
            if (settings.pianoStyle === 'classic-wood') {
              const ivoryGrad = ctx.createLinearGradient(kx, keysStartY, kx, height);
              ivoryGrad.addColorStop(0, '#fef3c7');
              ivoryGrad.addColorStop(0.4, '#fffbeb');
              ivoryGrad.addColorStop(0.9, '#fef3c7');
              ivoryGrad.addColorStop(1, '#fde68a');
              ctx.fillStyle = ivoryGrad;
            } else {
              const wGrad = ctx.createLinearGradient(kx, keysStartY, kx, height);
              wGrad.addColorStop(0, '#e2e8f0');
              wGrad.addColorStop(0.2, '#f8fafc');
              wGrad.addColorStop(0.9, '#ffffff');
              wGrad.addColorStop(1, '#cbd5e1');
              ctx.fillStyle = wGrad;
            }
          }

          ctx.fillRect(kx, keysStartY + keyDip, whiteKeyWidth - 0.8 * dpr, keyboardHeight - keyDip);

          // Right bevel separation
          ctx.fillStyle = settings.pianoStyle === 'classic-wood' ? 'rgba(120, 53, 15, 0.25)' : 'rgba(0, 0, 0, 0.15)';
          ctx.fillRect(kx + whiteKeyWidth - 1 * dpr, keysStartY + keyDip, 1 * dpr, keyboardHeight - keyDip);

          // Labels on C keys
          if (settings.showKeyLabels && pitch % 12 === 0) {
            ctx.fillStyle = isPressed ? '#ffffff' : settings.pianoStyle === 'classic-wood' ? '#78350f' : '#64748b';
            ctx.font = `600 ${9 * dpr}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(`C${Math.floor(pitch / 12) - 1}`, kx + whiteKeyWidth / 2, height - 8 * dpr);
          }

          currentWhiteIdx++;
        }
      }

      // B. Black Keys
      currentWhiteIdx = 0;
      for (let pitch = 21; pitch <= 108; pitch++) {
        if (!isBlackKey(pitch)) {
          currentWhiteIdx++;
        } else {
          const kx = (currentWhiteIdx - 1) * whiteKeyWidth + whiteKeyWidth * 0.68;
          const isPressed = currentlyActiveKeys.has(pitch);
          const keyDip = isPressed ? 3 * dpr : 0;
          const activeColor = getNoteColor({ pitch } as MidiNote);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(kx - 1 * dpr, keysStartY + 4 * dpr, blackKeyWidth + 2 * dpr, blackKeyHeight);

          if (isPressed && settings.keyIllumination) {
            const pressGrad = ctx.createLinearGradient(kx, keysStartY, kx, keysStartY + blackKeyHeight);
            pressGrad.addColorStop(0, activeColor);
            pressGrad.addColorStop(0.6, '#1e293b');
            ctx.fillStyle = pressGrad;
          } else {
            const bGrad = ctx.createLinearGradient(kx, keysStartY, kx, keysStartY + blackKeyHeight);
            if (settings.pianoStyle === 'classic-wood') {
              bGrad.addColorStop(0, '#2e1c14');
              bGrad.addColorStop(0.4, '#1b110c');
              bGrad.addColorStop(1, '#0e0805');
            } else {
              bGrad.addColorStop(0, '#262933');
              bGrad.addColorStop(0.4, '#13151b');
              bGrad.addColorStop(1, '#090a0d');
            }
            ctx.fillStyle = bGrad;
          }

          ctx.fillRect(kx, keysStartY + keyDip, blackKeyWidth, blackKeyHeight - keyDip);

          // Glossy highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.fillRect(kx + 1 * dpr, keysStartY + keyDip, blackKeyWidth - 2 * dpr, 2 * dpr);
        }
      }

      // 7. Radiant Ambient Upward Key Glow
      if (settings.keyIllumination && currentlyActiveKeys.size > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        currentlyActiveKeys.forEach((pitch) => {
          const geom = getKeyGeometry(pitch);
          if (geom) {
            const center = project3D(geom.normStart + geom.normWidth / 2, 0);
            const color = getNoteColor({ pitch } as MidiNote);
            const glowGrad = ctx.createRadialGradient(
              center.x,
              strikeY,
              0,
              center.x,
              strikeY - 50 * dpr,
              80 * dpr
            );
            glowGrad.addColorStop(0, `${color}88`);
            glowGrad.addColorStop(0.5, `${color}22`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(center.x - 70 * dpr, strikeY - 80 * dpr, 140 * dpr, 80 * dpr);
          }
        });
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    notes,
    currentTime,
    settings,
    getNoteColor,
    getKeyGeometry,
    palette,
    canvasRef,
  ]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef]);

  // Click / Touch key play handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onKeyPlay) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const keyboardHeight = Math.max(65, rect.height * settings.keyboardHeightRatio);
    const fallboardHeight = 14;
    const strikeY = rect.height - keyboardHeight - fallboardHeight;

    if (clickY >= strikeY) {
      const whiteWidth = rect.width / TOTAL_WHITE_KEYS;
      const whiteIdx = Math.floor(clickX / whiteWidth);
      const pitch = WHITE_KEY_INDICES[whiteIdx];
      if (pitch) {
        onKeyPlay(pitch);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-neutral-950 touch-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="w-full h-full block cursor-pointer"
      />
    </div>
  );
};
