import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ServiceUserItem } from "../../components/ServiceUserItem";
import { useServiceUsers } from "../../hooks/useServiceUsers";
import {
  WEEKDAY_LABELS,
  filterAndSortByDay,
  formatDayTime,
  getCurrentWeekday,
  getDaySchedule,
} from "../../lib/schedule";

type NotifyButtonProps = {
  label: string;
  buttonStyle: object;
  onPress: () => void;
  disabled: boolean;
};

function NotifyButton({ label, buttonStyle, onPress, disabled }: NotifyButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      {disabled ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { users, selectedUser, setSelectedUser, fetching, refreshing, refresh, sending, notify, notified } =
    useServiceUsers();
  const [showAll, setShowAll] = useState(false);

  const today = getCurrentWeekday();
  const todayLabel = WEEKDAY_LABELS[today];

  const todayUsers = useMemo(() => filterAndSortByDay(users, today), [users, today]);
  const visibleUsers = useMemo(
    () =>
      (showAll ? users : todayUsers).map((user) => ({
        user,
        subtitle: formatDayTime(getDaySchedule(user, today)),
      })),
    [showAll, users, todayUsers, today],
  );

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>送迎通知</Text>
      <Text style={styles.dateText}>
        {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
      </Text>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {showAll
            ? `全員（${users.length}名）`
            : `本日（${todayLabel}）の利用者（${todayUsers.length}名）`}
        </Text>
        <TouchableOpacity onPress={() => setShowAll((v) => !v)}>
          <Text style={styles.toggleText}>{showAll ? "本日のみ" : "全員表示"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleUsers}
        keyExtractor={({ user }) => String(user.id)}
        renderItem={({ item: { user, subtitle } }) => (
          <ServiceUserItem
            name={user.patient_name}
            selected={selectedUser === user.patient_name}
            onSelect={setSelectedUser}
            notifiedTypes={notified[user.patient_name]}
            subtitle={subtitle}
          />
        )}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {showAll
              ? `利用者が登録されていません。${"\n"}「利用者管理」タブから追加してください。`
              : `本日（${todayLabel}）通所予定の利用者はいません。${"\n"}「全員表示」で確認できます。`}
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      />

      {selectedUser && (
        <View style={styles.buttonRow}>
          <NotifyButton
            label="出発"
            buttonStyle={styles.departButton}
            onPress={() => notify("depart")}
            disabled={sending}
          />
          <NotifyButton
            label="到着"
            buttonStyle={styles.arriveButton}
            onPress={() => notify("arrive")}
            disabled={sending}
          />
        </View>
      )}

      {sending && (
        <Text style={styles.sendingText}>通知を送信中...</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  toggleText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
  },
  list: {
    flex: 1,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  departButton: {
    backgroundColor: "#2563eb",
  },
  arriveButton: {
    backgroundColor: "#16a34a",
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  sendingText: {
    textAlign: "center",
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    marginTop: 32,
    lineHeight: 22,
  },
});
