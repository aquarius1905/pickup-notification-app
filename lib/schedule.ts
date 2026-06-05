import type { DaySchedule, Schedule, ServiceUser, Weekday } from "@/lib/api";

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "日",
  1: "月",
  2: "火",
  3: "水",
  4: "木",
  5: "金",
  6: "土",
};

export function padZero(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatTime(hour: number, minute: number): string {
  return `${padZero(hour)}:${padZero(minute)}`;
}

export function formatTimeForDisplay(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

export function getCurrentWeekday(): Weekday {
  return new Date().getDay() as Weekday;
}

export function getDaySchedule(
  user: ServiceUser,
  day: Weekday,
): DaySchedule | null {
  return user.schedule[`${day}`] ?? null;
}

export function getScheduledWeekdays(schedule: Schedule): Weekday[] {
  return WEEKDAYS.filter((day) => schedule[`${day}`]);
}

export function filterAndSortByDay(
  users: ServiceUser[],
  day: Weekday,
): ServiceUser[] {
  const scheduleMap = new Map(users.map((u) => [u.id, getDaySchedule(u, day)]));

  return users
    .filter((u) => scheduleMap.get(u.id) !== null)
    .sort((a, b) => {
      const ap = scheduleMap.get(a.id)?.pickup ?? "";
      const bp = scheduleMap.get(b.id)?.pickup ?? "";
      if (!ap && !bp) return 0;
      if (!ap) return 1;
      if (!bp) return -1;
      return ap.localeCompare(bp);
    });
}

function getFormattedTimes(entry: DaySchedule | null): {
  pickup: string;
  dropoff: string;
} {
  if (!entry) return { pickup: "", dropoff: "" };
  return {
    pickup: formatTimeForDisplay(entry.pickup),
    dropoff: formatTimeForDisplay(entry.dropoff),
  };
}

export function formatDayTime(entry: DaySchedule | null): string {
  if (!entry) return "";
  const { pickup, dropoff } = getFormattedTimes(entry);
  if (pickup && dropoff) return `お迎え ${pickup} / お送り ${dropoff}`;
  if (pickup) return `お迎え ${pickup}`;
  if (dropoff) return `お送り ${dropoff}`;
  return "";
}

function formatTimeRange(entry: DaySchedule): string {
  const { pickup, dropoff } = getFormattedTimes(entry);
  if (pickup && dropoff) return `${pickup}〜${dropoff}`;
  return pickup || dropoff;
}

export function formatSchedule(user: ServiceUser): string {
  return getScheduledWeekdays(user.schedule)
    .map((day) => {
      const entry = getDaySchedule(user, day)!;
      const time = formatTimeRange(entry);
      return time ? `${WEEKDAY_LABELS[day]} ${time}` : WEEKDAY_LABELS[day];
    })
    .join("\n");
}
