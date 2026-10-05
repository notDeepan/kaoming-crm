export function timeInState(entries: { toStatus: string; at: Date }[], now = new Date()) {
  const ordered = [...entries].sort((a, b) => a.at.getTime() - b.at.getTime());
  const seconds = new Map<string, number>();
  for (let index = 0; index < ordered.length; index++) {
    const current = ordered[index]!;
    const end = ordered[index + 1]?.at ?? now;
    const duration = Math.max(0, Math.floor((end.getTime() - current.at.getTime()) / 1000));
    if (current.toStatus !== 'closed') seconds.set(current.toStatus,
      (seconds.get(current.toStatus) ?? 0) + duration);
  }
  return [...seconds].map(([status, value]) => ({ status, hours: Math.round(value / 360) / 10 }));
}
