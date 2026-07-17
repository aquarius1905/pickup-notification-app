import type { ServiceUser } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import { colors } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

// 送迎通知専用LINE公式アカウントの友だち追加URL。全施設共通の1アカウントのため
// 施設ごとの設定値ではなく、アプリ全体で1つのビルド時環境変数として扱う。
const LINE_ADD_FRIEND_URL = process.env.EXPO_PUBLIC_LINE_ADD_FRIEND_URL;

type Props = {
  user: ServiceUser | null;
  onClose: () => void;
};

export function InviteCodeModal({ user, onClose }: Props) {
  return (
    <Modal
      visible={user !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.codeSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.codeSheetHeader}>
            <Text style={styles.codeSheetName}>{user?.user_name}さん</Text>
            <TouchableOpacity style={styles.codeCloseIconButton} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {!LINE_ADD_FRIEND_URL && (
            <Text style={styles.codeSheetHint}>
              この画面を見せるか、コードを紙に書いてお渡しください
            </Text>
          )}

          {LINE_ADD_FRIEND_URL && (
            <View style={styles.codeStep}>
              <Text style={styles.codeStepLabel}>① LINEを友だち追加</Text>
              <View style={styles.qrWrapper}>
                <QRCode value={LINE_ADD_FRIEND_URL} size={140} />
              </View>
            </View>
          )}

          <View style={styles.codeStep}>
            <Text style={styles.codeStepLabel}>
              {LINE_ADD_FRIEND_URL
                ? "② このコードをトークに送信"
                : "招待コードをトークに送信"}
            </Text>
            <Text style={styles.codeSheetCode}>{user?.invite_code}</Text>
          </View>
          <TouchableOpacity
            style={styles.codeCopyButton}
            onPress={async () => {
              if (!user) return;
              await copyToClipboard(
                user.invite_code,
                `招待コード: ${user.invite_code}`,
              );
            }}
          >
            <Ionicons name="copy-outline" size={16} color={colors.primary} />
            <Text style={styles.codeCopyButtonText}>コピー</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "center",
    alignItems: "center",
  },
  codeSheet: {
    width: "85%",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  codeSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  codeSheetName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  codeCloseIconButton: {
    padding: 4,
    marginRight: -4,
  },
  codeSheetHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  codeStep: {
    alignItems: "center",
    marginTop: 20,
  },
  codeStepLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMid,
    marginBottom: 10,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
  },
  codeSheetCode: {
    fontSize: 56,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 8,
  },
  codeCopyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  codeCopyButtonText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
});
