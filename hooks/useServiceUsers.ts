import { useCallback, useEffect, useState } from "react";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Burnt from "burnt";
import * as Haptics from "expo-haptics";
import type { ServiceUser } from "@/lib/api";
import { fetchServiceUsers, sendApproachingNotification } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";
import { withAsyncLoading } from "@/lib/asyncLoad";

export type NotifyPhase =
  | "pickup_approaching"
  | "pickup_completed"
  | "dropoff_approaching"
  | "dropoff_completed";

export type NotifyEntry = { phase: NotifyPhase; date: string; minutes?: 5 | 10 };
export type NotifyStatus = Record<string, NotifyEntry>;

const STORAGE_KEY = "notifyStatus_v2";

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

  const recordNotified = useCallback(
    (targetUser: string, phase: NotifyPhase, minutes?: 5 | 10) => {
      setNotified((prev) => {
        const next = {
          ...prev,
          [targetUser]: { phase, date: getTodayString(), minutes },
        };
        saveNotifyStatus(next);
        return next;
      });
    },
    [],
  );

  // 「あと◯分」通知を送信し、*_approaching フェーズへ
  // LINE未連携の利用者は電話連絡の記録としてログに残す（LINE送信はしない）
  const notifyApproaching = useCallback(
    () => {
      if (!selectedUser) {
        Alert.alert("エラー", "利用者を選択してください");
        return;
      }
      const targetUser = selectedUser;
      const currentPhase = notified[targetUser]?.phase;

      const nextPhase: NotifyPhase | null =
        !currentPhase ? "pickup_approaching"
        : currentPhase === "pickup_completed" ? "dropoff_approaching"
        : null;

      if (!nextPhase) return;

      const user = users.find((u) => u.user_name === targetUser);
      const minutes = user?.notify_minutes ?? 10;
      const label = nextPhase === "pickup_approaching" ? "お迎え" : "お送り";
      const isLinked = Boolean(user?.line_user_id);

      const confirmMessage = isLinked
        ? `${targetUser}さんにあと${minutes}分で到着の通知を送りますか？`
        : `${targetUser}さんに${label}の電話連絡をしましたか？`;
      const confirmButtonText = isLinked ? "送信" : "連絡済みにする";
      const successToastTitle = isLinked
        ? `${targetUser}さんに${label}あと${minutes}分の通知を送りました`
        : `${targetUser}さんを${label}連絡済みにしました`;

      Alert.alert("確認", confirmMessage, [
        { text: "キャンセル", style: "cancel" },
        {
          text: confirmButtonText,
          onPress: async () => {
            try {
              setSending(true);
              await sendApproachingNotification(targetUser, nextPhase);
              setSelectedUser(null);
              Burnt.toast({ title: successToastTitle, preset: "done" });
              recordNotified(targetUser, nextPhase, minutes);
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
      ]);
    },
    [selectedUser, notified, users, recordNotified],
  );

  // お迎え済み / お送り済みを記録（LINE通知なし）
  const markComplete = useCallback(() => {
    if (!selectedUser) return;
    const targetUser = selectedUser;
    const currentPhase = notified[targetUser]?.phase;

    const nextPhase: NotifyPhase | null =
      currentPhase === "pickup_approaching" ? "pickup_completed"
      : currentPhase === "dropoff_approaching" ? "dropoff_completed"
      : null;

    if (!nextPhase) return;

    const label = nextPhase === "pickup_completed" ? "お迎え" : "お送り";
    setSelectedUser(null);
    recordNotified(targetUser, nextPhase);
    Burnt.toast({
      title: `${targetUser}さんを${label}済みにしました`,
      preset: "done",
    });
  }, [selectedUser, notified, recordNotified]);

  return {
    users,
    selectedUser,
    setSelectedUser,
    fetching,
    refreshing,
    refresh,
    sending,
    notifyApproaching,
    markComplete,
    notified,
  } as const;
}
