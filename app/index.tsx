import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL!;

type Patient = {
  patient_name: string;
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setFetching(true);
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await response.json();
      if (data.ok) {
        setPatients(data.families);
      } else {
        Alert.alert("エラー", "利用者一覧の取得に失敗しました");
      }
    } catch (error) {
      Alert.alert("エラー", "通信エラーが発生しました");
    } finally {
      setFetching(false);
    }
  };

  const sendNotification = async (eventType: "depart" | "arrive") => {
    if (!selectedPatient) {
      Alert.alert("エラー", "利用者を選択してください");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "notify",
          patientName: selectedPatient,
          eventType,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        Alert.alert("送信失敗", JSON.stringify(data));
        return;
      }
      Alert.alert(
        "送信成功",
        eventType === "depart"
          ? `${selectedPatient}さんの出発通知を送りました`
          : `${selectedPatient}さんの到着通知を送りました`,
      );
    } catch (error) {
      Alert.alert("エラー", "通知送信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

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
        data={patients}
        keyExtractor={(item) => item.patient_name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.patientItem,
              selectedPatient === item.patient_name && styles.selectedItem,
            ]}
            onPress={() => setSelectedPatient(item.patient_name)}
          >
            <Text
              style={[
                styles.patientName,
                selectedPatient === item.patient_name && styles.selectedName,
              ]}
            >
              {item.patient_name}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.list}
      />

      {selectedPatient && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.departButton,
              loading && styles.disabledButton,
            ]}
            onPress={() => sendNotification("depart")}
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
            onPress={() => sendNotification("arrive")}
            disabled={loading}
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
  patientItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedItem: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  patientName: {
    fontSize: 18,
    fontWeight: "600",
  },
  selectedName: {
    color: "#2563eb",
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
