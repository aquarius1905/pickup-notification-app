import type { Schedule, ServiceUser, Weekday } from "@/lib/api";
import { WEEKDAYS, formatTimeForDisplay } from "@/lib/schedule";

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
      return {
        ...state,
        draft: { ...state.draft, [key]: { pickup: null, dropoff: null } },
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
