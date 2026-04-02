import { useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  type ServiceUser,
  fetchServiceUsers,
  sendPickupNotification,
} from "../lib/api";

export function useServiceUsers() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchServiceUsers()
      .then(setUsers)
      .catch(() => Alert.alert("エラー", "通信エラーが発生しました"))
      .finally(() => setFetching(false));
  }, []);

  const notify = async (eventType: "depart" | "arrive") => {
    if (!selectedUser) {
      Alert.alert("エラー", "利用者を選択してください");
      return;
    }
    try {
      setSending(true);
      await sendPickupNotification(selectedUser, eventType);
      const label = eventType === "depart" ? "出発" : "到着";
      Alert.alert("送信成功", `${selectedUser}さんの${label}通知を送りました`);
    } catch {
      Alert.alert("エラー", "通知送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return { users, selectedUser, setSelectedUser, fetching, sending, notify } as const;
}
