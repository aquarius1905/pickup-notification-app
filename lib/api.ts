const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL!;

export type ServiceUser = {
  id: number;
  /** APIレスポンスのフィールド名（バックエンド由来） */
  patient_name: string;
  line_user_id: string;
};

type ListResponse = {
  ok: boolean;
  families: ServiceUser[];
};

type NotifyResponse = {
  ok: boolean;
};

type MutationResponse = {
  ok: boolean;
  family?: ServiceUser;
  error?: string;
};

export async function fetchServiceUsers(): Promise<ServiceUser[]> {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list" }),
  });
  const data: ListResponse = await response.json();
  if (!data.ok) {
    throw new Error("利用者一覧の取得に失敗しました");
  }
  return data.families;
}

export async function sendPickupNotification(
  userName: string,
  eventType: "depart" | "arrive",
): Promise<void> {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "notify", patientName: userName, eventType }),
  });
  const data: NotifyResponse = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error("通知送信に失敗しました");
  }
}

export async function createServiceUser(
  patientName: string,
  lineUserId?: string,
): Promise<ServiceUser> {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", patientName, lineUserId }),
  });
  const data: MutationResponse = await response.json();
  if (!response.ok || !data.ok || !data.family) {
    throw new Error(data.error ?? "利用者の追加に失敗しました");
  }
  return data.family;
}

export async function updateServiceUser(
  id: number,
  patientName?: string,
  lineUserId?: string,
): Promise<ServiceUser> {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, patientName, lineUserId }),
  });
  const data: MutationResponse = await response.json();
  if (!response.ok || !data.ok || !data.family) {
    throw new Error(data.error ?? "利用者の更新に失敗しました");
  }
  return data.family;
}

export async function deleteServiceUser(id: number): Promise<void> {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id }),
  });
  const data: MutationResponse = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "利用者の削除に失敗しました");
  }
}
