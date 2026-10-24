import * as Clipboard from "expo-clipboard";
import { Alert } from "react-native";

export async function copyToClipboard(
  text: string,
  successMessage: string,
): Promise<void> {
  try {
    await Clipboard.setStringAsync(text);
    Alert.alert("コピーしました", successMessage);
  } catch {
    Alert.alert("エラー", "コピーに失敗しました");
  }
}
