import { useCallback, useEffect, useState } from "react";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Burnt from "burnt";
import * as Haptics from "expo-haptics";
import type { ServiceUser } from "@/lib/api";
import { fetchServiceUsers, sendPickupNotification } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";
import { withAsyncLoading } from "@/lib/asyncLoad";

export type NotifyPhase =
  | "pickup_departed"
  | "pickup_completed"
  | "dropoff_departed"
  | "dropoff_completed";

type NotifyEntry = { phase: NotifyPhase; date: string };
export type NotifyStatus = Record<string, NotifyEntry>;

const STORAGE_KEY = "notifyStatus";

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadNotifyStatus(): Promise<NotifyStatus> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: NotifyStatus = JSON.parse(raw);
    const today = getTodayString();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, entry]) => entry.date === today),
    );
  } catch {
    return {};
  }
}

async function saveNotifyStatus(status: NotifyStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } catch {
    // 保存失敗はサイレントに無視（UIへの影響なし）
  }
}

function advancePhase(
  current: NotifyPhase | undefined,
  eventType: "depart" | "arrive",
): NotifyPhase | null {
  if (eventType === "depart") {
    if (!current) return "pickup_departed";
    if (current === "pickup_completed") return "dropoff_departed";
  } else {
    if (current === "pickup_departed") return "pickup_completed";
    if (current === "dropoff_departed") return "dropoff_completed";
  }
  return null;
}

export function useServiceUsers() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notified, setNotified] = useState<NotifyStatus>({});

  useEffect(() => {
    loadNotifyStatus().then(setNotified);
  }, []);

  const load = useCallback(
    async (setLoadingFlag: (v: boolean) => void) => {
      const data = await withAsyncLoading(
        () => fetchServiceUsers(),
        setLoadingFlag,
        (error) => Alert.alert("エラー", getErrorMessage(error)),
      );
      if (data) setUsers(data);
    },
    [],
  );

  const loadUsers = useCallback(() => load(setFetching), [load]);
  const refresh = useCallback(() => load(setRefreshing), [load]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // アプリがフォアグラウンドに戻った時、日付が変わっていれば古いエントリを削除
  useEffect(() => {
    const resetOldEntries = () => {
      const today = getTodayString();
      setNotified((prev) => {
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, entry]) => entry.date === today),
        );
        if (Object.keys(next).length === Object.keys(prev).length) return prev;
        saveNotifyStatus(next);
        return next;
      });
    };

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") resetOldEntries();
    });
    return () => sub.remove();
  }, []);

  const notify = useCallback(
    (eventType: "depart" | "arrive") => {
      if (!selectedUser) {
        Alert.alert("エラー", "利用者を選択してください");
        return;
      }
      const targetUser = selectedUser;
      const currentPhase = notified[targetUser]?.phase;
      const nextPhase = advancePhase(currentPhase, eventType);

      if (!nextPhase) return;

      const label = eventType === "depart" ? "出発" : "到着";
      Alert.alert(
        "確認",
        `${targetUser}さんに${label}通知を送りますか？`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "送信",
            onPress: async () => {
              try {
                setSending(true);
                await sendPickupNotification(targetUser, eventType);
                setSelectedUser(null);
                Burnt.toast({
                  title: `${targetUser}さんの${label}通知を送りました`,
                  preset: "done",
                });
                setNotified((prev) => {
                  const next = {
                    ...prev,
                    [targetUser]: { phase: nextPhase, date: getTodayString() },
                  };
                  saveNotifyStatus(next);
                  return next;
                });
              } catch (error) {
                await Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
                Alert.alert("通知失敗", getErrorMessage(error));
              } finally {
                setSending(false);
              }
            },
          },
        ],
      );
    },
    [selectedUser, notified],
  );

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
