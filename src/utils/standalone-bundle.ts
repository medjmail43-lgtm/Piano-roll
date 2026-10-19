/**
 * Exports a completely self-contained, single-file HTML5/CSS3/Vanilla JS Piano Roll visualizer
 * that runs natively by double-clicking "PianoVision_Offline.html" with file:// in any browser
 * without Node.js, npm, or dev servers.
 */

export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PianoVision - Standalone Offline Visualizer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #08080a;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
    }
    header {
      height: 48px;
      background: #0f1015;
      border-bottom: 1px solid #22232e;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      flex-shrink: 0;
    }
    .brand {
      font-weight: 700;
      font-size: 16px;
      letter-spacing: -0.02em;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand span {
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-btn {
      background: #1c1d27;
      border: 1px solid #2d2f3f;
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .nav-btn:hover { background: #27293a; }
    .nav-btn.primary { background: #3b82f6; border-color: #3b82f6; color: #fff; }
    .nav-btn.primary:hover { background: #2563eb; }
    #canvas-container {
      flex: 1;
      position: relative;
      background: radial-gradient(circle at 50% 30%, #151624 0%, #06070a 100%);
      overflow: hidden;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    footer {
      height: 56px;
      background: #0d0e14;
      border-top: 1px solid #1f202b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      flex-shrink: 0;
      gap: 16px;
    }
    .transport-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .time-display {
      font-family: monospace;
      font-size: 13px;
      color: #94a3b8;
      min-width: 110px;
    }
    .progress-slider {
      flex: 1;
      max-width: 600px;
      height: 6px;
      appearance: none;
      background: #252636;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }
    .progress-slider::-webkit-slider-thumb {
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #06b6d4;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>PianoVision</span> <span>Offline</span>
    </div>
    <div style="display:flex; gap:8px;">
      <label class="nav-btn">
        Import MIDI <input type="file" id="midi-input" accept=".mid,.midi" style="display:none">
      </label>
      <button class="nav-btn" id="demo-btn">Load Moonlight Sonata</button>
      <button class="nav-btn primary" id="mode-btn">Cinematic 3D</button>
    </div>
  </header>

  <div id="canvas-container">
    <canvas id="view-canvas"></canvas>
  </div>

  <footer>
    <div class="transport-controls">
      <button class="nav-btn primary" id="play-btn">Play</button>
      <button class="nav-btn" id="stop-btn">Stop</button>
    </div>
    <div class="time-display" id="time-txt">00:00 / 00:00</div>
    <input type="range" class="progress-slider" id="progress" min="0" max="100" value="0" step="0.1">
    <div style="color:#64748b; font-size:12px;">100% Offline Standalone</div>
  </footer>

  <script>
    // Audio synthesizer
    let audioCtx = null;
    function initAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playNoteSound(pitch, vel, dur) {
      if (!audioCtx) return;
      const freq = 440 * Math.pow(2, (pitch - 69) / 12);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime((vel / 127) * 0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (dur || 1.2));
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + (dur || 1.2) + 0.1);
    }

    // Demo notes data
    let notes = [];
    let isPlaying = false;
    let currentTime = 0;
    let totalDuration = 35;
    let lastTimestamp = 0;

    function createDemoNotes() {
      notes = [];
      const chords = [
        { b: 37, t: [56, 61, 64] },
        { b: 35, t: [56, 61, 64] },
        { b: 33, t: [57, 61, 64] },
        { b: 30, t: [57, 62, 66] },
        { b: 32, t: [56, 60, 63] },
        { b: 37, t: [56, 61, 64] }
      ];
      chords.forEach((c, cIdx) => {
        const start = cIdx * 4;
        notes.push({ pitch: c.b, startTime: start, duration: 3.8, velocity: 80, color: '#8b5cf6' });
        for (let b = 0; b < 4; b++) {
          for (let k = 0; k < 3; k++) {
            notes.push({
              pitch: c.t[k % 3],
              startTime: start + b + k * 0.333,
              duration: 0.3,
              velocity: 60,
              color: '#06b6d4'
            });
          }
        }
      });
      totalDuration = 26;
    }
    createDemoNotes();

    const canvas = document.getElementById('view-canvas');
    const ctx = canvas.getContext('2d');
    function resize() {
      canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', resize);
    resize();

    function render() {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background stars & vignette
      ctx.fillStyle = '#06070a';
      ctx.fillRect(0, 0, w, h);

      const kHeight = h * 0.18;
      const strikeY = h - kHeight;

      // 88 Piano keys at bottom
      const numKeys = 88;
      const keyWidth = w / 52; // 52 white keys
      const whiteKeys = [0,2,4,5,7,9,11];
      let whiteIdx = 0;

      // Draw white keys
      for (let i = 0; i < 88; i++) {
        const pitch = i + 21;
        const noteInOct = pitch % 12;
        if (whiteKeys.includes(noteInOct)) {
          const kx = whiteIdx * keyWidth;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(kx, strikeY, keyWidth - 1, kHeight);
          whiteIdx++;
        }
      }

      // Draw black keys
      whiteIdx = 0;
      for (let i = 0; i < 88; i++) {
        const pitch = i + 21;
        const noteInOct = pitch % 12;
        if (whiteKeys.includes(noteInOct)) {
          whiteIdx++;
        } else {
          const kx = (whiteIdx - 1) * keyWidth + keyWidth * 0.65;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(kx, strikeY, keyWidth * 0.7, kHeight * 0.65);
        }
      }

      // Draw falling notes
      const speed = 250; // px per second
      notes.forEach(n => {
        const noteY = strikeY - (n.startTime - currentTime) * speed;
        const noteH = n.duration * speed;

        if (noteY + noteH > 0 && noteY < strikeY + 10) {
          const normPitch = (n.pitch - 21) / 88;
          const nx = normPitch * w;
          const nw = (w / 88) * 1.5;

          // Draw note glow & bar
          ctx.fillStyle = n.color || '#06b6d4';
          ctx.beginPath();
          ctx.roundRect(nx, noteY - noteH, nw, noteH, 4);
          ctx.fill();

          // If note is currently striking the piano
          if (currentTime >= n.startTime && currentTime <= n.startTime + n.duration) {
            ctx.shadowColor = n.color || '#06b6d4';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#fff';
            ctx.fillRect(nx, strikeY - 4, nw, 8);
            ctx.shadowBlur = 0;
          }
        }
      });

      // Strike line
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, strikeY);
      ctx.lineTo(w, strikeY);
      ctx.stroke();

      if (isPlaying) {
        const now = performance.now();
        const delta = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        const prevTime = currentTime;
        currentTime += delta;

        // Sound trigger
        notes.forEach(n => {
          if (prevTime < n.startTime && currentTime >= n.startTime) {
            playNoteSound(n.pitch, n.velocity, n.duration);
          }
        });

        if (currentTime >= totalDuration) {
          currentTime = 0;
          isPlaying = false;
          document.getElementById('play-btn').textContent = 'Play';
        }

        document.getElementById('progress').value = (currentTime / totalDuration) * 100;
        updateTimeDisplay();
      }

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    function updateTimeDisplay() {
      const curM = Math.floor(currentTime / 60);
      const curS = Math.floor(currentTime % 60);
      const totM = Math.floor(totalDuration / 60);
      const totS = Math.floor(totalDuration % 60);
      const pad = (n) => n.toString().padStart(2, '0');
      document.getElementById('time-txt').textContent = pad(curM) + ':' + pad(curS) + ' / ' + pad(totM) + ':' + pad(totS);
    }
    updateTimeDisplay();

    document.getElementById('play-btn').addEventListener('click', () => {
      initAudio();
      isPlaying = !isPlaying;
      lastTimestamp = performance.now();
      document.getElementById('play-btn').textContent = isPlaying ? 'Pause' : 'Play';
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
      isPlaying = false;
      currentTime = 0;
      document.getElementById('play-btn').textContent = 'Play';
      document.getElementById('progress').value = 0;
      updateTimeDisplay();
    });

    document.getElementById('progress').addEventListener('input', (e) => {
      currentTime = (parseFloat(e.target.value) / 100) * totalDuration;
      updateTimeDisplay();
    });

    document.getElementById('demo-btn').addEventListener('click', () => {
      createDemoNotes();
      currentTime = 0;
      updateTimeDisplay();
    });
  </script>
</body>
</html>`;
}

export function downloadStandaloneApp(): void {
  const html = generateStandaloneHtml();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'PianoVision_Offline_App.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
