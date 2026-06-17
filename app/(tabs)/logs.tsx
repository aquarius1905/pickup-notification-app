import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { LogsPeriod, NotificationLog } from "@/lib/api";
import { fetchNotificationLogs } from "@/lib/api";
import { showErrorAlert } from "@/lib/error";
import { colors, inputStyle } from "@/lib/theme";

const PERIOD_OPTIONS: { value: LogsPeriod; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "all", label: "全期間" },
];

const SEARCH_DEBOUNCE_MS = 400;

function formatLogDate(isoString: string): string {
  return new Date(isoString).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventLabel(eventType: NotificationLog["event_type"]): string {
  return eventType === "pickup_approaching" ? "お迎え通知" : "お送り通知";
}

/** LINE APIのエラーレスポンス（JSON文字列）から要点だけ取り出す。解析できない場合は元の文字列を返す */
function formatErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "message" in parsed) {
      const message = String((parsed as { message: unknown }).message);
      const details = (parsed as { details?: unknown }).details;
      if (Array.isArray(details)) {
        const detailMessages = details
          .map((d) =>
            d && typeof d === "object" && "message" in d
              ? String((d as { message: unknown }).message)
              : null,
          )
          .filter((m): m is string => Boolean(m));
        if (detailMessages.length > 0) {
          return `${message}（${detailMessages.join(" / ")}）`;
        }
      }
      return message;
    }
  } catch {
    // JSON以外はそのまま表示
  }
  return raw;
}

export default function LogsScreen() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [period, setPeriod] = useState<LogsPeriod>("all");

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchText.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadFirstPage = useCallback(
    async (setLoadingFlag: (v: boolean) => void) => {
      setLoadingFlag(true);
      try {
        const page = await fetchNotificationLogs({
          search: debouncedSearch || undefined,
          period,
          offset: 0,
        });
        setLogs(page.logs);
        setHasMore(page.hasMore);
      } catch (error) {
        showErrorAlert(error);
      } finally {
        setLoadingFlag(false);
      }
    },
    [debouncedSearch, period],
  );

  useEffect(() => {
    loadFirstPage(setLoading);
  }, [loadFirstPage]);

  const handleRefresh = useCallback(
    () => loadFirstPage(setRefreshing),
    [loadFirstPage],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading || refreshing) return;
    setLoadingMore(true);
    try {
      const page = await fetchNotificationLogs({
        search: debouncedSearch || undefined,
        period,
        offset: logs.length,
      });
      setLogs((prev) => [...prev, ...page.logs]);
      setHasMore(page.hasMore);
    } catch (error) {
      showErrorAlert(error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, refreshing, debouncedSearch, period, logs.length]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={logs}
        keyExtractor={(item) => item.id}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>通知履歴</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="利用者名で検索"
              value={searchText}
              onChangeText={setSearchText}
            />
            <View style={styles.periodRow}>
              {PERIOD_OPTIONS.map((option) => {
                const selected = period === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.periodButton,
                      selected && styles.periodButtonSelected,
                    ]}
                    onPress={() => setPeriod(option.value)}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        selected && styles.periodTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.userName}>
                {item.family?.user_name ?? "（不明な利用者）"}
              </Text>
              <Text
                style={[
                  styles.statusBadge,
                  item.success ? styles.statusSuccess : styles.statusFailed,
                ]}
              >
                {item.success ? "成功" : "失敗"}
              </Text>
            </View>
            <Text style={styles.eventLabel}>{getEventLabel(item.event_type)}</Text>
            <Text style={styles.message}>{item.message}</Text>
            {!item.success && item.error_message ? (
              <Text style={styles.errorMessage}>
                {formatErrorMessage(item.error_message)}
              </Text>
            ) : null}
            <Text style={styles.date}>{formatLogDate(item.created_at)}</Text>
          </View>
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} />
          ) : null
        }
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.emptyText}>
              {logs.length === 0
                ? "通知履歴はありません。"
                : "条件に一致する履歴はありません。"}
            </Text>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
  searchInput: {
    ...inputStyle,
    marginBottom: 8,
  },
  periodRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  periodButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  periodTextSelected: {
    color: colors.white,
  },
  loader: {
    marginTop: 32,
  },
  footerLoader: {
    marginVertical: 16,
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
  statusBadge: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    color: colors.white,
  },
  statusSuccess: {
    backgroundColor: colors.success,
  },
  statusFailed: {
    backgroundColor: colors.danger,
  },
  eventLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
    color: colors.textMid,
    marginTop: 2,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 32,
    lineHeight: 22,
  },
});
