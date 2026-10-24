import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SelectableButtonRow } from "@/components/SelectableButtonRow";
import { colors, inputStyle } from "@/lib/theme";

// Worker側（worker/src/cancelForm.ts）のLINEキャンセルフォームと同じ選択肢
const CANCEL_REASON_OPTIONS = [
  { value: "通院", label: "通院" },
  { value: "体調不良", label: "体調不良" },
  { value: "その他", label: "その他" },
] as const;
type CancelReason = (typeof CANCEL_REASON_OPTIONS)[number]["value"];

const DETAIL_MAX_LENGTH = 100;

type Props = {
  /** 登録対象。nullの間はモーダルを閉じる */
  target: { userName: string; dateLabel: string } | null;
  submitting: boolean;
  onSubmit: (reason: CancelReason, detail: string) => void;
  onClose: () => void;
};

export function CancellationModal({
  target,
  submitting,
  onSubmit,
  onClose,
}: Props) {
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [detail, setDetail] = useState("");

  const visible = target !== null;
  // 閉じるフェード中に名前・日付が消えないよう、最後に開いた対象を表示し続ける
  const lastTarget = useRef(target);
  if (target) lastTarget.current = target;
  const shown = lastTarget.current;

  // 開き直すたびに前回の入力を残さない
  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetail("");
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>キャンセルを登録</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.target}>
              {shown?.userName}さん　{shown?.dateLabel}
            </Text>

            <Text style={styles.label}>理由</Text>
            <SelectableButtonRow
              options={CANCEL_REASON_OPTIONS}
              isSelected={(value) => value === reason}
              onSelect={setReason}
            />
            {reason === "その他" && (
              <TextInput
                style={styles.input}
                value={detail}
                onChangeText={setDetail}
                maxLength={DETAIL_MAX_LENGTH}
                placeholder="（任意）詳しい理由"
              />
            )}

            <Text style={styles.hint}>
              ご家族へのLINE通知は送信されません。
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!reason || submitting) && styles.submitButtonDisabled,
              ]}
              disabled={!reason || submitting}
              onPress={() => reason && onSubmit(reason, detail)}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>登録</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "85%",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  closeButton: {
    padding: 4,
    marginRight: -4,
  },
  target: {
    fontSize: 15,
    color: colors.textMid,
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMid,
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    ...inputStyle,
    marginTop: 10,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
