/**
 * Mood → CSS background color mapping (for card backgrounds).
 */
export function getMoodColor(mood?: string): string {
  if (!mood) return 'var(--mood-default)';
  const m = mood.toLowerCase();
  if (m.includes('ambient'))    return 'var(--mood-ambient)';
  if (m.includes('deep house')) return 'var(--mood-deep-house)';
  if (m.includes('house'))      return 'var(--mood-house)';
  if (m.includes('techno'))     return 'var(--mood-techno)';
  return 'var(--mood-default)';
}

/**
 * Mood → dot color (for small indicator dots).
 */
export function getMoodDot(mood?: string): string {
  if (!mood) return 'rgba(100,100,120,0.4)';
  const m = mood.toLowerCase();
  if (m.includes('ambient'))    return 'rgba(100,160,220,0.7)';
  if (m.includes('deep house')) return 'rgba(200,140,60,0.7)';
  if (m.includes('house'))      return 'rgba(80,180,140,0.7)';
  if (m.includes('techno'))     return 'rgba(160,80,200,0.7)';
  return 'rgba(100,100,120,0.4)';
}
