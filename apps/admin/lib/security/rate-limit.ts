const hits = new Map<string, { count: number; ts: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key) || { count: 0, ts: now };
  if (now - entry.ts > windowMs) {
    hits.set(key, { count: 1, ts: now });
    return true;
  }
  entry.count += 1;
  hits.set(key, entry);
  return entry.count <= limit;
}
