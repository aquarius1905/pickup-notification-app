const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL!;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY!;

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

export type ServiceUser = {
  id: string;
  /** APIレスポンスのフィールド名（バックエンド由来） */
  patient_name: string;
  line_user_id: string;
  invite_code: string;
};

type WorkerResponse = {
  ok: boolean;
  error?: string;
  families?: ServiceUser[];
  family?: ServiceUser;
};

/**
 * Workerにリクエストを送る共通関数
 * @throws 通信失敗時・okがfalseの時にErrorを投げる
 */
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
  return data.families ?? [];
}

export async function sendPickupNotification(
  userName: string,
  eventType: "depart" | "arrive",
): Promise<void> {
  await callWorker(
    "notify",
    { patientName: userName, eventType },
    "通知送信に失敗しました",
  );
}

export async function createServiceUser(
  patientName: string,
  lineUserId?: string,
): Promise<ServiceUser> {
  const data = await callWorker(
    "create",
    { patientName, lineUserId },
    "利用者の追加に失敗しました",
  );
  if (!data.family) throw new Error("利用者の追加に失敗しました");
  return data.family;
}

export async function updateServiceUser(
  id: string,
  patientName?: string,
  lineUserId?: string,
): Promise<ServiceUser> {
  const data = await callWorker(
    "update",
    { id, patientName, lineUserId },
    "利用者の更新に失敗しました",
  );
  if (!data.family) throw new Error("利用者の更新に失敗しました");
  return data.family;
}

export async function deleteServiceUser(id: string): Promise<void> {
  await callWorker("delete", { id }, "利用者の削除に失敗しました");
}
