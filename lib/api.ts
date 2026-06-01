const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL!;
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY!;

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

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
};

export type Facility = {
  id: string;
  name: string;
};

type WorkerResponse = {
  ok: boolean;
  error?: string;
  users?: ServiceUser[];
  user?: ServiceUser;
  facility?: Facility;
};

/** @throws 通信失敗時・okがfalseの時にErrorを投げる */
async function callWorker(
  action: string,
  params: Record<string, unknown> = {},
  errorMessage: string,
): Promise<WorkerResponse> {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ action, ...params }),
  });
  const data: WorkerResponse = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? errorMessage);
  }
  return data;
}

export async function fetchServiceUsers(): Promise<ServiceUser[]> {
  const data = await callWorker("list", {}, "利用者一覧の取得に失敗しました");
  return data.users ?? [];
}

export async function sendPickupNotification(
  userName: string,
  eventType: "depart" | "arrive",
): Promise<void> {
  await callWorker(
    "notify",
    { userName, eventType },
    "通知送信に失敗しました",
  );
}

export async function createServiceUser(
  userName: string,
  lineUserId?: string,
  schedule?: Schedule,
): Promise<ServiceUser> {
  const data = await callWorker(
    "create",
    { userName, lineUserId, schedule },
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
): Promise<ServiceUser> {
  const data = await callWorker(
    "update",
    { id, userName, lineUserId, schedule },
    "利用者の更新に失敗しました",
  );
  if (!data.user) throw new Error("利用者の更新に失敗しました");
  return data.user;
}

export async function deleteServiceUser(id: string): Promise<void> {
  await callWorker("delete", { id }, "利用者の削除に失敗しました");
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
