import DateTimePicker from "@react-native-community/datetimepicker";
import * as Burnt from "burnt";
import { useCallback, useMemo, useState } from "react";
import type { TextStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CancellationModal } from "@/components/CancellationModal";
import { useServiceUsers } from "@/hooks/useServiceUsers";
import { useUpcomingCancellations } from "@/hooks/useUpcomingCancellations";
import type { ServiceUser, UpcomingCancellation, Weekday } from "@/lib/api";
import { createCancellation, deleteCancellation } from "@/lib/api";
import { showErrorAlert } from "@/lib/error";
import {
  filterAndSortByDay,
  formatDateString,
  formatDayTime,
  getDaySchedule,
  getTodayString,
} from "@/lib/schedule";
import {
  badgeContainerStyle,
  badgeTextStyle,
  cardRowStyle,
  centeredOverlayStyle,
  colors,
  emptyTextStyle,
  rowHeaderStyle,
} from "@/lib/theme";

type Mode = "schedule" | "cancellations";

function formatCancellationDate(date: string): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

function isToday(date: string): boolean {
  return date === getTodayString();
}

export default function ScheduleScreen() {
  const [mode, setMode] = useState<Mode>("cancellations");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showPicker, setShowPicker] = useState(false);

  const { cancellations, loading, refreshing, refresh } =
    useUpcomingCancellations();
  const {
    users,
    fetching: usersFetching,
    refreshing: usersRefreshing,
    refresh: refreshUsers,
  } = useServiceUsers();

  const weekday = selectedDate.getDay() as Weekday;
  const selectedDateString = useMemo(
    () => formatDateString(selectedDate),
    [selectedDate],
  );

  const cancellationsByUserForSelectedDate = useMemo(
    () =>
      new Map(
        cancellations
          .filter((c) => c.date === selectedDateString)
          .map((c) => [c.family_id, c]),
      ),
    [cancellations, selectedDateString],
  );
  // 過去日のキャンセルは登録・取り消しできない（Worker側も登録・取り消しとも今日以降のみ受け付ける）
  const isSelectedDateEditable = selectedDateString >= getTodayString();

  const [cancelTarget, setCancelTarget] = useState<ServiceUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitCancellation = useCallback(
    async (reason: string, detail: string) => {
      if (!cancelTarget) return;
      try {
        setSubmitting(true);
        await createCancellation(
          cancelTarget.id,
          selectedDateString,
          reason,
          detail,
        );
        Burnt.toast({
          title: `${cancelTarget.user_name}さんのキャンセルを登録しました`,
          preset: "done",
        });
        setCancelTarget(null);
        refresh();
      } catch (error) {
        showErrorAlert(error);
      } finally {
        setSubmitting(false);
      }
    },
    [cancelTarget, selectedDateString, refresh],
  );

  const confirmWithdraw = useCallback(
    (cancellation: UpcomingCancellation, userName: string) => {
      Alert.alert(
        "取り消し確認",
        `${userName}さんの${formatCancellationDate(cancellation.date)}のキャンセルを取り消しますか？`,
        [
          { text: "閉じる", style: "cancel" },
          {
            text: "取り消す",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteCancellation(cancellation.id);
                Burnt.toast({
                  title: `${userName}さんのキャンセルを取り消しました`,
                  preset: "done",
                });
                refresh();
              } catch (error) {
                showErrorAlert(error);
              }
            },
          },
        ],
      );
    },
    [refresh],
  );

  const usersForSelectedDate = useMemo(
    () => filterAndSortByDay(users, weekday),
    [users, weekday],
  );

  const handleDateChange = useCallback((_event: unknown, date?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (date) setSelectedDate(date);
  }, []);

  const showLoader = mode === "schedule" ? usersFetching : loading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>予定確認</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === "schedule" && styles.toggleButtonActive,
            ]}
            onPress={() => setMode("schedule")}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "schedule" && styles.toggleTextActive,
              ]}
            >
              利用予定
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              mode === "cancellations" && styles.toggleButtonActive,
            ]}
            onPress={() => setMode("cancellations")}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "cancellations" && styles.toggleTextActive,
              ]}
            >
              キャンセル予定
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === "cancellations" ? (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={cancellations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: UpcomingCancellation }) => {
            const userName = item.family?.user_name ?? "（不明な利用者）";
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => confirmWithdraw(item, userName)}
              >
                <View style={styles.rowHeader}>
                  <Text style={styles.userName}>{userName}</Text>
                  {isToday(item.date) && (
                    <Text style={styles.badge}>本日</Text>
                  )}
                </View>
                <Text style={styles.date}>
                  {formatCancellationDate(item.date)}
                </Text>
                {item.reason && (
                  <Text style={styles.reason}>{item.reason}</Text>
                )}
                {item.source === "facility" && (
                  <Text style={styles.source}>施設で登録</Text>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            loading ? null : (
              <Text style={styles.emptyText}>
                今後のキャンセル予定はありません。
              </Text>
            )
          }
          ListHeaderComponent={
            cancellations.length > 0 ? (
              <Text style={styles.hint}>
                タップするとキャンセルを取り消せます
              </Text>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
        />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={usersForSelectedDate}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowPicker((v) => !v)}
              >
                <Text style={styles.dateButtonText}>
                  {selectedDate.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </Text>
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={handleDateChange}
                  accentColor={colors.primary}
                />
              )}
              {isSelectedDateEditable && usersForSelectedDate.length > 0 && (
                <Text style={styles.hint}>
                  利用者をタップすると、キャンセルの登録・取り消しができます
                </Text>
              )}
            </>
          }
          renderItem={({ item }: { item: ServiceUser }) => {
            const cancellation = cancellationsByUserForSelectedDate.get(
              item.id,
            );
            return (
              <TouchableOpacity
                style={styles.row}
                disabled={!isSelectedDateEditable}
                onPress={() =>
                  cancellation
                    ? confirmWithdraw(cancellation, item.user_name)
                    : setCancelTarget(item)
                }
              >
                <View style={styles.rowHeader}>
                  <Text style={styles.userName}>{item.user_name}</Text>
                  {cancellation && (
                    <Text style={styles.badge}>キャンセル</Text>
                  )}
                </View>
                <Text style={styles.date}>
                  {formatDayTime(getDaySchedule(item, weekday))}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            usersFetching ? null : (
              <Text style={styles.emptyText}>
                この日に利用予定の利用者はいません。
              </Text>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={usersRefreshing}
              onRefresh={() => {
                refreshUsers();
                refresh();
              }}
            />
          }
        />
      )}

      {showLoader && <ActivityIndicator size="large" style={styles.loader} />}

      <CancellationModal
        target={
          cancelTarget && {
            userName: cancelTarget.user_name,
            dateLabel: formatCancellationDate(selectedDateString),
          }
        }
        submitting={submitting}
        onSubmit={handleSubmitCancellation}
        onClose={() => setCancelTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    padding: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: colors.bgMuted,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: colors.white,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingTop: 0,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  loader: centeredOverlayStyle,
  row: cardRowStyle,
  rowHeader: rowHeaderStyle,
  userName: {
    fontSize: 17,
    fontWeight: "600",
  },
  badge: {
    ...badgeContainerStyle,
    ...badgeTextStyle,
    backgroundColor: colors.danger,
  } as TextStyle,
  date: {
    fontSize: 16,
    color: colors.textMid,
    marginTop: 4,
  },
  reason: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  source: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyText: emptyTextStyle,
});
