// src/utils/player.ts
//
// Central playback engine for the whole site.
//
// Owns the one and only HTMLAudioElement. The element is deliberately never
// appended to the document: a detached Audio object plays just fine, and it
// therefore survives a client-side body swap. Module state outlives the DOM,
// so playback continues across navigation once the ClientRouter is enabled.
//
// Components never touch audio directly. They call the actions below and
// render from the state they receive via subscribe().

export type PlayerSource = 'soma' | 'archive' | 'underground';

export interface PlayerTrack {
  title: string;
  artist: string;
  album: string;
  /** Absolute URL to cover art, empty when unknown. */
  cover: string;
  /** Outbound link to the source page, empty when unknown. */
  link: string;
}

export interface PlayerState {
  /** null means nothing has been loaded yet in this session. */
  source: PlayerSource | null;
  playing: boolean;
  loading: boolean;
  track: PlayerTrack;
  /** Soma only — which station is selected. */
  stationSlug: string;
  stationName: string;
  volume: number;
}

export interface SourceHandlers {
  /** Fires when a finite track reaches its end. Streams never fire this. */
  onEnded?: () => void;
  onError?: () => void;
}

const VOLUME_KEY = 'ic_vol';
const DEFAULT_VOLUME = 0.8;

const emptyTrack: PlayerTrack = { title: '—', artist: '', album: '', cover: '', link: '' };

function readStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const v = parseFloat(raw);
    return isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

const state: PlayerState = {
  source: null,
  playing: false,
  loading: false,
  track: { ...emptyTrack },
  stationSlug: '',
  stationName: '',
  volume: readStoredVolume(),
};

type Listener = (s: Readonly<PlayerState>) => void;
type TimeListener = (currentTime: number, duration: number) => void;

const listeners = new Set<Listener>();
const timeListeners = new Set<TimeListener>();

// Overwrite semantics on purpose: re-registering after a navigation replaces
// the old handler instead of stacking a second one.
const handlers = new Map<PlayerSource, SourceHandlers>();

let audio: HTMLAudioElement | null = null;

function notify(): void {
  const snapshot = Object.freeze({ ...state, track: { ...state.track } });
  for (const fn of listeners) {
    try { fn(snapshot); } catch { /* a broken subscriber must not stop the rest */ }
  }
}

function notifyTime(): void {
  if (!audio || !timeListeners.size) return;
  const { currentTime, duration } = audio;
  for (const fn of timeListeners) {
    try { fn(currentTime, duration); } catch { /* ignore */ }
  }
}

/** The shared audio element. Created on first use. */
export function getAudio(): HTMLAudioElement {
  if (audio) return audio;

  const el = new Audio();
  el.preload = 'none';
  el.volume = state.volume;

  el.addEventListener('play', () => {
    if (state.playing) return;
    state.playing = true;
    state.loading = false;
    notify();
  });

  el.addEventListener('pause', () => {
    if (!state.playing) return;
    state.playing = false;
    notify();
  });

  el.addEventListener('ended', () => {
    state.playing = false;
    notify();
    if (state.source) handlers.get(state.source)?.onEnded?.();
  });

  el.addEventListener('error', () => {
    state.playing = false;
    state.loading = false;
    notify();
    if (state.source) handlers.get(state.source)?.onError?.();
  });

  el.addEventListener('timeupdate', notifyTime);
  el.addEventListener('loadedmetadata', notifyTime);

  audio = el;
  return el;
}

export function getState(): Readonly<PlayerState> {
  return Object.freeze({ ...state, track: { ...state.track } });
}

/**
 * Subscribe to state changes. Fires immediately with the current state so a
 * freshly mounted component paints the right thing without extra plumbing.
 * Returns an unsubscribe function — call it on astro:before-swap.
 */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  try { fn(getState()); } catch { /* ignore */ }
  return () => { listeners.delete(fn); };
}

/** Separate channel: timeupdate fires several times per second. */
export function subscribeTime(fn: TimeListener): () => void {
  timeListeners.add(fn);
  const el = audio;
  if (el) { try { fn(el.currentTime, el.duration); } catch { /* ignore */ } }
  return () => { timeListeners.delete(fn); };
}

export function registerSourceHandlers(source: PlayerSource, h: SourceHandlers): void {
  handlers.set(source, h);
}

/** Patch track metadata without touching playback. */
export function setTrack(patch: Partial<PlayerTrack>): void {
  state.track = { ...state.track, ...patch };
  notify();
}

export function setStation(slug: string, name: string): void {
  state.stationSlug = slug;
  state.stationName = name;
  notify();
}

export function setVolume(v: number): void {
  const vol = Math.min(1, Math.max(0, v));
  state.volume = vol;
  getAudio().volume = vol;
  try { localStorage.setItem(VOLUME_KEY, String(vol)); } catch { /* private mode */ }
  notify();
}

/**
 * Point the engine at a new source and optionally start it.
 * Switching sources is implicit mutual exclusion — there is only one element,
 * so soma and archive can never play over each other.
 */
export async function load(
  opts: {
    source: PlayerSource;
    src: string;
    track?: Partial<PlayerTrack>;
    stationSlug?: string;
    stationName?: string;
  },
  autoplay = true,
): Promise<void> {
  const el = getAudio();

  state.source = opts.source;
  state.track = { ...emptyTrack, ...opts.track };
  if (opts.stationSlug !== undefined) state.stationSlug = opts.stationSlug;
  if (opts.stationName !== undefined) state.stationName = opts.stationName;
  state.loading = true;
  state.playing = false;
  notify();

  if (el.src !== opts.src) {
    el.src = opts.src;
    el.load();
  }

  if (!autoplay) {
    state.loading = false;
    notify();
    return;
  }

  await play();
}

export async function play(): Promise<void> {
  const el = getAudio();
  if (!el.src) {
    if (import.meta.env.DEV) console.warn('[ic:player] play() ohne src — nichts geladen');
    return;
  }
  try {
    await el.play();
    // The 'play' listener flips the state — nothing to do here.
  } catch (err) {
    // Autoplay blocked or stream unreachable. Stay paused, drop the spinner.
    if (import.meta.env.DEV) {
      console.warn('[ic:player] play() abgelehnt für', el.src, err);
    }
    state.loading = false;
    state.playing = false;
    notify();
  }
}

export function pause(): void {
  getAudio().pause();
}

export function toggle(): void {
  const el = getAudio();
  if (!el.src) return;
  if (el.paused) void play();
  else el.pause();
}

/** Seek by percentage (0–100). No-op for live streams. */
export function seekToPercent(pct: number): void {
  const el = getAudio();
  if (!isFinite(el.duration) || el.duration <= 0) return;
  el.currentTime = (Math.min(100, Math.max(0, pct)) / 100) * el.duration;
  notifyTime();
}

/** Nudge playback position in seconds. Used by MediaSession seek actions. */
export function seekBy(seconds: number): void {
  const el = getAudio();
  if (!isFinite(el.duration) || el.duration <= 0) return;
  el.currentTime = Math.min(el.duration, Math.max(0, el.currentTime + seconds));
  notifyTime();
}

/** Current position, for consumers that need it outside the subscription. */
export function getPosition(): { currentTime: number; duration: number } {
  const el = audio;
  if (!el) return { currentTime: 0, duration: NaN };
  return { currentTime: el.currentTime, duration: el.duration };
}
