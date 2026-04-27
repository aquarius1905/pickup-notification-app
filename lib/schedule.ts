import type { DaySchedule, Schedule, ServiceUser, Weekday } from "./api";

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "日",
  1: "月",
  2: "火",
  3: "水",
  4: "木",
  5: "金",
  6: "土",
};

/** "HH:MM:SS" または "HH:MM" を "HH:MM" 表示用に整形。null/空文字は "" */
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

/** 指定曜日に通所する利用者のみ抽出し、お迎え時刻の昇順で並び替えて返す。
 *  時刻未設定の利用者は末尾に来る。 */
export function filterAndSortByDay(
  users: ServiceUser[],
  day: Weekday,
): ServiceUser[] {
  return users
    .filter((u) => getDaySchedule(u, day) !== null)
    .sort((a, b) => {
      const ap = getDaySchedule(a, day)?.pickup ?? "";
      const bp = getDaySchedule(b, day)?.pickup ?? "";
      if (!ap && !bp) return 0;
      if (!ap) return 1;
      if (!bp) return -1;
      return ap.localeCompare(bp);
    });
}

/** 「お迎え 09:00 / お送り 16:00」形式で1日分の時刻を表示用に整形 */
export function formatDayTime(entry: DaySchedule | null): string {
  if (!entry) return "";
  const pickup = formatTimeForDisplay(entry.pickup);
  const dropoff = formatTimeForDisplay(entry.dropoff);
  if (pickup && dropoff) return `お迎え ${pickup} / お送り ${dropoff}`;
  if (pickup) return `お迎え ${pickup}`;
  if (dropoff) return `お送り ${dropoff}`;
  return "";
}

/** "09:00〜16:00" の範囲表記。両端揃わない場合は片方のみ表示 */
function formatTimeRange(entry: DaySchedule): string {
  const pickup = formatTimeForDisplay(entry.pickup);
  const dropoff = formatTimeForDisplay(entry.dropoff);
  if (pickup && dropoff) return `${pickup}〜${dropoff}`;
  return pickup || dropoff;
}

/** 利用者のスケジュール概要を複数行文字列で返す。例: "月 09:00〜16:00\n水 09:30〜17:00" */
export function formatSchedule(user: ServiceUser): string {
  return getScheduledWeekdays(user.schedule)
    .map((day) => {
      const entry = getDaySchedule(user, day)!;
      const time = formatTimeRange(entry);
      return time ? `${WEEKDAY_LABELS[day]} ${time}` : WEEKDAY_LABELS[day];
    })
    .join("\n");
}
