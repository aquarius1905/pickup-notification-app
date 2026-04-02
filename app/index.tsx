import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ServiceUserItem } from "../components/ServiceUserItem";
import { useServiceUsers } from "../hooks/useServiceUsers";

export default function HomeScreen() {
  const { users, selectedUser, setSelectedUser, fetching, sending, notify } =
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

      <Text style={styles.sectionTitle}>利用者を選択</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.patient_name}
        renderItem={({ item }) => (
          <ServiceUserItem
            name={item.patient_name}
            selected={selectedUser === item.patient_name}
            onSelect={setSelectedUser}
          />
        )}
        style={styles.list}
      />

      {selectedUser && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.departButton, sending && styles.disabledButton]}
            onPress={() => notify("depart")}
            disabled={sending}
          >
            <Text style={styles.buttonText}>出発</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.arriveButton, sending && styles.disabledButton]}
            onPress={() => notify("arrive")}
            disabled={sending}
          >
            <Text style={styles.buttonText}>到着</Text>
          </TouchableOpacity>
        </View>
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
});
