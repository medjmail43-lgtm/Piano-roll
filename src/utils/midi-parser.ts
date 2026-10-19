import { MidiNote, MidiTrack } from '../types';

export interface ParsedMidi {
  title: string;
  bpm: number;
  timeSignature: [number, number];
  tracks: MidiTrack[];
  notes: MidiNote[];
  duration: number; // in seconds
  division: number; // ticks per quarter note
}

class ByteReader {
  private view: DataView;
  public offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  get remaining(): number {
    return this.view.byteLength - this.offset;
  }

  get byteLength(): number {
    return this.view.byteLength;
  }

  readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readUint16(): number {
    const val = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return val;
  }

  readUint32(): number {
    const val = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return val;
  }

  readString(length: number): string {
    let str = '';
    for (let i = 0; i < length; i++) {
      str += String.fromCharCode(this.readUint8());
    }
    return str;
  }

  readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    return bytes;
  }

  readVarInt(): number {
    let result = 0;
    while (true) {
      if (this.offset >= this.view.byteLength) break;
      const b = this.readUint8();
      result = (result << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return result;
  }
}

interface RawEvent {
  tick: number;
  trackId: number;
  type: 'noteOn' | 'noteOff' | 'tempo' | 'timeSignature' | 'trackName';
  channel?: number;
  pitch?: number;
  velocity?: number;
  tempoBpm?: number;
  timeSignature?: [number, number];
  text?: string;
}

const DEFAULT_TRACK_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#eab308', // yellow
];

export function parseMidiFile(buffer: ArrayBuffer, fileName: string = 'Untitled'): ParsedMidi {
  const reader = new ByteReader(buffer);

  // 1. Check Header 'MThd'
  const headerId = reader.readString(4);
  if (headerId !== 'MThd') {
    throw new Error('Invalid MIDI file: Missing MThd header chunk');
  }

  const headerLength = reader.readUint32();
  const format = reader.readUint16();
  const numTracks = reader.readUint16();
  const division = reader.readUint16(); // Ticks per quarter note

  if (headerLength > 6) {
    // Skip any extra header bytes
    reader.offset += headerLength - 6;
  }

  const rawEvents: RawEvent[] = [];
  const trackNames: Map<number, string> = new Map();

  // 2. Parse tracks
  for (let trackIndex = 0; trackIndex < numTracks; trackIndex++) {
    if (reader.remaining < 8) break;

    const trackId = reader.readString(4);
    const trackLength = reader.readUint32();
    const trackEndOffset = reader.offset + trackLength;

    if (trackId !== 'MTrk') {
      // Skip unknown chunk
      reader.offset = Math.min(trackEndOffset, reader.byteLength);
      continue;
    }

    let currentTick = 0;
    let runningStatus = 0;

    while (reader.offset < trackEndOffset && reader.remaining > 0) {
      const delta = reader.readVarInt();
      currentTick += delta;

      let status = reader.readUint8();
      if ((status & 0x80) === 0) {
        // Running status: reuse previous status byte
        reader.offset -= 1;
        status = runningStatus;
      } else {
        runningStatus = status;
      }

      if (status === 0xff) {
        // Meta event
        const metaType = reader.readUint8();
        const length = reader.readVarInt();

        if (metaType === 0x51 && length === 3) {
          // Set tempo: 3 bytes microsec per quarter note
          const b1 = reader.readUint8();
          const b2 = reader.readUint8();
          const b3 = reader.readUint8();
          const mpqn = (b1 << 16) | (b2 << 8) | b3;
          const bpm = Math.round(60000000 / (mpqn || 500000));
          rawEvents.push({ tick: currentTick, trackId: trackIndex, type: 'tempo', tempoBpm: bpm });
        } else if (metaType === 0x58 && length >= 2) {
          // Time signature
          const num = reader.readUint8();
          const denomExp = reader.readUint8();
          const denom = Math.pow(2, denomExp);
          // skip remaining
          if (length > 2) reader.offset += length - 2;
          rawEvents.push({
            tick: currentTick,
            trackId: trackIndex,
            type: 'timeSignature',
            timeSignature: [num, denom],
          });
        } else if (metaType === 0x03) {
          // Track Name
          const name = reader.readString(length);
          trackNames.set(trackIndex, name);
          rawEvents.push({ tick: currentTick, trackId: trackIndex, type: 'trackName', text: name });
        } else {
          // Skip other meta events
          reader.offset += length;
        }
      } else if (status === 0xf0 || status === 0xf7) {
        // Sysex event: skip
        const length = reader.readVarInt();
        reader.offset += length;
      } else {
        // Channel voice message
        const command = status & 0xf0;
        const channel = status & 0x0f;

        if (command === 0x90) {
          // Note On
          const pitch = reader.readUint8();
          const velocity = reader.readUint8();
          if (velocity > 0) {
            rawEvents.push({
              tick: currentTick,
              trackId: trackIndex,
              type: 'noteOn',
              channel,
              pitch,
              velocity,
            });
          } else {
            // Note On with velocity 0 is treated as Note Off
            rawEvents.push({
              tick: currentTick,
              trackId: trackIndex,
              type: 'noteOff',
              channel,
              pitch,
              velocity: 0,
            });
          }
        } else if (command === 0x80) {
          // Note Off
          const pitch = reader.readUint8();
          const velocity = reader.readUint8();
          rawEvents.push({
            tick: currentTick,
            trackId: trackIndex,
            type: 'noteOff',
            channel,
            pitch,
            velocity,
          });
        } else if (command === 0xa0 || command === 0xb0 || command === 0xe0) {
          // 2-byte messages (Polyphonic Key Pressure, Control Change, Pitch Bend)
          reader.offset += 2;
        } else if (command === 0xc0 || command === 0xd0) {
          // 1-byte messages (Program Change, Channel Pressure)
          reader.offset += 1;
        }
      }
    }

    reader.offset = trackEndOffset; // Ensure aligned with chunk end
  }

  // 3. Sort all events by tick
  rawEvents.sort((a, b) => a.tick - b.tick);

  // 4. Build tempo map: convert tick to seconds
  // Standard division is ticks per quarter note
  const ppq = division > 0 ? division : 480;
  let initialBpm = 120;
  let detectedTimeSig: [number, number] = [4, 4];

  // Map each tick transition
  interface TempoSegment {
    startTick: number;
    startTimeSec: number;
    bpm: number;
  }

  const tempoSegments: TempoSegment[] = [{ startTick: 0, startTimeSec: 0, bpm: 120 }];

  for (const ev of rawEvents) {
    if (ev.type === 'tempo' && ev.tempoBpm) {
      if (ev.tick === 0) {
        initialBpm = ev.tempoBpm;
        tempoSegments[0].bpm = ev.tempoBpm;
      } else {
        const lastSeg = tempoSegments[tempoSegments.length - 1];
        const elapsedTicks = ev.tick - lastSeg.startTick;
        const secondsPerTick = 60 / (lastSeg.bpm * ppq);
        const newTimeSec = lastSeg.startTimeSec + elapsedTicks * secondsPerTick;
        tempoSegments.push({
          startTick: ev.tick,
          startTimeSec: newTimeSec,
          bpm: ev.tempoBpm,
        });
      }
    } else if (ev.type === 'timeSignature' && ev.timeSignature) {
      detectedTimeSig = ev.timeSignature;
    }
  }

  function tickToSeconds(tick: number): number {
    // Find active segment
    let seg = tempoSegments[0];
    for (let i = tempoSegments.length - 1; i >= 0; i--) {
      if (tick >= tempoSegments[i].startTick) {
        seg = tempoSegments[i];
        break;
      }
    }
    const elapsedTicks = tick - seg.startTick;
    const secondsPerTick = 60 / (seg.bpm * ppq);
    return seg.startTimeSec + elapsedTicks * secondsPerTick;
  }

  // 5. Match Note On with Note Off
  interface ActiveNote {
    pitch: number;
    startTick: number;
    velocity: number;
    channel: number;
    trackId: number;
  }

  const activeNotes: Map<string, ActiveNote[]> = new Map();
  const notes: MidiNote[] = [];
  let noteCounter = 0;

  for (const ev of rawEvents) {
    if (ev.type === 'noteOn' && ev.pitch !== undefined && ev.velocity !== undefined) {
      const key = `${ev.trackId}-${ev.channel ?? 0}-${ev.pitch}`;
      let list = activeNotes.get(key);
      if (!list) {
        list = [];
        activeNotes.set(key, list);
      }
      list.push({
        pitch: ev.pitch,
        startTick: ev.tick,
        velocity: ev.velocity,
        channel: ev.channel ?? 0,
        trackId: ev.trackId,
      });
    } else if (ev.type === 'noteOff' && ev.pitch !== undefined) {
      const key = `${ev.trackId}-${ev.channel ?? 0}-${ev.pitch}`;
      const list = activeNotes.get(key);
      if (list && list.length > 0) {
        const start = list.shift()!;
        const startSec = tickToSeconds(start.startTick);
        const endSec = tickToSeconds(ev.tick);
        const durationSec = Math.max(0.05, endSec - startSec);

        notes.push({
          id: `note-${++noteCounter}`,
          pitch: start.pitch,
          startTime: Number(startSec.toFixed(4)),
          duration: Number(durationSec.toFixed(4)),
          velocity: start.velocity,
          trackId: start.trackId,
        });
      }
    }
  }

  // Close any dangling unclosed notes with a standard duration (0.5s)
  activeNotes.forEach((list) => {
    for (const start of list) {
      const startSec = tickToSeconds(start.startTick);
      notes.push({
        id: `note-${++noteCounter}`,
        pitch: start.pitch,
        startTime: Number(startSec.toFixed(4)),
        duration: 0.5,
        velocity: start.velocity,
        trackId: start.trackId,
      });
    }
  });

  // Calculate total duration
  let maxTime = 0;
  for (const n of notes) {
    const end = n.startTime + n.duration;
    if (end > maxTime) maxTime = end;
  }
  const totalDuration = Math.max(4, Math.ceil(maxTime + 1));

  // 6. Build track list
  const trackIdSet = new Set<number>();
  notes.forEach((n) => trackIdSet.add(n.trackId));
  if (trackIdSet.size === 0) trackIdSet.add(0);

  const sortedTrackIds = Array.from(trackIdSet).sort((a, b) => a - b);
  const tracks: MidiTrack[] = sortedTrackIds.map((tid, idx) => {
    const name = trackNames.get(tid) || `Track ${tid + 1}`;
    const color = DEFAULT_TRACK_COLORS[idx % DEFAULT_TRACK_COLORS.length];
    return {
      id: tid,
      name,
      channel: idx % 16,
      color,
      muted: false,
      solo: false,
      visible: true,
    };
  });

  // Sort notes chronologically
  notes.sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);

  const cleanTitle = fileName.replace(/\.[^/.]+$/, '').trim() || 'Imported MIDI';

  return {
    title: cleanTitle,
    bpm: initialBpm,
    timeSignature: detectedTimeSig,
    tracks,
    notes,
    duration: totalDuration,
    division: ppq,
  };
}
