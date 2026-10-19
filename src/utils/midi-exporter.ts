import { MidiNote, MidiTrack } from '../types';

function writeVarInt(value: number): number[] {
  const bytes: number[] = [];
  let buffer = value & 0x7f;
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= 0x80;
    buffer += value & 0x7f;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
  return bytes;
}

function writeUint16(val: number): number[] {
  return [(val >> 8) & 0xff, val & 0xff];
}

function writeUint32(val: number): number[] {
  return [(val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff];
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}

export function exportToMidiBuffer(
  notes: MidiNote[],
  tracks: MidiTrack[],
  bpm: number = 120,
  timeSignature: [number, number] = [4, 4]
): Uint8Array {
  const ppq = 480; // Standard pulses per quarter note

  // Group notes by trackId
  const trackNotesMap = new Map<number, MidiNote[]>();
  for (const t of tracks) {
    trackNotesMap.set(t.id, []);
  }
  for (const n of notes) {
    let list = trackNotesMap.get(n.trackId);
    if (!list) {
      list = [];
      trackNotesMap.set(n.trackId, list);
    }
    list.push(n);
  }

  const encodedTracks: number[][] = [];

  // 1. Tempo & Conductor Track (Track 0)
  const tempoTrackEvents: number[] = [];
  // Delta time 0: Track Name
  tempoTrackEvents.push(...writeVarInt(0));
  tempoTrackEvents.push(0xff, 0x03);
  const conductorName = stringToBytes('PianoVision Master Track');
  tempoTrackEvents.push(...writeVarInt(conductorName.length), ...conductorName);

  // Delta time 0: Time Signature (num, log2(denom), 24 clocks/metronome, 8 32nd-notes/beat)
  tempoTrackEvents.push(...writeVarInt(0));
  tempoTrackEvents.push(0xff, 0x58, 0x04);
  const denomPower = Math.round(Math.log2(timeSignature[1] || 4));
  tempoTrackEvents.push(timeSignature[0] || 4, denomPower, 24, 8);

  // Delta time 0: Set Tempo (microsec per quarter note)
  const mpqn = Math.round(60000000 / (bpm || 120));
  tempoTrackEvents.push(...writeVarInt(0));
  tempoTrackEvents.push(0xff, 0x51, 0x03);
  tempoTrackEvents.push((mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff);

  // End of Track
  tempoTrackEvents.push(...writeVarInt(0));
  tempoTrackEvents.push(0xff, 0x2f, 0x00);
  encodedTracks.push(tempoTrackEvents);

  // 2. Music Tracks
  const secondsToTicks = (sec: number) => Math.round(sec * ((bpm * ppq) / 60));

  tracks.forEach((track, trackIdx) => {
    const trackNotes = trackNotesMap.get(track.id) || [];
    const events: { tick: number; type: 'on' | 'off'; pitch: number; velocity: number }[] = [];

    for (const n of trackNotes) {
      const startTick = secondsToTicks(n.startTime);
      const endTick = secondsToTicks(n.startTime + n.duration);
      events.push({
        tick: Math.max(0, startTick),
        type: 'on',
        pitch: Math.min(127, Math.max(0, n.pitch)),
        velocity: Math.min(127, Math.max(1, n.velocity || 80)),
      });
      events.push({
        tick: Math.max(0, endTick),
        type: 'off',
        pitch: Math.min(127, Math.max(0, n.pitch)),
        velocity: 0,
      });
    }

    // Sort events by tick (note off before note on at the same tick)
    events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type === 'off' && b.type === 'on') return -1;
      if (a.type === 'on' && b.type === 'off') return 1;
      return 0;
    });

    const trackEvents: number[] = [];

    // Track Name
    trackEvents.push(...writeVarInt(0));
    trackEvents.push(0xff, 0x03);
    const trackNameBytes = stringToBytes(track.name || `Piano Track ${trackIdx + 1}`);
    trackEvents.push(...writeVarInt(trackNameBytes.length), ...trackNameBytes);

    let lastTick = 0;
    const channel = track.channel % 16;
    const noteOnStatus = 0x90 | channel;
    const noteOffStatus = 0x80 | channel;

    for (const ev of events) {
      const delta = Math.max(0, ev.tick - lastTick);
      trackEvents.push(...writeVarInt(delta));
      lastTick = ev.tick;

      if (ev.type === 'on') {
        trackEvents.push(noteOnStatus, ev.pitch, ev.velocity);
      } else {
        trackEvents.push(noteOffStatus, ev.pitch, 0);
      }
    }

    // End of track meta event
    trackEvents.push(...writeVarInt(0));
    trackEvents.push(0xff, 0x2f, 0x00);

    encodedTracks.push(trackEvents);
  });

  // 3. Assemble complete MIDI file bytes
  const fileBytes: number[] = [];

  // MThd chunk
  fileBytes.push(...stringToBytes('MThd'));
  fileBytes.push(...writeUint32(6)); // Header length always 6
  fileBytes.push(...writeUint16(1)); // Format 1 (multitrack synchronous)
  fileBytes.push(...writeUint16(encodedTracks.length)); // Num tracks
  fileBytes.push(...writeUint16(ppq)); // Division (PPQ)

  // MTrk chunks
  for (const trackData of encodedTracks) {
    fileBytes.push(...stringToBytes('MTrk'));
    fileBytes.push(...writeUint32(trackData.length));
    fileBytes.push(...trackData);
  }

  return new Uint8Array(fileBytes);
}

export function downloadMidiFile(
  notes: MidiNote[],
  tracks: MidiTrack[],
  bpm: number,
  timeSignature: [number, number],
  fileName: string = 'PianoVision_Export.mid'
): void {
  const bytes = exportToMidiBuffer(notes, tracks, bpm, timeSignature);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.mid') ? fileName : `${fileName}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
