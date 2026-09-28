/** Local calendar day ("2026-09-28") and clock ("07:50") in an IANA time zone. */
export function localClock(now: Date, timeZone: string): { day: string; hhmm: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${parts.hour}:${parts.minute}` };
}

/** True when `hhmm` is inside [start, start + windowMinutes). Cron runs every 15 min, so a window catches it. */
export function inWindow(hhmm: string, start: string, windowMinutes: number): boolean {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const diff = toMin(hhmm) - toMin(start);
  return diff >= 0 && diff < windowMinutes;
}
