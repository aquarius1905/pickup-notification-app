import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import * as Burnt from "burnt";
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

export type NotifyStatus = Record<string, Set<"depart" | "arrive">>;

export function useServiceUsers() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notified, setNotified] = useState<NotifyStatus>({});

  const load = useCallback(
    async (setLoadingFlag: (v: boolean) => void) => {
      try {
        setLoadingFlag(true);
        const data = await fetchServiceUsers();
        setUsers(data);
      } catch (error) {
        Alert.alert("エラー", getErrorMessage(error));
      } finally {
        setLoadingFlag(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(setFetching);
  }, [load]);

  const refresh = useCallback(() => load(setRefreshing), [load]);

  const notify = async (eventType: "depart" | "arrive") => {
    if (!selectedUser) {
      Alert.alert("エラー", "利用者を選択してください");
      return;
    }
    try {
      setSending(true);
      await sendPickupNotification(selectedUser, eventType);
      const label = eventType === "depart" ? "出発" : "到着";
      setSelectedUser(null);
      Burnt.toast({
        title: `${selectedUser}さんの${label}通知を送りました`,
        preset: "done",
      });
      setNotified((prev) => {
        if (eventType === "arrive") {
          // 到着通知でサイクル完了 → バッジをリセット
          const next = { ...prev };
          delete next[selectedUser];
          return next;
        }
        const set = new Set(prev[selectedUser] ?? []);
        set.add(eventType);
        return { ...prev, [selectedUser]: set };
      });
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
    refreshing,
    refresh,
    sending,
    notify,
    notified,
  } as const;
}
