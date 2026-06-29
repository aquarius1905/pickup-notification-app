import { HttpError } from "./error";

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL!;

// 施設ごとのAPIキーはビルド時に固定せず、起動時にAsyncStorageから読み込んでここに保持する
// （永続化自体はlib/facilityAuth.tsが担当し、こちらはリクエスト用のメモリキャッシュ）
let cachedApiKey: string | null = null;

export function setApiKey(key: string | null): void {
  cachedApiKey = key;
}

function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-api-key": cachedApiKey ?? "",
  };
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** "HH:MM" 形式、未設定は null */
export type DaySchedule = {
  pickup: string | null;
  dropoff: string | null;
};

export type Schedule = Partial<Record<`${Weekday}`, DaySchedule>>;

export type ServiceUser = {
  id: string;
  user_name: string;
  line_user_id: string;
  invite_code: string;
  schedule: Schedule;
  notify_minutes: 5 | 10;
  canceled_today: boolean;
};

export type Facility = {
  id: string;
  name: string;
  facility_code: string;
};

export type UpcomingCancellation = {
  id: string;
  date: string;
  reason: string | null;
  family: { user_name: string } | null;
};

export type NotificationLog = {
  id: string;
  event_type: "pickup_approaching" | "dropoff_approaching";
  message: string;
  success: boolean;
  error_message: string | null;
  created_at: string;
  notify_minutes: number | null;
  family: { user_name: string } | null;
};

export type LogsPeriod = "today" | "week" | "all";

export type LogsEventTypeFilter =
  | "all"
  | "pickup_approaching"
  | "dropoff_approaching";

export type LogsPage = {
  logs: NotificationLog[];
  hasMore: boolean;
};

type WorkerResponse = {
  ok: boolean;
  error?: string;
  users?: ServiceUser[];
  user?: ServiceUser;
  facility?: Facility;
  logs?: NotificationLog[];
  hasMore?: boolean;
  cancellations?: UpcomingCancellation[];
  apiKey?: string;
};

/** @throws 通信失敗時・okがfalseの時にErrorを投げる */
async function callWorker(
  action: string,
  params: Record<string, unknown> = {},
  errorMessage: string,
): Promise<WorkerResponse> {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ action, ...params }),
  });

  // Cloudflareの基盤障害時などはWorkerのコードが実行されずHTMLが返ることがあるため、
  // JSONパース失敗時は例外を投げずdata=nullとして後続のステータスチェックに委ねる
  let data: WorkerResponse | null = null;
  try {
    data = await response.json();
  } catch {
    // ignore: 後続のresponse.okチェックでフォールバックのerrorMessageを使う
  }

  if (!response.ok) {
    throw new HttpError(data?.error ?? errorMessage, response.status);
  }
  if (!data || !data.ok) {
    throw new Error(data?.error ?? errorMessage);
  }
  return data;
}

export async function fetchServiceUsers(): Promise<ServiceUser[]> {
  const data = await callWorker("list", {}, "利用者一覧の取得に失敗しました");
  return data.users ?? [];
}

export async function fetchUpcomingCancellations(): Promise<UpcomingCancellation[]> {
  const data = await callWorker(
    "listCancellations",
    {},
    "キャンセル予定の取得に失敗しました",
  );
  return data.cancellations ?? [];
}

export async function sendApproachingNotification(
  userId: string,
  notifyType: "pickup_approaching" | "dropoff_approaching",
): Promise<void> {
  await callWorker("notify", { userId, notifyType }, "通知送信に失敗しました");
}

export async function createServiceUser(
  userName: string,
  lineUserId?: string,
  schedule?: Schedule,
  notifyMinutes?: 5 | 10,
): Promise<ServiceUser> {
  const data = await callWorker(
    "create",
    { userName, lineUserId, schedule, notifyMinutes },
    "利用者の追加に失敗しました",
  );
  if (!data.user) throw new Error("利用者の追加に失敗しました");
  return data.user;
}

export async function updateServiceUser(
  id: string,
  userName?: string,
  lineUserId?: string,
  schedule?: Schedule,
  notifyMinutes?: 5 | 10,
): Promise<ServiceUser> {
  const data = await callWorker(
    "update",
    { id, userName, lineUserId, schedule, notifyMinutes },
    "利用者の更新に失敗しました",
  );
  if (!data.user) throw new Error("利用者の更新に失敗しました");
  return data.user;
}

export async function deleteServiceUser(id: string): Promise<void> {
  await callWorker("delete", { id }, "利用者の削除に失敗しました");
}

export async function fetchNotificationLogs(params: {
  search?: string;
  period?: LogsPeriod;
  eventType?: LogsEventTypeFilter;
  offset?: number;
} = {}): Promise<LogsPage> {
  const data = await callWorker("listLogs", params, "通知履歴の取得に失敗しました");
  return { logs: data.logs ?? [], hasMore: data.hasMore ?? false };
}

export async function fetchFacility(): Promise<Facility> {
  const data = await callWorker("getFacility", {}, "施設情報の取得に失敗しました");
  if (!data.facility) throw new Error("施設情報の取得に失敗しました");
  return data.facility;
}

export async function updateFacilityName(name: string): Promise<Facility> {
  const data = await callWorker("updateFacility", { name }, "施設名の更新に失敗しました");
  if (!data.facility) throw new Error("施設名の更新に失敗しました");
  return data.facility;
}

/** 施設コードに対応するAPIキーを取得する。APIキー認証なしで呼べる唯一のアクション */
export async function resolveFacilityCode(
  code: string,
): Promise<{ apiKey: string; facility: Facility }> {
  const data = await callWorker(
    "resolveFacilityCode",
    { code },
    "施設コードが見つかりません",
  );
  if (!data.apiKey || !data.facility) {
    throw new Error("施設コードが見つかりません");
  }
  return { apiKey: data.apiKey, facility: data.facility };
}
