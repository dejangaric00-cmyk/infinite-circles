// src/utils/archive.ts
//
// Archive.org domain logic: liked/history storage plus resolving an item to a
// playable audio file. Kept apart from the ArchiveRadio component so that the
// LikeSidebar can start a track from any page, whether or not the full radio
// UI is mounted.

import { load, setTrack } from './player';

/** Exported so listeners can filter cross-tab `storage` events. */
export const LIKED_KEY = 'ic_rp_liked_v2';
const HISTORY_KEY = 'ic_rp_history_v2';
const HISTORY_MAX = 15;

/** Shape returned by the archive.org advancedsearch endpoint. */
export interface ArchiveDoc {
  identifier: string;
  title?: string;
  creator?: string;
}

export interface StoredTrack {
  id: string;
  title: string;
  artist: string;
  ts: number;
}

/** Fired whenever the liked list changes, so the sidebar can repaint. */
export const LIKED_CHANGED = 'ic:liked-changed';
/** Fired whenever the history changes. */
export const HISTORY_CHANGED = 'ic:history-changed';
/**
 * Request the next archive track. The queue lives in the ArchiveRadio UI, so
 * this is a no-op on pages where that component is not mounted.
 */
export const ARCHIVE_NEXT = 'ic:archive-next';

/** Ask the archive queue to advance, from anywhere. */
export function requestNext(): void {
  window.dispatchEvent(new Event(ARCHIVE_NEXT));
}

function read(key: string): StoredTrack[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function write(key: string, value: StoredTrack[]): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

// ── Liked ────────────────────────────────────────────────────────────────────

export function loadLiked(): StoredTrack[] {
  return read(LIKED_KEY);
}

export function saveLiked(list: StoredTrack[]): void {
  write(LIKED_KEY, list);
  window.dispatchEvent(new Event(LIKED_CHANGED));
}

export function isLiked(id: string): boolean {
  return loadLiked().some(x => x.id === id);
}

/** Toggles and returns the new liked state. */
export function toggleLike(id: string, title: string, artist: string): boolean {
  if (!id) return false;
  const liked = loadLiked();
  const idx = liked.findIndex(x => x.id === id);
  if (idx >= 0) {
    liked.splice(idx, 1);
    saveLiked(liked);
    return false;
  }
  liked.unshift({ id, title, artist, ts: Date.now() });
  saveLiked(liked);
  return true;
}

// ── History ──────────────────────────────────────────────────────────────────

export function loadHistory(): StoredTrack[] {
  return read(HISTORY_KEY);
}

export function clearHistory(): void {
  write(HISTORY_KEY, []);
  window.dispatchEvent(new Event(HISTORY_CHANGED));
}

export function addToHistory(id: string, title: string, artist: string): void {
  if (!id || title === '—') return;
  const history = loadHistory();
  if (history.length && history[0].id === id) return;
  history.unshift({ id, title, artist, ts: Date.now() });
  if (history.length > HISTORY_MAX) history.pop();
  write(HISTORY_KEY, history);
  window.dispatchEvent(new Event(HISTORY_CHANGED));
}

// ── Resolving playable audio ─────────────────────────────────────────────────

/**
 * Picks a playable file from an archive.org item. Prefers original mp3s over
 * derivatives, falls back to ogg. Returns null when the item has no audio.
 */
export async function getAudioFile(identifier: string): Promise<string | null> {
  const resp = await fetch(`https://archive.org/metadata/${identifier}/files`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const files: any[] = data?.result ?? [];
  const mp3s = files.filter((f: any) => f.name && /\.mp3$/i.test(f.name) && f.source !== 'derivative');
  const oggs = files.filter((f: any) => f.name && /\.ogg$/i.test(f.name));
  const pick = mp3s.length ? mp3s : oggs;
  if (!pick.length) return null;
  const f = pick[Math.floor(Math.random() * Math.min(3, pick.length))];
  return `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`;
}

export interface PlayResult {
  ok: boolean;
  /** Set when the item exists but holds no playable audio. */
  reason?: 'no-audio' | 'unavailable';
}

/**
 * Resolves an item and hands it to the engine. Safe to call from anywhere —
 * no ArchiveRadio UI required.
 */
export async function playDoc(doc: ArchiveDoc, autoplay = true): Promise<PlayResult> {
  const id = doc.identifier ?? '';
  if (!id) return { ok: false, reason: 'unavailable' };

  const title  = doc.title   ?? id;
  const artist = doc.creator ?? 'Archive.org';
  const link   = `https://archive.org/details/${id}`;

  // Show the new track straight away — resolving the file takes a moment.
  setTrack({ title, artist, album: '', cover: '', link });

  try {
    const src = await getAudioFile(id);
    if (!src) return { ok: false, reason: 'no-audio' };
    await load({ source: 'archive', src, track: { title, artist, album: '', cover: '', link } }, autoplay);
    if (autoplay) addToHistory(id, title, artist);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

// ── Formatting helpers, shared by the radio UI and the sidebar ───────────────

export function fmtTime(sec: number): string {
  if (!isFinite(sec) || isNaN(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function fmtAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 60000);
  if (d < 1) return 'jetzt';
  if (d < 60) return `${d}min`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
