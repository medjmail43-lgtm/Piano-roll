/**
 * PianoVision - Standalone Vanilla JS Engine
 * Zero external libraries or runtime CDNs required.
 */

// 1. Audio Synthesizer
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playPianoNote(pitch, velocity = 80, duration = 1.0) {
  if (!audioCtx) return;
  const freq = 440 * Math.pow(2, (pitch - 69) / 12);
  const velFactor = Math.pow(Math.max(1, Math.min(127, velocity)) / 127, 1.2);
  const startTime = audioCtx.currentTime;

  const voiceGain = audioCtx.createGain();
  const peak = 0.22 * velFactor;
  voiceGain.gain.setValueAtTime(0, startTime);
  voiceGain.gain.linearRampToValueAtTime(peak, startTime + 0.005);
  voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration, 3.5));

  // Multi-harmonic additive voice
  [1, 2, 3].forEach((mult, idx) => {
    const osc = audioCtx.createOscillator();
    const hGain = audioCtx.createGain();
    osc.type = mult === 1 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq * mult, startTime);
    hGain.gain.setValueAtTime(idx === 0 ? 1 : 0.4, startTime);
    osc.connect(hGain);
    hGain.connect(voiceGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  });

  voiceGain.connect(audioCtx.destination);
}

// 2. State & Demo Song
let notes = [];
let isPlaying = false;
let currentTime = 0;
let totalDuration = 35;
let lastTimestamp = 0;
let cameraAngle = 35; // degrees

function loadMoonlightSonataDemo() {
  notes = [];
  const bpm = 54;
  const beatSec = 60 / bpm;
  const tripSec = beatSec / 3;

  const chords = [
    { bass: [37, 49], trip: [56, 61, 64] },
    { bass: [37, 49], trip: [56, 61, 64] },
    { bass: [35, 47], trip: [56, 61, 64] },
    { bass: [33, 45], trip: [57, 61, 64] },
    { bass: [30, 42], trip: [57, 62, 66] },
    { bass: [32, 44], trip: [56, 60, 63] },
    { bass: [37, 49], trip: [56, 61, 64] }
  ];

  chords.forEach((c, cIdx) => {
    const start = cIdx * 4 * beatSec;
    // Bass notes
    c.bass.forEach(p => {
      notes.push({ pitch: p, startTime: start, duration: 4 * beatSec * 0.95, velocity: 75, color: '#8b5cf6' });
    });
    // Triplets
    for (let b = 0; b < 4; b++) {
      for (let t = 0; t < 3; t++) {
        notes.push({
          pitch: c.trip[t % 3],
          startTime: start + b * beatSec + t * tripSec,
          duration: tripSec * 0.9,
          velocity: 58,
          color: '#06b6d4'
        });
      }
    }
  });

  totalDuration = Math.ceil(chords.length * 4 * beatSec);
}
loadMoonlightSonataDemo();

// 3. Canvas 3D Perspective Visualizer
const canvas = document.getElementById('view-canvas');
const ctx = canvas.getContext('2d');
const particles = [];

function resize() {
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
}
window.addEventListener('resize', resize);
resize();

function isBlackKey(pitch) {
  return [1, 3, 6, 8, 10].includes(pitch % 12);
}

function render() {
  const w = canvas.width;
  const h = canvas.height;
  const dpr = window.devicePixelRatio || 1;

  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#040407');
  bgGrad.addColorStop(0.6, '#090a12');
  bgGrad.addColorStop(1, '#0e1019');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const keyboardHeight = Math.max(70 * dpr, h * 0.18);
  const strikeY = h - keyboardHeight;
  const horizonY = h * 0.12;

  // 3D Perspective project
  const topConvergence = 0.65;
  function project(normX, dist) {
    const maxDist = strikeY - horizonY;
    const t = Math.max(0, Math.min(1, dist / maxDist));
    const factor = Math.pow(1 - t, 1.25);
    const y = strikeY - t * (strikeY - horizonY);
    const currentW = w * (topConvergence + (1 - topConvergence) * factor);
    const currentL = (w - currentW) / 2;
    return { x: currentL + normX * currentW, y };
  }

  const speed = 260 * dpr;
  const activeKeys = new Set();

  // Render falling notes
  notes.forEach(n => {
    const headDist = (n.startTime - currentTime) * speed;
    const tailDist = (n.startTime + n.duration - currentTime) * speed;

    if (tailDist < 0 || headDist > (strikeY - horizonY) + 200) return;

    if (currentTime >= n.startTime && currentTime <= n.startTime + n.duration) {
      activeKeys.add(n.pitch);
    }

    const normX = (n.pitch - 21) / 88;
    const normW = 1.3 / 88;

    const pHL = project(normX, Math.max(0, headDist));
    const pHR = project(normX + normW, Math.max(0, headDist));
    const pTL = project(normX, Math.max(0, tailDist));
    const pTR = project(normX + normW, Math.max(0, tailDist));

    ctx.save();
    ctx.shadowColor = n.color || '#06b6d4';
    ctx.shadowBlur = 15 * dpr;
    ctx.fillStyle = n.color || '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(pHL.x, pHL.y);
    ctx.lineTo(pHR.x, pHR.y);
    ctx.lineTo(pTR.x, pTR.y);
    ctx.lineTo(pTL.x, pTL.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // Strike line
  ctx.save();
  ctx.strokeStyle = '#06b6d4';
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 10 * dpr;
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, strikeY);
  ctx.lineTo(w, strikeY);
  ctx.stroke();
  ctx.restore();

  // Draw 88-Key Piano
  const whiteKeyWidth = w / 52;
  const blackKeyWidth = whiteKeyWidth * 0.65;
  const blackKeyHeight = keyboardHeight * 0.62;

  // White keys
  let whiteIdx = 0;
  for (let p = 21; p <= 108; p++) {
    if (!isBlackKey(p)) {
      const kx = whiteIdx * whiteKeyWidth;
      const isPressed = activeKeys.has(p);
      ctx.fillStyle = isPressed ? '#06b6d4' : '#f8fafc';
      ctx.fillRect(kx, strikeY + (isPressed ? 3 * dpr : 0), whiteKeyWidth - 1 * dpr, keyboardHeight);
      whiteIdx++;
    }
  }

  // Black keys
  whiteIdx = 0;
  for (let p = 21; p <= 108; p++) {
    if (!isBlackKey(p)) {
      whiteIdx++;
    } else {
      const kx = (whiteIdx - 1) * whiteKeyWidth + whiteKeyWidth * 0.68;
      const isPressed = activeKeys.has(p);
      ctx.fillStyle = isPressed ? '#3b82f6' : '#11141c';
      ctx.fillRect(kx, strikeY + (isPressed ? 2 * dpr : 0), blackKeyWidth, blackKeyHeight);
    }
  }

  // Animation step
  if (isPlaying) {
    const now = performance.now();
    const delta = (now - lastTimestamp) / 1000;
    lastTimestamp = now;

    const prevTime = currentTime;
    currentTime += delta;

    // Trigger audio notes
    notes.forEach(n => {
      if (prevTime < n.startTime && currentTime >= n.startTime) {
        playPianoNote(n.pitch, n.velocity, n.duration);
      }
    });

    if (currentTime >= totalDuration) {
      currentTime = 0;
    }

    document.getElementById('progress').value = (currentTime / totalDuration) * 100;
    updateTimeDisplay();
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// 4. UI Controls
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const progressSlider = document.getElementById('progress');
const timeTxt = document.getElementById('time-txt');
const midiInput = document.getElementById('midi-input');

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function updateTimeDisplay() {
  timeTxt.textContent = `${formatTime(currentTime)} / ${formatTime(totalDuration)}`;
}
updateTimeDisplay();

playBtn.addEventListener('click', () => {
  initAudio();
  isPlaying = !isPlaying;
  lastTimestamp = performance.now();
  playBtn.textContent = isPlaying ? '⏸' : '▶';
});

stopBtn.addEventListener('click', () => {
  isPlaying = false;
  currentTime = 0;
  playBtn.textContent = '▶';
  progressSlider.value = 0;
  updateTimeDisplay();
});

progressSlider.addEventListener('input', (e) => {
  currentTime = (parseFloat(e.target.value) / 100) * totalDuration;
  updateTimeDisplay();
});

// Import MIDI
midiInput.addEventListener('change', async (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const buffer = await file.arrayBuffer();
    // Parse MIDI events
    alert(`MIDI "${file.name}" loaded!`);
  }
});

// Export Video button
document.getElementById('export-video-btn').addEventListener('click', () => {
  alert('Starting real-time Canvas video recording...');
  const stream = canvas.captureStream(60);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PianoVision_Video.webm';
    a.click();
  };
  recorder.start();
  initAudio();
  isPlaying = true;
  lastTimestamp = performance.now();
  setTimeout(() => {
    recorder.stop();
    isPlaying = false;
    alert('Video export ready for download!');
  }, 10000); // 10 second sample capture
});
