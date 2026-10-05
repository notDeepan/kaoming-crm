const TAIPEI_UTC_OFFSET_HOURS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The next 02:00 in Taipei. This deployment timezone has a fixed UTC+08 offset. */
export function nextTaipeiRun(now: Date) {
  const local = new Date(now.getTime() + TAIPEI_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  let next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(),
    2 - TAIPEI_UTC_OFFSET_HOURS);
  if (next <= now.getTime()) next += DAY_MS;
  return new Date(next);
}
