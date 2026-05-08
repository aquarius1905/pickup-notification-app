import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Facility, fetchFacility, updateFacilityName } from "../../lib/api";

const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "";

export default function FacilityScreen() {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchFacility();
      setFacility(data);
      setName(data.name);
    } catch {
      Alert.alert("エラー", "施設情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("エラー", "施設名を入力してください");
      return;
    }
    if (name.trim() === facility?.name) {
      Alert.alert("変更なし", "施設名は変更されていません");
      return;
    }

    try {
      setSubmitting(true);
      const updated = await updateFacilityName(name.trim());
      setFacility(updated);
      Alert.alert("保存しました", `施設名を「${updated.name}」に更新しました`);
    } catch (error) {
      Alert.alert("エラー", error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyApiKey = async () => {
    await Clipboard.setStringAsync(API_KEY);
    Alert.alert("コピーしました", "APIキーをクリップボードにコピーしました");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView>
          <Text style={styles.title}>施設設定</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>施設名</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="施設名を入力"
            />
            <TouchableOpacity
              style={[styles.saveButton, submitting && styles.disabledButton]}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APIキー</Text>
            <Text style={styles.hint}>
              スタッフのアプリ設定に使用するキーです。
            </Text>
            <View style={styles.apiKeyRow}>
              <Text style={styles.apiKeyText} numberOfLines={1} ellipsizeMode="middle">
                {API_KEY || "（未設定）"}
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyApiKey}
                disabled={!API_KEY}
              >
                <Text style={styles.copyButtonText}>コピー</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
    padding: 24,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  apiKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  apiKeyText: {
    flex: 1,
    fontSize: 13,
    color: "#444",
    fontFamily: "monospace",
  },
  copyButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "600",
  },
});
