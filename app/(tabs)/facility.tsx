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
import { SafeAreaView } from "react-native-safe-area-context";
import type { Facility } from "@/lib/api";
import { fetchFacility, updateFacilityName } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { showErrorAlert } from "@/lib/error";
import { useFacilityAuthContext } from "@/lib/facilityAuthContext";
import { colors, inputStyle } from "@/lib/theme";

export default function FacilityScreen() {
  const { logout } = useFacilityAuthContext();
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
      showErrorAlert(error);
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
      showErrorAlert(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyFacilityCode = () => {
    if (!facility) return;
    copyToClipboard(
      facility.facility_code,
      `施設コード: ${facility.facility_code}`,
    );
  };

  const handleResetSetup = () => {
    Alert.alert(
      "設定を解除",
      "この端末に保存されている設定を削除し、施設コードの入力画面に戻ります。よろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        { text: "解除する", style: "destructive", onPress: logout },
      ],
    );
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
            <Text style={styles.sectionTitle}>施設コード</Text>
            <Text style={styles.description}>
              新しい職員のスマホ設定に使います。タップでコピーできます。
            </Text>
            <TouchableOpacity onPress={handleCopyFacilityCode}>
              <Text style={styles.facilityCodeText}>
                {facility?.facility_code}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.changeKeyButton}
              onPress={handleResetSetup}
            >
              <Text style={styles.changeKeyButtonText}>
                この端末の設定を解除
              </Text>
            </TouchableOpacity>
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
  input: {
    ...inputStyle,
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
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  facilityCodeText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: "monospace",
  },
  changeKeyButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  changeKeyButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "700",
  },
});
