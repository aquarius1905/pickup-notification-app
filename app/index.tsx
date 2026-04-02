import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useState } from "react";

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);

  const WORKER_URL = "https://round-butterfly-fc0e.reiko6122.workers.dev";

  const sendNotification = async (
    patientName: string,
    eventType: "depart" | "arrive",
  ) => {
    try {
      setLoading(true);

      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientName, eventType }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        Alert.alert("送信失敗", JSON.stringify(data));
        return;
      }

      Alert.alert(
        "送信成功",
        eventType === "depart"
          ? `${patientName}さんの出発通知を送りました`
          : `${patientName}さんの到着通知を送りました`,
      );
    } catch (error) {
      Alert.alert("エラー", "通知送信に失敗しました");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>送迎通知</Text>

      <View style={styles.card}>
        <Text style={styles.name}>テストユーザー</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.departButton,
              loading && styles.disabledButton,
            ]}
            onPress={() => sendNotification("テストユーザー", "depart")}
            disabled={loading}
          >
            <Text style={styles.buttonText}>出発</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.arriveButton,
              loading && styles.disabledButton,
            ]}
            onPress={() => sendNotification("テストユーザー", "arrive")}
            disabled={loading}
          >
            <Text style={styles.buttonText}>到着</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
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
