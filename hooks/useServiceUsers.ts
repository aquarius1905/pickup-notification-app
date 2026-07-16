import * as Burnt from "burnt";
import * as Haptics from "expo-haptics";

import { fetchServiceUsers, recordNotifyPhase } from "@/lib/api";
import { getErrorMessage, showErrorAlert } from "@/lib/error";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { useGuardedLoad } from "@/hooks/useGuardedLoad";
import type { NotifyPhase, ServiceUser } from "@/lib/api";
import { useFocusEffect } from "expo-router";

export type { NotifyPhase };

function noop(): void {}

export function useServiceUsers() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 「今日どのフェーズまで進んだか」はサーバー(logs)を正として持つため、
  // usersの中の値をそのまま参照する（他端末での操作もフォーカスのたびに反映される）
  const notified = useMemo(
    () =>
      Object.fromEntries(
        users
          .filter((u): u is ServiceUser & { today_phase: NotifyPhase } => u.today_phase !== null)
          .map((u) => [u.id, u.today_phase]),
      ),
    [users],
  );

  const runGuarded = useGuardedLoad();

  const load = useCallback(
    (setLoadingFlag: (v: boolean) => void) =>
      runGuarded(
        () => fetchServiceUsers(),
        setLoadingFlag,
        setUsers,
        showErrorAlert,
      ),
    [runGuarded],
  );

  const refresh = useCallback(() => load(setRefreshing), [load]);

  // タブ画面はアンマウントされないため、フォーカスのたびに再取得して
  // 他画面・他端末での変更を反映する（マウント時の初回取得もこれで兼ねる）。
  // 初回はスピナーを見せて読み込むが、タブ復帰時は一覧を表示したまま
  // 裏で再取得し、切り替えるたびに画面がブロックされて遅く感じるのを防ぐ。
  const isFirstLoad = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        load(setFetching);
      } else {
        load(noop);
      }
    }, [load]),
  );

  // サーバーへの反映を待たずに一覧上の表示を即時更新する（次のフォーカス時にサーバー値で上書きされる）
  const setPhaseOptimistically = useCallback(
    (targetUser: string, phase: NotifyPhase) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser ? { ...u, today_phase: phase } : u)),
      );
    },
    [],
  );

  // 「あと◯分」通知を送信し、*_approaching フェーズへ
  // LINE未連携の利用者は電話連絡の記録としてログに残す（LINE送信はしない）
  const notifyApproaching = useCallback(() => {
    if (!selectedUser) {
      Alert.alert("エラー", "利用者を選択してください");
      return;
    }
    const targetId = selectedUser;
    const currentPhase = notified[targetId];

    const nextPhase: NotifyPhase | null = !currentPhase
      ? "pickup_approaching"
      : currentPhase === "pickup_completed"
        ? "dropoff_approaching"
        : null;

    if (!nextPhase) return;

    const user = users.find((u) => u.id === targetId);
    const displayName = user?.user_name ?? "";
    const minutes = user?.notify_minutes ?? 10;
    const label = nextPhase === "pickup_approaching" ? "お迎え" : "お送り";
    const isLinked = Boolean(user?.line_user_id);

    const confirmMessage = isLinked
      ? `${displayName}さんにあと${minutes}分で到着の通知を送りますか？`
      : `${displayName}さんに${label}の電話連絡をしましたか？`;
    const confirmButtonText = isLinked ? "送信" : "連絡済みにする";
    const successToastTitle = isLinked
      ? `${displayName}さんに${label}あと${minutes}分の通知を送りました`
      : `${displayName}さんを${label}連絡済みにしました`;

    Alert.alert("確認", confirmMessage, [
      { text: "キャンセル", style: "cancel" },
      {
        text: confirmButtonText,
        onPress: async () => {
          try {
            setSending(true);
            await recordNotifyPhase(targetId, nextPhase);
            setSelectedUser(null);
            Burnt.toast({ title: successToastTitle, preset: "done" });
            setPhaseOptimistically(targetId, nextPhase);
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
  }, [selectedUser, notified, users, setPhaseOptimistically]);

  // お迎え済み / お送り済みを記録（LINE通知なし）
  const markComplete = useCallback(() => {
    if (!selectedUser) return;
    const targetId = selectedUser;
    const currentPhase = notified[targetId];

    const nextPhase: NotifyPhase | null =
      currentPhase === "pickup_approaching"
        ? "pickup_completed"
        : currentPhase === "dropoff_approaching"
          ? "dropoff_completed"
          : null;

    if (!nextPhase) return;

    const user = users.find((u) => u.id === targetId);
    const displayName = user?.user_name ?? "";
    const label = nextPhase === "pickup_completed" ? "お迎え" : "お送り";

    setSelectedUser(null);
    setSending(true);
    recordNotifyPhase(targetId, nextPhase)
      .then(() => {
        setPhaseOptimistically(targetId, nextPhase);
        Burnt.toast({
          title: `${displayName}さんを${label}済みにしました`,
          preset: "done",
        });
      })
      .catch(async (error) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("記録に失敗しました", getErrorMessage(error));
      })
      .finally(() => setSending(false));
  }, [selectedUser, notified, users, setPhaseOptimistically]);

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
