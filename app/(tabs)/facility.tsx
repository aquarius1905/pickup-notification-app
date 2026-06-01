import { useCallback, useEffect, useState } from "react";
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
import type { Facility } from "@/lib/api";
import { API_KEY, fetchFacility, updateFacilityName } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";
import { colors } from "@/lib/theme";

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
    } catch (error) {
      Alert.alert("エラー", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("エラー", "施設名を入力してください");
      return;
    }
    if (trimmedName === facility?.name) {
      Alert.alert("変更なし", "施設名は変更されていません");
      return;
    }

    try {
      setSubmitting(true);
      const updated = await updateFacilityName(trimmedName);
      setFacility(updated);
      Alert.alert("保存しました", `施設名を「${updated.name}」に更新しました`);
    } catch (error) {
      Alert.alert("エラー", getErrorMessage(error));
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
                <ActivityIndicator color={colors.white} />
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
    backgroundColor: colors.white,
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
    color: colors.textDark,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  apiKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  apiKeyText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMid,
    fontFamily: "monospace",
  },
  copyButton: {
    backgroundColor: colors.bgMuted,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
  },
});
