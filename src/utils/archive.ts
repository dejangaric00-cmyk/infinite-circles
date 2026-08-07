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

// ── Genre-Tabellen ───────────────────────────────────────────────────────────
//
// Unveränderliche Nachschlagetabellen. Sie standen im onPage-Rumpf der
// ArchiveRadio-Komponente und wurden dadurch bei jedem Seitenwechsel neu
// angelegt — 126 Zeilen Konfiguration pro Navigation. Hier liegen sie einmal,
// bei der übrigen Archive-Logik.

// ── Genre → query map ────────────────────────────────────────────────────────
export const GENRE_QUERIES: Record<string, string[]> = {
  'all': [
    'subject:(dub+techno)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(minimal+techno)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(deep+house)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(ambient)+mediatype:audio+collection:netlabels',
    'subject:(electro)+mediatype:audio+collection:netlabels',
    'subject:(IDM)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(drone)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(downtempo)+mediatype:audio+collection:netlabels',
  ],
  'dub-techno': [
    'subject:(dub+techno)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(dub+techno)+mediatype:audio+collection:netlabels',
    'subject:(dub)+subject:(techno)+mediatype:audio',
  ],
  'minimal': [
    'subject:(minimal+techno)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(minimal)+mediatype:audio+collection:netlabels',
    'subject:(minimal+house)+mediatype:audio+licenseurl:*creativecommons*',
  ],
  'deep-house': [
    'subject:(deep+house)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(deep+house)+mediatype:audio+collection:netlabels',
    'subject:(house)+subject:(deep)+mediatype:audio+licenseurl:*creativecommons*',
  ],
  'ambient': [
    'subject:(ambient)+mediatype:audio+collection:netlabels',
    'subject:(ambient)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(ambient+electronic)+mediatype:audio+licenseurl:*creativecommons*',
  ],
  'electro': [
    'subject:(electro)+mediatype:audio+collection:netlabels',
    'subject:(electro)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(electronica)+mediatype:audio+collection:netlabels',
  ],
  'netlabels': [
    'mediatype:audio+collection:netlabels',
    'subject:(electronic)+mediatype:audio+collection:netlabels',
    'subject:(dance)+mediatype:audio+collection:netlabels',
  ],
  'drone': [
    'subject:(drone)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(drone+music)+mediatype:audio',
    'subject:(drone+ambient)+mediatype:audio+licenseurl:*creativecommons*',
  ],
  'dark-ambient': [
    'subject:(dark+ambient)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(dark+ambient)+mediatype:audio+collection:netlabels',
    'subject:(dark+electronic)+mediatype:audio+licenseurl:*creativecommons*',
  ],
  'industrial': [
    'subject:(industrial)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(industrial)+mediatype:audio+collection:netlabels',
    'subject:(post-industrial)+mediatype:audio+licenseurl:*creativecommons*',
  ],
  'idm': [
    'subject:(IDM)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(intelligent+dance+music)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(IDM)+mediatype:audio+collection:netlabels',
  ],
  'breakbeat': [
    'subject:(breakbeat)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(breaks)+mediatype:audio+collection:netlabels',
    'subject:(breakbeat)+mediatype:audio+collection:netlabels',
  ],
  'downtempo': [
    'subject:(downtempo)+mediatype:audio+collection:netlabels',
    'subject:(downtempo)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(trip-hop)+mediatype:audio+licenseurl:*creativecommons*',
  ],
  'experimental': [
    'subject:(experimental)+mediatype:audio+collection:netlabels',
    'subject:(experimental+electronic)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(avant-garde)+mediatype:audio+licenseurl:*creativecommons*',
  ],
  'noise': [
    'subject:(noise)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(harsh+noise)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(noise+music)+mediatype:audio+collection:netlabels',
  ],
  'jungle': [
    'subject:(jungle)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(drum+and+bass)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(jungle)+mediatype:audio+collection:netlabels',
  ],
  'acid': [
    'subject:(acid+techno)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(acid+house)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(acid)+mediatype:audio+collection:netlabels',
  ],
  'detroit': [
    'subject:(detroit+techno)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(detroit)+subject:(techno)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(techno)+mediatype:audio+collection:netlabels',
  ],
  'field-recordings': [
    'subject:(field+recordings)+mediatype:audio+licenseurl:*creativecommons*',
    'subject:(field+recording)+mediatype:audio',
    'subject:(soundscape)+mediatype:audio+licenseurl:*creativecommons*',
  ],
};

export const GENRE_LABELS: Record<string, string> = {
  'all':              'archive.org · netlabels',
  'dub-techno':       'archive.org · dub techno',
  'minimal':          'archive.org · minimal',
  'deep-house':       'archive.org · deep house',
  'ambient':          'archive.org · ambient',
  'electro':          'archive.org · electro',
  'netlabels':        'archive.org · netlabels',
  'drone':            'archive.org · drone',
  'dark-ambient':     'archive.org · dark ambient',
  'industrial':       'archive.org · industrial',
  'idm':              'archive.org · IDM',
  'breakbeat':        'archive.org · breakbeat',
  'downtempo':        'archive.org · downtempo',
  'experimental':     'archive.org · experimental',
  'noise':            'archive.org · noise',
  'jungle':           'archive.org · jungle',
  'acid':             'archive.org · acid',
  'detroit':          'archive.org · detroit techno',
  'field-recordings': 'archive.org · field recordings',
};

// ── Resolving playable audio ─────────────────────────────────────────────────

/** The two fields of an archive.org file entry this module actually reads. */
interface ArchiveFile {
  name?: string;
  source?: string;
}
/** Same thing, but with the name confirmed — see the filter in getAudioFile. */
type NamedFile = ArchiveFile & { name: string };

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
  const files: ArchiveFile[] = data?.result ?? [];
  // Narrowed once, up front. Under `any` a nameless entry could slip through
  // and end up as a download URL ending in "/undefined".
  const named = files.filter((f): f is NamedFile => typeof f.name === 'string');
  const mp3s = named.filter(f => /\.mp3$/i.test(f.name) && f.source !== 'derivative');
  const oggs = named.filter(f => /\.ogg$/i.test(f.name));
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
