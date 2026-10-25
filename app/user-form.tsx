import { Ionicons } from "@expo/vector-icons";
import * as Burnt from "burnt";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useReducer, useState } from "react";
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

import { SelectableButtonRow } from "@/components/SelectableButtonRow";
import { TimePickerField } from "@/components/TimePickerField";
import { createServiceUser, unlinkLine, updateServiceUser } from "@/lib/api";
import type { Schedule, Weekday } from "@/lib/api";
import { showErrorAlert } from "@/lib/error";
import {
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_LABELS,
} from "@/lib/schedule";
import { formReducer } from "@/lib/scheduleFormReducer";
import { colors, inputStyle } from "@/lib/theme";

const NOTIFY_MINUTES_OPTIONS = [
  { value: 5, label: "5分前" },
  { value: 10, label: "10分前" },
] as const;

const WEEKDAY_OPTIONS = WEEKDAY_DISPLAY_ORDER.map((day) => ({
  value: day,
  label: WEEKDAY_LABELS[day],
}));

type Params = {
  id?: string;
  name?: string;
  lineId?: string;
  notifyMinutes?: string;
  schedule?: string;
};

function parseScheduleParam(raw: string | undefined): Schedule {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Schedule;
  } catch {
    return {};
  }
}

export default function UserFormScreen() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const isEditing = Boolean(params.id);

  const [form, dispatch] = useReducer(formReducer, {
    name: "",
    lineId: "",
    notifyMinutes: 10,
    draft: {},
    editingUser: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  // ご家族がLINEアカウントを変えた場合などに、連携を外して招待コードから連携し直せるようにする。
  // LINEのユーザーIDは職員が見ても意味がなく、手で書き換えると通知が届かなくなるため、画面には出さない
  const handleUnlink = () => {
    const editingUser = form.editingUser;
    if (!editingUser) return;
    Alert.alert(
      "連携の解除",
      `${editingUser.user_name}さんのLINE連携を解除しますか？\n解除すると、ご家族に送迎の通知が届かなくなります。もう一度連携するには、招待コードのQRを読み取ってもらってください。`,
      [
        { text: "やめる", style: "cancel" },
        {
          text: "解除する",
          style: "destructive",
          onPress: async () => {
            try {
              setUnlinking(true);
              await unlinkLine(editingUser.id);
              dispatch({ type: "setLineId", payload: "" });
              Burnt.toast({ title: "LINE連携を解除しました", preset: "done" });
            } catch (error) {
              showErrorAlert(error);
            } finally {
              setUnlinking(false);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (!params.id) return;
    const schedule = parseScheduleParam(params.schedule);
    const notifyMinutes = (Number(params.notifyMinutes) === 5 ? 5 : 10) as
      | 5
      | 10;
    dispatch({
      type: "startEdit",
      payload: {
        id: params.id,
        user_name: params.name ?? "",
        line_user_id: params.lineId ?? "",
        invite_code: "",
        schedule,
        notify_minutes: notifyMinutes,
        canceled_today: false,
        today_phase: null,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleWeekday = (day: Weekday) => {
    dispatch({ type: "toggleWeekday", payload: day });
  };

  const updateTime = (
    day: Weekday,
    field: "pickup" | "dropoff",
    value: string | null,
  ) => {
    dispatch({ type: "updateTime", payload: { day, field, value } });
  };

  const scheduledDays = useMemo(
    () => WEEKDAY_DISPLAY_ORDER.filter((day) => form.draft[`${day}`]),
    [form.draft],
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert("エラー", "利用者名を入力してください");
      return;
    }

    try {
      setSubmitting(true);
      if (form.editingUser) {
        // LINE連携はここでは送らない（招待コードと「連携を解除」ボタンだけで変える）
        await updateServiceUser(
          form.editingUser.id,
          form.name.trim(),
          form.draft,
          form.notifyMinutes,
        );
      } else {
        await createServiceUser(form.name.trim(), form.draft, form.notifyMinutes);
      }
      router.back();
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {isEditing ? "利用者を編集" : "利用者を追加"}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="利用者名"
            value={form.name}
            onChangeText={(v) => dispatch({ type: "setName", payload: v })}
          />
          {isEditing && (
            <>
              <Text style={styles.fieldLabel}>ご家族のLINE連携</Text>
              {form.lineId ? (
                <View style={styles.lineStatusRow}>
                  <Text style={styles.lineLinkedText}>LINE連携済み</Text>
                  <TouchableOpacity
                    style={[
                      styles.unlinkButton,
                      unlinking && styles.disabledButton,
                    ]}
                    onPress={handleUnlink}
                    disabled={unlinking}
                  >
                    <Text style={styles.unlinkButtonText}>連携を解除</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.lineUnlinkedText}>
                  未連携です。利用者一覧の「招待コードを表示」から連携できます。
                </Text>
              )}
            </>
          )}

          <Text style={styles.fieldLabel}>到着前通知のタイミング</Text>
          <SelectableButtonRow
            options={NOTIFY_MINUTES_OPTIONS}
            isSelected={(min) => form.notifyMinutes === min}
            onSelect={(min) =>
              dispatch({ type: "setNotifyMinutes", payload: min })
            }
            style={styles.weekdayRow}
          />

          <Text style={styles.fieldLabel}>通所曜日（タップで選択）</Text>
          <SelectableButtonRow
            options={WEEKDAY_OPTIONS}
            isSelected={(day) => Boolean(form.draft[`${day}`])}
            onSelect={toggleWeekday}
            style={styles.weekdayRow}
          />

          {scheduledDays.map((day) => {
            const entry = form.draft[`${day}`]!;
            return (
              <View key={day} style={styles.dayTimeRow}>
                <Text style={styles.dayLabel}>{WEEKDAY_LABELS[day]}</Text>
                <View style={styles.timeField}>
                  <TimePickerField
                    value={entry.pickup}
                    onChange={(v) => updateTime(day, "pickup", v)}
                    placeholder="お迎え"
                  />
                </View>
                <View style={styles.timeField}>
                  <TimePickerField
                    value={entry.dropoff}
                    onChange={(v) => updateTime(day, "dropoff", v)}
                    placeholder="お送り"
                  />
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditing ? "更新" : "追加"}
              </Text>
            )}
          </TouchableOpacity>
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
  },
  scrollContent: {
    padding: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
    marginRight: -4,
  },
  input: {
    ...inputStyle,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 6,
    fontWeight: "600",
  },
  weekdayRow: {
    marginBottom: 8,
  },
  lineStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lineLinkedText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.success,
  },
  lineUnlinkedText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  unlinkButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  unlinkButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.danger,
  },
  dayTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  dayLabel: {
    width: 28,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textDark,
    textAlign: "center",
  },
  timeField: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
