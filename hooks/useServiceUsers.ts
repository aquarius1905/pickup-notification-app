import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import * as Burnt from "burnt";
import * as Haptics from "expo-haptics";
import type { ServiceUser } from "@/lib/api";
import { fetchServiceUsers, sendPickupNotification } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";

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

  const loadUsers = useCallback(() => load(setFetching), [load]);
  const refresh = useCallback(() => load(setRefreshing), [load]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const notify = (eventType: "depart" | "arrive") => {
    if (!selectedUser) {
      Alert.alert("エラー", "利用者を選択してください");
      return;
    }
    const label = eventType === "depart" ? "出発" : "到着";
    const targetUser = selectedUser;
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
                if (eventType === "arrive") {
                  // 到着通知でサイクル完了 → バッジをリセット
                  const next = { ...prev };
                  delete next[targetUser];
                  return next;
                }
                const set = new Set(prev[targetUser] ?? []);
                set.add(eventType);
                return { ...prev, [targetUser]: set };
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
