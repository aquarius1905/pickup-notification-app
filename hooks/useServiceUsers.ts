import { useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  type ServiceUser,
  fetchServiceUsers,
  sendPickupNotification,
} from "../lib/api";

function getErrorMessage(error: unknown): string {
  if (
    error instanceof TypeError &&
    error.message === "Network request failed"
  ) {
    return "ネットワークに接続できません。電波状況を確認してください。";
  }
  if (error instanceof Error) {
    if (error.message.includes("401")) {
      return "認証に失敗しました。アプリを再起動してください。";
    }
    if (error.message.includes("500")) {
      return "サーバーエラーが発生しました。時間をおいて再試行してください。";
    }
    return error.message;
  }
  return "予期しないエラーが発生しました。";
}

export function useServiceUsers() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchServiceUsers()
      .then(setUsers)
      .catch((error) => Alert.alert("エラー", getErrorMessage(error)))
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
    } catch (error) {
      Alert.alert("通知失敗", getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return {
    users,
    selectedUser,
    setSelectedUser,
    fetching,
    sending,
    notify,
  } as const;
}
