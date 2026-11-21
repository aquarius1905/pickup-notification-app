import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { showErrorAlert } from "@/lib/error";
import { registerFacilityCode } from "@/lib/facilityAuth";
import { colors, inputStyle } from "@/lib/theme";

// 施設コードは運営者が手作業で発行している。Google Playなどから入った人が
// この画面で行き止まりにならないよう、申込フォームとマニュアルへの導線を出す
const APPLY_FORM_URL = "https://forms.gle/eKQ53u9m4PKbbyPM8";
const MANUAL_URL =
  "https://docs.google.com/document/d/1Sm1awuFpttnb-HNm9Utt4viePGJhi4CeFMyLvNtR_7Q/edit?usp=sharing";

async function openLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch (error) {
    showErrorAlert(error);
  }
}

type Props = {
  onRegistered: () => void;
};

export function FacilityCodeSetup({ onRegistered }: Props) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("エラー", "施設コードを入力してください");
      return;
    }

    try {
      setSubmitting(true);
      const facility = await registerFacilityCode(trimmed);
      Alert.alert("設定完了", `「${facility.name}」として設定しました`, [
        { text: "OK", onPress: onRegistered },
      ]);
    } catch (error) {
      showErrorAlert(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Text style={styles.title}>施設の設定</Text>
        <Text style={styles.description}>
          10文字の施設コードを入力してください。
        </Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="施設コード"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>登録</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => openLink(APPLY_FORM_URL)}
        >
          <Text style={styles.linkText}>
            施設コードをお持ちでない方（お申し込み）
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => openLink(MANUAL_URL)}
        >
          <Text style={styles.linkText}>使い方（職員向けマニュアル）</Text>
        </TouchableOpacity>
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
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    ...inputStyle,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  linkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
