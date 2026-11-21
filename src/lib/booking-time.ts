// Business-time helpers. All slot math happens in the business time zone; the
// slot's ISO timestamp (UTC) is what gets submitted to the server.

export type BusinessHours = {
  open_time: string; // "09:00" or "09:00:00"
  close_time: string;
  slot_minutes: number;
  closed_weekdays: number[]; // 0 = Sunday
  timezone: string;
};

export type BusyPeriod = { starts_at: string; ends_at: string };

export type Slot = { iso: string; label: string; available: boolean };

function parts(instant: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "iso8601",
    numberingSystem: "latn",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(fmt.find((p) => p.type === t)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of the time zone from UTC at an instant, in minutes (São Paulo = -180). */
export function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** Wall-clock date + time in the business zone -> real instant. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let offset = tzOffsetMinutes(new Date(guess), timeZone);
  let result = guess - offset * 60000;
  const check = tzOffsetMinutes(new Date(result), timeZone);
  if (check !== offset) {
    offset = check;
    result = guess - offset * 60000;
  }
  return new Date(result);
}

/** YYYY-MM-DD of an instant in the business zone. */
export function businessDate(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** HH:mm of an instant in the business zone. */
export function businessClock(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function minutesOf(clock: string): number {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

function clockOf(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Open days starting today (business date), skipping closed weekdays. */
export function upcomingOpenDays(today: string, hours: BusinessHours, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; out.length < count && i < count * 3; i++) {
    const day = addDays(today, i);
    if (!hours.closed_weekdays.includes(weekdayOf(day))) out.push(day);
  }
  return out;
}

/**
 * Start times for one business day. A slot is listed when the whole service
 * fits before closing; it is available when it is in the future and does not
 * overlap any busy period.
 */
export function buildSlots(args: {
  date: string;
  hours: BusinessHours;
  durationMin: number;
  busy: BusyPeriod[];
  now: Date;
}): Slot[] {
  const { date, hours, durationMin, busy, now } = args;
  if (hours.closed_weekdays.includes(weekdayOf(date))) return [];
  const open = minutesOf(hours.open_time);
  const close = minutesOf(hours.close_time);
  const busyRanges = busy.map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const);
  const slots: Slot[] = [];
  for (let m = open; m + durationMin <= close; m += hours.slot_minutes) {
    const label = clockOf(m);
    const start = zonedToUtc(date, label, hours.timezone).getTime();
    const end = start + durationMin * 60000;
    const overlaps = busyRanges.some(([s, e]) => s < end && e > start);
    slots.push({
      iso: new Date(start).toISOString(),
      label,
      available: start > now.getTime() && !overlaps,
    });
  }
  return slots;
}
