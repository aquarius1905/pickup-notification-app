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

/** "HH:MM:SS" または "HH:MM" を "HH:MM" 表示用に整形。空文字は "" */
export function formatTimeForDisplay(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/**
 * ユーザー入力の時刻文字列を "HH:MM" に正規化。
 * 不正な入力は null を返す。空文字は null（＝未設定）扱い。
 */
export function normalizeTimeInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** スケジュールに含まれる曜日を昇順で返す */
export function getScheduledWeekdays(schedule: Schedule): Weekday[] {
  const result: Weekday[] = [];
  for (const day of WEEKDAYS) {
    if (schedule[`${day}`]) result.push(day);
  }
  return result;
}

/** 利用者のスケジュール概要を複数行文字列で返す。例: "月 09:00〜16:00\n水 09:30〜17:00" */
export function formatSchedule(user: ServiceUser): string {
  const days = getScheduledWeekdays(user.schedule);
  if (days.length === 0) return "";
  return days
    .map((day) => {
      const entry = user.schedule[`${day}`] as DaySchedule;
      const pickup = formatTimeForDisplay(entry.pickup);
      const dropoff = formatTimeForDisplay(entry.dropoff);
      const time = pickup && dropoff ? `${pickup}〜${dropoff}` : pickup || dropoff;
      return time ? `${WEEKDAY_LABELS[day]} ${time}` : WEEKDAY_LABELS[day];
    })
    .join("\n");
}
