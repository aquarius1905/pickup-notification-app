import DateTimePicker from "@react-native-community/datetimepicker";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ServiceUser, UpcomingCancellation, Weekday } from "@/lib/api";
import { useServiceUsers } from "@/hooks/useServiceUsers";
import { useUpcomingCancellations } from "@/hooks/useUpcomingCancellations";
import {
  filterAndSortByDay,
  formatDateString,
  formatDayTime,
  getDaySchedule,
  getTodayString,
} from "@/lib/schedule";
import { centeredOverlayStyle, colors } from "@/lib/theme";

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
  const { users, fetching: usersFetching } = useServiceUsers();

  const weekday = selectedDate.getDay() as Weekday;
  const selectedDateString = useMemo(
    () => formatDateString(selectedDate),
    [selectedDate],
  );

  const canceledNamesForSelectedDate = useMemo(
    () =>
      new Set(
        cancellations
          .filter((c) => c.date === selectedDateString)
          .map((c) => c.family?.user_name)
          .filter((name): name is string => Boolean(name)),
      ),
    [cancellations, selectedDateString],
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
          renderItem={({ item }: { item: UpcomingCancellation }) => (
            <View style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.userName}>
                  {item.family?.user_name ?? "（不明な利用者）"}
                </Text>
                {isToday(item.date) && (
                  <Text style={styles.badge}>本日</Text>
                )}
              </View>
              <Text style={styles.date}>{formatCancellationDate(item.date)}</Text>
              {item.reason && <Text style={styles.reason}>{item.reason}</Text>}
            </View>
          )}
          ListEmptyComponent={
            loading ? null : (
              <Text style={styles.emptyText}>
                今後のキャンセル予定はありません。
              </Text>
            )
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
                />
              )}
            </>
          }
          renderItem={({ item }: { item: ServiceUser }) => {
            const canceled = canceledNamesForSelectedDate.has(item.user_name);
            return (
              <View style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.userName}>{item.user_name}</Text>
                  {canceled && <Text style={styles.badge}>キャンセル</Text>}
                </View>
                <Text style={styles.date}>
                  {formatDayTime(getDaySchedule(item, weekday))}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            usersFetching ? null : (
              <Text style={styles.emptyText}>
                この日に利用予定の利用者はいません。
              </Text>
            )
          }
        />
      )}

      {showLoader && <ActivityIndicator size="large" style={styles.loader} />}
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
  row: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
  },
  badge: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    color: colors.white,
    backgroundColor: colors.danger,
  },
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
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 32,
    lineHeight: 22,
  },
});
