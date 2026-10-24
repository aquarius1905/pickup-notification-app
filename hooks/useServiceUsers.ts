import * as Burnt from "burnt";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";

import { useGuardedLoad } from "@/hooks/useGuardedLoad";
import { fetchServiceUsers, recordNotifyPhase } from "@/lib/api";
import type { NotifyPhase, ServiceUser } from "@/lib/api";
import { subscribeTodayCancellation } from "@/lib/cancellationEvents";
import { getErrorMessage, showErrorAlert } from "@/lib/error";

export type { NotifyPhase };

function noop(): void {}

/** 送迎通知タブを開いている間、ご家族のLINEキャンセルなどを拾うために再取得する間隔 */
const AUTO_REFRESH_INTERVAL_MS = 60 * 1000;

type Options = {
  /** 画面表示中に定期的に、またアプリが前面に戻った時に、一覧を裏で再取得する */
  autoRefresh?: boolean;
};

export function useServiceUsers({ autoRefresh = false }: Options = {}) {
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

  // 自動の再取得（loadSilently）の結果を捨てるための世代番号。
  // 手動の取得・通知の送信・楽観更新・キャンセルイベントのたびに進め、
  // 自動の再取得は開始時の値と完了時の値が違えば結果を反映しない。
  // （送信前に始まった取得の結果が後から返り、送信直後の表示を古い値で上書きして
  // 「未通知」に戻る → 職員が再度押してLINEが二重送信される、といった事態を防ぐ）
  const silentLoadGenerationRef = useRef(0);
  const invalidateSilentLoads = useCallback(() => {
    silentLoadGenerationRef.current += 1;
  }, []);

  const load = useCallback(
    (setLoadingFlag: (v: boolean) => void) => {
      invalidateSilentLoads();
      return runGuarded(
        () => fetchServiceUsers(),
        setLoadingFlag,
        setUsers,
        showErrorAlert,
      );
    },
    [runGuarded, invalidateSilentLoads],
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

  // 自動の再取得は職員の操作と無関係に走るため、
  // - 通信エラーでもアラートは出さない（電波の悪い場所で1分ごとに出続けるのを防ぐ。次回で回復する）
  // - runGuardedを使わない（手動の取得の世代を進めて、引っ張って更新のスピナーが消えなくなるのを防ぐ）
  // - 取得中に他の更新が入ったら、結果を捨てる（silentLoadGenerationRef を参照）
  const loadSilently = useCallback(async () => {
    const generation = silentLoadGenerationRef.current;
    try {
      const latest = await fetchServiceUsers();
      if (generation === silentLoadGenerationRef.current) setUsers(latest);
    } catch {
      // 次回の再取得に任せる
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!autoRefresh) return;
      const timer = setInterval(loadSilently, AUTO_REFRESH_INTERVAL_MS);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") loadSilently();
      });
      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [autoRefresh, loadSilently]),
  );

  // 予定確認タブで今日分のキャンセルが登録・取り消しされたら、再取得を待たずにバッジを切り替える
  useEffect(
    () =>
      subscribeTodayCancellation(({ userId, canceledToday }) => {
        invalidateSilentLoads();
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, canceled_today: canceledToday } : u,
          ),
        );
      }),
    [invalidateSilentLoads],
  );

  // 再取得の結果を待たずに一覧上の表示を即時更新する（次の再取得時にサーバー値で上書きされる）
  const setPhaseOptimistically = useCallback(
    (targetUser: string, phase: NotifyPhase) => {
      invalidateSilentLoads();
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser ? { ...u, today_phase: phase } : u)),
      );
    },
    [invalidateSilentLoads],
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
            invalidateSilentLoads();
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
  }, [selectedUser, notified, users, setPhaseOptimistically, invalidateSilentLoads]);

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
    invalidateSilentLoads();
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
  }, [selectedUser, notified, users, setPhaseOptimistically, invalidateSilentLoads]);

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
