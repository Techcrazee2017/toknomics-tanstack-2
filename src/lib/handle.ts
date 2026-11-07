/**
 * Sanitize a TikTok handle: strip leading @, trim whitespace, lowercase.
 */
export function sanitizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/**
 * Validate a TikTok handle. Allows alphanumeric and underscores, 2-24 chars.
 */
export function isValidHandle(raw: string): boolean {
  const sanitized = sanitizeHandle(raw);
  return /^[a-z0-9._]{2,24}$/.test(sanitized);
}

/**
 * Format a diamond count with thousands separators and a diamond glyph.
 */
export function formatDiamonds(count: number): string {
  return count.toLocaleString("en-US");
}

/**
 * Format an ISO timestamp as a relative "x ago" string.
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
