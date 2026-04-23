import React from "react";
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

      <Text style={styles.sectionTitle}>利用者を選択（{users.length}名）</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ServiceUserItem
            name={item.patient_name}
            selected={selectedUser === item.patient_name}
            onSelect={setSelectedUser}
            notifiedTypes={notified[item.patient_name]}
          />
        )}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            利用者が登録されていません。{"\n"}「利用者管理」タブから追加してください。
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#666",
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
