import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { UpcomingCancellation } from "@/lib/api";
import { useUpcomingCancellations } from "@/hooks/useUpcomingCancellations";
import { getTodayString } from "@/lib/schedule";
import { colors } from "@/lib/theme";

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

export default function CancellationsScreen() {
  const { cancellations, loading, refreshing, refresh } =
    useUpcomingCancellations();

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={cancellations}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Text style={styles.title}>キャンセル予定</Text>
        }
        renderItem={({ item }: { item: UpcomingCancellation }) => (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.userName}>
                {item.family?.user_name ?? "（不明な利用者）"}
              </Text>
              {isToday(item.date) && (
                <Text style={styles.todayBadge}>本日</Text>
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
      {loading && <ActivityIndicator size="large" style={styles.loader} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  loader: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },
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
  todayBadge: {
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
