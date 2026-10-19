import { MidiNote, MidiTrack } from '../types';

export interface DemoSong {
  id: string;
  title: string;
  composer: string;
  bpm: number;
  timeSignature: [number, number];
  tracks: MidiTrack[];
  notes: MidiNote[];
  duration: number;
  description: string;
}

// 1. Beethoven - Moonlight Sonata (Op. 27 No. 2, 1st Mvt)
function generateMoonlightSonata(): { tracks: MidiTrack[]; notes: MidiNote[]; duration: number } {
  const tracks: MidiTrack[] = [
    { id: 0, name: 'Triplets Accompaniment', channel: 0, color: '#3b82f6', muted: false, solo: false, visible: true },
    { id: 1, name: 'Melody Voice', channel: 1, color: '#ec4899', muted: false, solo: false, visible: true },
    { id: 2, name: 'Bass Octaves', channel: 2, color: '#8b5cf6', muted: false, solo: false, visible: true },
  ];

  const notes: MidiNote[] = [];
  let idCount = 0;
  const bpm = 54;
  const beatSec = 60 / bpm; // ~1.11s per beat, 4 beats per bar (~4.44s)
  const tripSec = beatSec / 3;

  // Pattern repeats across chords: C#m, C#m/B, A, F#m, G#7, C#m
  const chordPatterns = [
    // Bar 1: C#m (Bass: C#1-C#2, Triplets: G#3, C#4, E4)
    { bass: [37, 49], trip: [56, 61, 64] },
    // Bar 2: C#m
    { bass: [37, 49], trip: [56, 61, 64] },
    // Bar 3: C#m/B (Bass: B0-B1, Triplets: G#3, C#4, E4)
    { bass: [35, 47], trip: [56, 61, 64] },
    // Bar 4: A major (Bass: A0-A1, Triplets: A3, C#4, E4)
    { bass: [33, 45], trip: [57, 61, 64] },
    // Bar 5: F#m (Bass: F#0-F#1, Triplets: A3, D4, F#4)
    { bass: [30, 42], trip: [57, 62, 66] },
    // Bar 6: G#7 (Bass: G#0-G#1, Triplets: G#3, C4, D#4, F#4)
    { bass: [32, 44], trip: [56, 60, 63] },
    // Bar 7: C#m
    { bass: [37, 49], trip: [56, 61, 64] },
    // Bar 8: C#m
    { bass: [37, 49], trip: [56, 61, 64] },
  ];

  chordPatterns.forEach((chord, barIdx) => {
    const barStart = barIdx * 4 * beatSec;

    // Bass octaves (held for full bar)
    chord.bass.forEach((p) => {
      notes.push({
        id: `ms-${++idCount}`,
        pitch: p,
        startTime: Number(barStart.toFixed(3)),
        duration: Number((4 * beatSec * 0.95).toFixed(3)),
        velocity: 68,
        trackId: 2,
      });
    });

    // 4 beats of triplets = 12 triplet notes
    for (let beat = 0; beat < 4; beat++) {
      for (let t = 0; t < 3; t++) {
        const notePitch = chord.trip[t % chord.trip.length];
        const tStart = barStart + beat * beatSec + t * tripSec;
        notes.push({
          id: `ms-${++idCount}`,
          pitch: notePitch,
          startTime: Number(tStart.toFixed(3)),
          duration: Number((tripSec * 0.92).toFixed(3)),
          velocity: 52 + (t === 0 ? 8 : 0),
          trackId: 0,
        });
      }
    }
  });

  // Haunting Melody (starts Bar 5 beat 3)
  const melodyEvents = [
    { bar: 4, beat: 2.66, pitch: 68, dur: 1.33, vel: 85 }, // G#4
    { bar: 5, beat: 0, pitch: 68, dur: 2.0, vel: 88 },
    { bar: 5, beat: 2.66, pitch: 68, dur: 1.33, vel: 86 },
    { bar: 6, beat: 0, pitch: 68, dur: 1.0, vel: 88 },
    { bar: 6, beat: 1, pitch: 67, dur: 0.66, vel: 84 },
    { bar: 6, beat: 2, pitch: 68, dur: 1.0, vel: 87 },
    { bar: 6, beat: 3, pitch: 69, dur: 1.0, vel: 90 },
    { bar: 7, beat: 0, pitch: 68, dur: 3.5, vel: 92 },
  ];

  melodyEvents.forEach((m) => {
    const mStart = m.bar * 4 * beatSec + m.beat * beatSec;
    notes.push({
      id: `ms-${++idCount}`,
      pitch: m.pitch,
      startTime: Number(mStart.toFixed(3)),
      duration: Number((m.dur * beatSec).toFixed(3)),
      velocity: m.vel,
      trackId: 1,
    });
  });

  const totalDuration = Math.ceil(chordPatterns.length * 4 * beatSec + 2);
  return { tracks, notes, duration: totalDuration };
}

// 2. Beethoven - Für Elise (Iconic Theme)
function generateFurElise(): { tracks: MidiTrack[]; notes: MidiNote[]; duration: number } {
  const tracks: MidiTrack[] = [
    { id: 0, name: 'Right Hand', channel: 0, color: '#06b6d4', muted: false, solo: false, visible: true },
    { id: 1, name: 'Left Hand (Arpeggio)', channel: 1, color: '#f59e0b', muted: false, solo: false, visible: true },
  ];

  const notes: MidiNote[] = [];
  let idCount = 0;
  const bpm = 128;
  const beatSec = 60 / bpm; // 3/8 time signature: 1 eighth note = beatSec / 2
  const eighth = beatSec / 2;

  // Famous main theme right hand: E5 - D#5 - E5 - D#5 - E5 - B4 - D5 - C5 - A4
  const mainRiff = [
    { p: 76, d: 1 }, // E5
    { p: 75, d: 1 }, // D#5
    { p: 76, d: 1 }, // E5
    { p: 75, d: 1 }, // D#5
    { p: 76, d: 1 }, // E5
    { p: 71, d: 1 }, // B4
    { p: 74, d: 1 }, // D5
    { p: 72, d: 1 }, // C5
    { p: 69, d: 2 }, // A4
  ];

  // Repeat theme twice
  let time = 0;
  for (let rep = 0; rep < 2; rep++) {
    mainRiff.forEach((n) => {
      notes.push({
        id: `fe-${++idCount}`,
        pitch: n.p,
        startTime: Number(time.toFixed(3)),
        duration: Number((n.d * eighth * 0.9).toFixed(3)),
        velocity: 82,
        trackId: 0,
      });
      time += n.d * eighth;
    });

    // Left hand arpeggio answer (A minor: A2 - E3 - A3 - C4)
    const lhStart = time - 2 * eighth;
    [45, 52, 57, 60].forEach((p, idx) => {
      notes.push({
        id: `fe-${++idCount}`,
        pitch: p,
        startTime: Number((lhStart + idx * eighth).toFixed(3)),
        duration: Number((eighth * 0.9).toFixed(3)),
        velocity: 68,
        trackId: 1,
      });
    });

    time += 2 * eighth;

    // Follow-up right hand phrase: C4 - E4 - A4 - B4
    [60, 64, 69, 71].forEach((p, idx) => {
      notes.push({
        id: `fe-${++idCount}`,
        pitch: p,
        startTime: Number((time + idx * eighth).toFixed(3)),
        duration: Number((eighth * 0.9).toFixed(3)),
        velocity: 80,
        trackId: 0,
      });
    });
    time += 4 * eighth;

    // Left hand answer (E major: E2 - E3 - G#3 - B3 - D4)
    [40, 52, 56, 59].forEach((p, idx) => {
      notes.push({
        id: `fe-${++idCount}`,
        pitch: p,
        startTime: Number((time + idx * eighth).toFixed(3)),
        duration: Number((eighth * 0.9).toFixed(3)),
        velocity: 66,
        trackId: 1,
      });
    });
    time += 4 * eighth;
  }

  return { tracks, notes, duration: Math.ceil(time + 2) };
}

// 3. Cyberpunk Arpeggio (Modern Neon Showcase)
function generateCyberpunkArp(): { tracks: MidiTrack[]; notes: MidiNote[]; duration: number } {
  const tracks: MidiTrack[] = [
    { id: 0, name: 'Lead Arp', channel: 0, color: '#ec4899', muted: false, solo: false, visible: true },
    { id: 1, name: 'Driving Bass', channel: 1, color: '#06b6d4', muted: false, solo: false, visible: true },
    { id: 2, name: 'Atmospheric Chords', channel: 2, color: '#a855f7', muted: false, solo: false, visible: true },
  ];

  const notes: MidiNote[] = [];
  let idCount = 0;
  const bpm = 125;
  const beatSec = 60 / bpm; // ~0.48s
  const sixteenth = beatSec / 4;

  const chords = [
    { root: 36, chordNotes: [48, 55, 60, 63, 67, 72, 75, 79] }, // C minor
    { root: 32, chordNotes: [44, 51, 56, 60, 63, 68, 72, 75] }, // Ab major
    { root: 34, chordNotes: [46, 53, 58, 62, 65, 70, 74, 77] }, // Bb major
    { root: 31, chordNotes: [43, 50, 55, 59, 62, 67, 71, 74] }, // G minor
  ];

  let time = 0;
  // 2 cycles
  for (let loop = 0; loop < 2; loop++) {
    chords.forEach((c) => {
      const chordStart = time;
      const barDuration = 4 * beatSec;

      // Bassline (pumping 8th notes)
      for (let b = 0; b < 8; b++) {
        notes.push({
          id: `cb-${++idCount}`,
          pitch: c.root,
          startTime: Number((chordStart + b * (beatSec / 2)).toFixed(3)),
          duration: Number(((beatSec / 2) * 0.85).toFixed(3)),
          velocity: b % 2 === 0 ? 100 : 75,
          trackId: 1,
        });
      }

      // Sustained chord pad
      [c.chordNotes[0], c.chordNotes[2], c.chordNotes[4]].forEach((p) => {
        notes.push({
          id: `cb-${++idCount}`,
          pitch: p,
          startTime: Number(chordStart.toFixed(3)),
          duration: Number((barDuration * 0.95).toFixed(3)),
          velocity: 65,
          trackId: 2,
        });
      });

      // 16th note arpeggiator cascade
      for (let s = 0; s < 16; s++) {
        const noteIndex = s % c.chordNotes.length;
        const pitch = c.chordNotes[noteIndex];
        notes.push({
          id: `cb-${++idCount}`,
          pitch,
          startTime: Number((chordStart + s * sixteenth).toFixed(3)),
          duration: Number((sixteenth * 0.88).toFixed(3)),
          velocity: 80 + (s % 4 === 0 ? 18 : 0),
          trackId: 0,
        });
      }

      time += barDuration;
    });
  }

  return { tracks, notes, duration: Math.ceil(time + 2) };
}

// 4. Scott Joplin - The Entertainer
function generateTheEntertainer(): { tracks: MidiTrack[]; notes: MidiNote[]; duration: number } {
  const tracks: MidiTrack[] = [
    { id: 0, name: 'Ragtime Melody', channel: 0, color: '#f59e0b', muted: false, solo: false, visible: true },
    { id: 1, name: 'Stride Bass', channel: 1, color: '#10b981', muted: false, solo: false, visible: true },
  ];

  const notes: MidiNote[] = [];
  let idCount = 0;
  const bpm = 135;
  const beatSec = 60 / bpm;
  const sixteenth = beatSec / 4;

  // Intro pick-up: D4, D#4, E4, C5, E4, C5, E4, C5
  const introRiff = [
    { p: 62, d: 1 },
    { p: 63, d: 1 },
    { p: 64, d: 1 },
    { p: 72, d: 2 },
    { p: 64, d: 1 },
    { p: 72, d: 2 },
    { p: 64, d: 1 },
    { p: 72, d: 3 },
  ];

  let time = 0;
  introRiff.forEach((n) => {
    notes.push({
      id: `te-${++idCount}`,
      pitch: n.p,
      startTime: Number(time.toFixed(3)),
      duration: Number((n.d * sixteenth * 0.85).toFixed(3)),
      velocity: 88,
      trackId: 0,
    });
    time += n.d * sixteenth;
  });

  // Stride accompaniment: Bass on beat 1 & 3, chord on beat 2 & 4
  for (let bar = 0; bar < 4; bar++) {
    const barStart = time;
    // Beat 1: Bass C2
    notes.push({
      id: `te-${++idCount}`,
      pitch: 36,
      startTime: Number(barStart.toFixed(3)),
      duration: Number((beatSec * 0.6).toFixed(3)),
      velocity: 85,
      trackId: 1,
    });
    // Beat 2: Chord E3-G3-C4
    [52, 55, 60].forEach((p) => {
      notes.push({
        id: `te-${++idCount}`,
        pitch: p,
        startTime: Number((barStart + beatSec).toFixed(3)),
        duration: Number((beatSec * 0.5).toFixed(3)),
        velocity: 70,
        trackId: 1,
      });
    });
    // Beat 3: Bass G2
    notes.push({
      id: `te-${++idCount}`,
      pitch: 43,
      startTime: Number((barStart + 2 * beatSec).toFixed(3)),
      duration: Number((beatSec * 0.6).toFixed(3)),
      velocity: 85,
      trackId: 1,
    });
    // Beat 4: Chord E3-G3-C4
    [52, 55, 60].forEach((p) => {
      notes.push({
        id: `te-${++idCount}`,
        pitch: p,
        startTime: Number((barStart + 3 * beatSec).toFixed(3)),
        duration: Number((beatSec * 0.5).toFixed(3)),
        velocity: 70,
        trackId: 1,
      });
    });

    time += 4 * beatSec;
  }

  return { tracks, notes, duration: Math.ceil(time + 2) };
}

export const DEMO_SONGS: DemoSong[] = [
  {
    id: 'moonlight-sonata',
    title: 'Moonlight Sonata (Op. 27 No. 2)',
    composer: 'Ludwig van Beethoven',
    bpm: 54,
    timeSignature: [4, 4],
    ...generateMoonlightSonata(),
    description: 'Adagio sostenuto with flowing right-hand triplets and deep bass octaves in C# minor.',
  },
  {
    id: 'fur-elise',
    title: 'Für Elise (Bagatelle in A Minor)',
    composer: 'Ludwig van Beethoven',
    bpm: 128,
    timeSignature: [3, 8],
    ...generateFurElise(),
    description: 'Iconic classical theme with playful semitone alternation and arpeggiated left hand.',
  },
  {
    id: 'cyberpunk-arp',
    title: 'Cyberpunk Neon Arpeggio',
    composer: 'PianoVision Studio',
    bpm: 125,
    timeSignature: [4, 4],
    ...generateCyberpunkArp(),
    description: 'High-energy electronic cascade showcasing multi-track glowing waterfall notes.',
  },
  {
    id: 'the-entertainer',
    title: 'The Entertainer (Ragtime Classic)',
    composer: 'Scott Joplin',
    bpm: 135,
    timeSignature: [4, 4],
    ...generateTheEntertainer(),
    description: 'Bouncy syncopated ragtime standard featuring energetic stride bass.',
  },
];
