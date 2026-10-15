/**
 * Click & Collect pickup slots in Sydney local time (DST-safe via Intl, no deps).
 *
 * Hours (both branches): Mon-Sat 7:00 AM - 7:30 PM, Sun 8:00 AM - 6:00 PM.
 * Orders are ready 2 hours after being placed; windows are 1 hour, aligned to
 * the hour, and must end at or before closing time.
 */

export const STORE_TIMEZONE = "Australia/Sydney";
export const PICKUP_LEAD_MINUTES = 120;
export const PICKUP_WINDOW_MINUTES = 60;
export const PICKUP_DAYS_AHEAD = 3; // today + next 2 days

export interface PickupSlot {
  value: string;
  label: string;
  startsAt: string;
  endsAt: string;
  dayLabel: string;
}

interface DayHours {
  openMin: number;
  closeMin: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** weekday: 0 = Sunday. */
export function getStoreHours(weekday: number): DayHours {
  return weekday === 0
    ? { openMin: 8 * 60, closeMin: 18 * 60 }
    : { openMin: 7 * 60, closeMin: 19 * 60 + 30 };
}

export const STORE_HOURS_TEXT = "Mon–Sat 7:00 AM – 7:30 PM, Sun 8:00 AM – 6:00 PM";

const wallFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STORE_TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric"
});

/** Sydney wall-clock time of an instant, expressed as a UTC-based ms value. */
function wallAsUtcMs(instantMs: number): number {
  const p: Record<string, number> = {};
  for (const part of wallFormatter.formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
}

function offsetMs(instantMs: number): number {
  const truncated = Math.floor(instantMs / 1000) * 1000;
  return wallAsUtcMs(truncated) - truncated;
}

/** Convert a Sydney wall-clock time (as UTC-based ms) to the real instant. */
function sydneyWallToInstant(wallMs: number): number {
  const first = wallMs - offsetMs(wallMs);
  return wallMs - offsetMs(first);
}

function formatTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function getPickupSlots(now: Date = new Date()): PickupSlot[] {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return [];
  const earliestStartMs = nowMs + PICKUP_LEAD_MINUTES * 60_000;

  const today = new Date(wallAsUtcMs(nowMs)); // UTC fields == Sydney wall fields
  const baseY = today.getUTCFullYear();
  const baseM = today.getUTCMonth();
  const baseD = today.getUTCDate();

  const slots: PickupSlot[] = [];
  for (let dayIdx = 0; dayIdx < PICKUP_DAYS_AHEAD; dayIdx++) {
    const day = new Date(Date.UTC(baseY, baseM, baseD + dayIdx));
    const weekday = day.getUTCDay();
    const dateText = `${WEEKDAYS[weekday]} ${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}`;
    const dayLabel =
      dayIdx === 0 ? `Today (${dateText})` : dayIdx === 1 ? `Tomorrow (${dateText})` : dateText;
    const { openMin, closeMin } = getStoreHours(weekday);

    for (let start = openMin; start + PICKUP_WINDOW_MINUTES <= closeMin; start += PICKUP_WINDOW_MINUTES) {
      const end = start + PICKUP_WINDOW_MINUTES;
      const dayMs = day.getTime();
      const startMs = sydneyWallToInstant(dayMs + start * 60_000);
      if (startMs < earliestStartMs) continue;
      const endMs = sydneyWallToInstant(dayMs + end * 60_000);
      const label = `${formatTime(start)} - ${formatTime(end)}`;
      slots.push({
        value: `${dateText}, ${label}`,
        label,
        startsAt: new Date(startMs).toISOString(),
        endsAt: new Date(endMs).toISOString(),
        dayLabel
      });
    }
  }
  return slots;
}

export function isValidPickupSlot(value: unknown, now: Date = new Date()): boolean {
  if (typeof value !== "string" || !value) return false;
  return getPickupSlots(now).some((s) => s.value === value);
}
