import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  primary: "#2563eb",
  primaryLight: "#eff6ff",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  white: "#fff",
  border: "#ddd",
  borderLight: "#eee",
  bgLight: "#f9fafb",
  bgMuted: "#f3f4f6",
  text: "#111",
  textDark: "#333",
  textMid: "#444",
  textSecondary: "#666",
  textMuted: "#999",
  backdrop: "rgba(0,0,0,0.4)",
} as const;

export const inputStyle: TextStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
};

/** 画面全体に重ねて中央表示するローディングスピナー用のスタイル */
export const centeredOverlayStyle: ViewStyle = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  justifyContent: "center",
  alignItems: "center",
};

/** 一覧画面の枠付きカード行（利用者・キャンセル予定・通知履歴などで共通） */
export const cardRowStyle: ViewStyle = {
  padding: 16,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  marginBottom: 8,
};

/** カード行内で名前とバッジを両端揃えにする見出し行 */
export const rowHeaderStyle: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
};

/** 一覧が空のときの案内文 */
export const emptyTextStyle: TextStyle = {
  textAlign: "center",
  color: colors.textMuted,
  fontSize: 14,
  marginTop: 32,
  lineHeight: 22,
};

/** 色付き丸角バッジの共通見た目（背景色は呼び出し側で指定） */
export const badgeContainerStyle: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 4,
};

export const badgeTextStyle: TextStyle = {
  fontSize: 13,
  fontWeight: "600",
  color: colors.white,
};
