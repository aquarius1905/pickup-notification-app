const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL!;

export type ServiceUser = {
  /** APIレスポンスのフィールド名（バックエンド由来） */
  patient_name: string;
};

type ListResponse = {
  ok: boolean;
  families: ServiceUser[];
};

type NotifyResponse = {
  ok: boolean;
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
