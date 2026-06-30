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
