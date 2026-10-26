import type { Schedule, ServiceUser, Weekday } from "@/lib/api";
import {
  WEEKDAYS,
  WEEKDAY_DISPLAY_ORDER,
  formatTimeForDisplay,
} from "@/lib/schedule";

export type FormState = {
  name: string;
  lineId: string;
  notifyMinutes: 5 | 10;
  draft: Schedule;
  editingUser: ServiceUser | null;
};

export type FormAction =
  | { type: "setName"; payload: string }
  | { type: "setLineId"; payload: string }
  | { type: "setNotifyMinutes"; payload: 5 | 10 }
  | { type: "toggleWeekday"; payload: Weekday }
  | {
      type: "updateTime";
      payload: { day: Weekday; field: "pickup" | "dropoff"; value: string | null };
    }
  | { type: "startEdit"; payload: ServiceUser }
  | { type: "reset" };

function normalizeScheduleForEdit(schedule: Schedule): Schedule {
  const result: Schedule = {};
  for (const day of WEEKDAYS) {
    const entry = schedule[`${day}`];
    if (!entry) continue;
    result[`${day}`] = {
      pickup: entry.pickup ? formatTimeForDisplay(entry.pickup) : null,
      dropoff: entry.dropoff ? formatTimeForDisplay(entry.dropoff) : null,
    };
  }
  return result;
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "setName":
      return { ...state, name: action.payload };
    case "setLineId":
      return { ...state, lineId: action.payload };
    case "setNotifyMinutes":
      return { ...state, notifyMinutes: action.payload };
    case "toggleWeekday": {
      const day = action.payload;
      const key = `${day}` as const;
      if (state.draft[key]) {
        const next = { ...state.draft };
        delete next[key];
        return { ...state, draft: next };
      }
      // 送迎時刻は曜日によらず同じ利用者が多いため、新しく選んだ曜日には、
      // 選択済みの曜日（月→日の順で最初に時刻が入っているもの）の時刻を引き継ぐ。
      // 違う曜日だけ職員が直せばよく、同じ時刻を曜日の数だけ選び直す手間をなくす
      const source = WEEKDAY_DISPLAY_ORDER.map((d) => state.draft[`${d}`]).find(
        (entry) => entry && (entry.pickup || entry.dropoff),
      );
      return {
        ...state,
        draft: {
          ...state.draft,
          [key]: {
            pickup: source?.pickup ?? null,
            dropoff: source?.dropoff ?? null,
          },
        },
      };
    }
    case "updateTime": {
      const { day, field, value } = action.payload;
      const key = `${day}` as const;
      const entry = state.draft[key] ?? { pickup: null, dropoff: null };
      return {
        ...state,
        draft: { ...state.draft, [key]: { ...entry, [field]: value } },
      };
    }
    case "startEdit": {
      const user = action.payload;
      return {
        name: user.user_name,
        lineId: user.line_user_id,
        notifyMinutes: user.notify_minutes,
        draft: normalizeScheduleForEdit(user.schedule),
        editingUser: user,
      };
    }
    case "reset":
      return {
        name: "",
        lineId: "",
        notifyMinutes: 10,
        draft: {},
        editingUser: null,
      };
    default:
      return state;
  }
}
