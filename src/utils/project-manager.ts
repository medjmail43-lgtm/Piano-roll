import { ProjectData, MidiNote, MidiTrack, VisualizerSettings, DEFAULT_VISUAL_SETTINGS } from '../types';

export function createEmptyProject(): ProjectData {
  return {
    version: '1.0.0',
    title: 'New PianoVision Project',
    tempo: 120,
    timeSignature: [4, 4],
    notes: [],
    tracks: [
      {
        id: 0,
        name: 'Track 1',
        channel: 0,
        color: '#3b82f6',
        muted: false,
        solo: false,
        visible: true,
      },
    ],
    visualSettings: { ...DEFAULT_VISUAL_SETTINGS },
    audioSyncOffsetMs: 0,
  };
}

export function saveProjectToJson(project: ProjectData): string {
  return JSON.stringify(project, null, 2);
}

export function downloadProjectFile(project: ProjectData): void {
  const json = saveProjectToJson(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = (project.title || 'Untitled')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  a.href = url;
  a.download = `${safeTitle}.pianovision.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function loadProjectFromFile(file: File): Promise<ProjectData> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed || !Array.isArray(parsed.notes)) {
    throw new Error('Invalid project file: missing notes data');
  }

  const project: ProjectData = {
    version: parsed.version || '1.0.0',
    title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
    tempo: parsed.tempo || 120,
    timeSignature: Array.isArray(parsed.timeSignature) ? parsed.timeSignature : [4, 4],
    notes: parsed.notes,
    tracks: Array.isArray(parsed.tracks) && parsed.tracks.length > 0 ? parsed.tracks : [
      { id: 0, name: 'Piano Track', channel: 0, color: '#3b82f6', muted: false, solo: false, visible: true },
    ],
    visualSettings: {
      ...DEFAULT_VISUAL_SETTINGS,
      ...(parsed.visualSettings || {}),
    },
    audioSyncOffsetMs: parsed.audioSyncOffsetMs || 0,
  };

  return project;
}

// Local storage auto-save fallback key
const LOCAL_STORAGE_KEY = 'pianovision_autosave_state';

export function saveToLocalStorage(project: ProjectData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(project));
  } catch {
    // ignore quota errors
  }
}

export function loadFromLocalStorage(): ProjectData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.notes)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}
