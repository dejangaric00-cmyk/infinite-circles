/**
 * Extracts a YouTube video ID from various URL formats.
 * Handles: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
 */
export function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
