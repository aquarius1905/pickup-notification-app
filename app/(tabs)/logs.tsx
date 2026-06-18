import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { NotificationLog } from "@/lib/api";
import { SelectableButtonRow } from "@/components/SelectableButtonRow";
import { useNotificationLogs } from "@/hooks/useNotificationLogs";
import { colors, inputStyle } from "@/lib/theme";

const PERIOD_OPTIONS = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "all", label: "全期間" },
] as const;

const EVENT_TYPE_OPTIONS = [
  { value: "all", label: "全て" },
  { value: "pickup_approaching", label: "お迎え" },
  { value: "dropoff_approaching", label: "お送り" },
] as const;

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

/** イベント種別と通知文の「あと◯分」を1行にまとめる（例: お送り通知（10分前・電話）） */
function formatEventSummary(log: NotificationLog): string {
  const label = getEventLabel(log.event_type);
  const minutesMatch = log.message.match(/あと(\d+)分で到着します/);
  if (!minutesMatch) return label;
  const isPhone = log.message.includes("電話連絡");
  return isPhone
    ? `${label}（${minutesMatch[1]}分前・電話）`
    : `${label}（${minutesMatch[1]}分前）`;
}

const KNOWN_ERROR_PATTERNS: { test: RegExp; message: string }[] = [
  {
    test: /haven.?t added|blocked the (bot|official account)/i,
    message: "ご家族がLINEをブロックしている、または友だち追加していない可能性があります。",
  },
  {
    test: /reached the limit/i,
    message: "今月のLINE無料メッセージ送信数の上限に達しました。",
  },
  {
    test: /authentication failed|invalid.*(access token|channel)/i,
    message: "LINEとの認証に失敗しました。システム管理者にご確認ください。",
  },
  {
    test: /too many requests|rate limit/i,
    message: "送信が混み合ったため一時的に失敗しました。時間をおいて再度お試しください。",
  },
];

const GENERIC_ERROR_MESSAGE =
  "通知の送信に失敗しました（システムエラー）。\n解消しない場合はシステム担当者にご確認ください。";

/** LINE APIのエラーをよくあるケースは日本語に変換し、それ以外は汎用文にする */
function formatErrorMessage(raw: string): string {
  const matched = KNOWN_ERROR_PATTERNS.find((pattern) => pattern.test.test(raw));
  return matched ? matched.message : GENERIC_ERROR_MESSAGE;
}

export default function LogsScreen() {
  const {
    logs,
    loading,
    refreshing,
    loadingMore,
    searchText,
    setSearchText,
    period,
    setPeriod,
    eventTypeFilter,
    setEventTypeFilter,
    refresh,
    loadMore,
  } = useNotificationLogs();

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
            <SelectableButtonRow
              options={PERIOD_OPTIONS}
              isSelected={(value) => period === value}
              onSelect={setPeriod}
              style={styles.filterRow}
            />
            <SelectableButtonRow
              options={EVENT_TYPE_OPTIONS}
              isSelected={(value) => eventTypeFilter === value}
              onSelect={setEventTypeFilter}
              style={styles.filterRow}
            />
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
            <Text style={styles.eventLabel}>{formatEventSummary(item)}</Text>
            {!item.success && item.error_message ? (
              <Text style={styles.errorMessage}>
                {formatErrorMessage(item.error_message)}
              </Text>
            ) : null}
            <Text style={styles.date}>{formatLogDate(item.created_at)}</Text>
          </View>
        )}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.footerLoader} /> : null
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
  searchInput: {
    ...inputStyle,
    marginBottom: 8,
  },
  filterRow: {
    marginBottom: 16,
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
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: "600",
  },
  errorMessage: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 4,
  },
  date: {
    fontSize: 16,
    color: colors.textMuted,
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
