import type { Schedule, Weekday } from "@/lib/api";
import { createServiceUser, updateServiceUser } from "@/lib/api";
import {
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_LABELS,
} from "@/lib/schedule";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { showErrorAlert } from "@/lib/error";
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

  useEffect(() => {
    if (!params.id) return;
    const schedule: Schedule = params.schedule
      ? JSON.parse(params.schedule)
      : {};
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
        await updateServiceUser(
          form.editingUser.id,
          form.name.trim(),
          form.lineId.trim(),
          form.draft,
          form.notifyMinutes,
        );
      } else {
        await createServiceUser(
          form.name.trim(),
          form.lineId.trim(),
          form.draft,
          form.notifyMinutes,
        );
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
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.closeText}>閉じる</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="利用者名"
            value={form.name}
            onChangeText={(v) => dispatch({ type: "setName", payload: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="LINE ID（任意）"
            value={form.lineId}
            onChangeText={(v) => dispatch({ type: "setLineId", payload: v })}
          />

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
  closeText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600",
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
