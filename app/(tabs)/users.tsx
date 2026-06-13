import type { ServiceUser, Weekday } from "@/lib/api";
import {
  createServiceUser,
  deleteServiceUser,
  fetchServiceUsers,
  updateServiceUser,
} from "@/lib/api";
import {
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_LABELS,
  formatSchedule,
} from "@/lib/schedule";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { TimePickerField } from "@/components/TimePickerField";
import { withAsyncLoading } from "@/lib/asyncLoad";
import { copyToClipboard } from "@/lib/clipboard";
import { showErrorAlert } from "@/lib/error";
import { formReducer } from "@/lib/scheduleFormReducer";
import { colors, inputStyle } from "@/lib/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UsersScreen() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, dispatch] = useReducer(formReducer, {
    name: "",
    lineId: "",
    notifyMinutes: 10,
    draft: {},
    editingUser: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (setLoadingFlag: (v: boolean) => void) => {
    const data = await withAsyncLoading(
      () => fetchServiceUsers(),
      setLoadingFlag,
      showErrorAlert,
    );
    if (data) setUsers(data);
  }, []);

  const loadUsers = useCallback(() => load(setLoading), [load]);
  const handleRefresh = useCallback(() => load(setRefreshing), [load]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = useCallback(() => {
    dispatch({ type: "reset" });
  }, []);

  const startEdit = useCallback((user: ServiceUser) => {
    dispatch({ type: "startEdit", payload: user });
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

  const handleSubmit = useCallback(async () => {
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
      resetForm();
      await loadUsers();
    } catch (error) {
      showErrorAlert(error);
    } finally {
      setSubmitting(false);
    }
  }, [form, resetForm, loadUsers]);

  const handleDelete = (user: ServiceUser) => {
    Alert.alert("削除確認", `${user.user_name}さんを削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteServiceUser(user.id);
            if (form.editingUser?.id === user.id) resetForm();
            await loadUsers();
          } catch (error) {
            showErrorAlert(error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View>
              <Text style={styles.title}>利用者管理</Text>
              <Text style={styles.countText}>登録利用者 {users.length}名</Text>

              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="利用者名"
                  value={form.name}
                  onChangeText={(v) =>
                    dispatch({ type: "setName", payload: v })
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="LINE ID（任意）"
                  value={form.lineId}
                  onChangeText={(v) =>
                    dispatch({ type: "setLineId", payload: v })
                  }
                />

                <Text style={styles.fieldLabel}>到着前通知のタイミング</Text>
                <View style={styles.weekdayRow}>
                  {([5, 10] as const).map((min) => {
                    const selected = form.notifyMinutes === min;
                    return (
                      <TouchableOpacity
                        key={min}
                        style={[
                          styles.weekdayButton,
                          selected && styles.weekdayButtonSelected,
                        ]}
                        onPress={() =>
                          dispatch({ type: "setNotifyMinutes", payload: min })
                        }
                      >
                        <Text
                          style={[
                            styles.weekdayText,
                            selected && styles.weekdayTextSelected,
                          ]}
                        >
                          {min}分前
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>通所曜日（タップで選択）</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAY_DISPLAY_ORDER.map((day) => {
                    const selected = Boolean(form.draft[`${day}`]);
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.weekdayButton,
                          selected && styles.weekdayButtonSelected,
                        ]}
                        onPress={() => toggleWeekday(day)}
                      >
                        <Text
                          style={[
                            styles.weekdayText,
                            selected && styles.weekdayTextSelected,
                          ]}
                        >
                          {WEEKDAY_LABELS[day]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

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

                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      submitting && styles.disabledButton,
                    ]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {form.editingUser ? "更新" : "追加"}
                      </Text>
                    )}
                  </TouchableOpacity>
                  {form.editingUser && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={resetForm}
                    >
                      <Text style={styles.cancelButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {loading && (
                <ActivityIndicator size="large" style={styles.loader} />
              )}
            </View>
          }
          renderItem={({ item }) => {
            const scheduleText = formatSchedule(item);
            return (
              <View style={styles.userRow}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.user_name}</Text>
                  {scheduleText ? (
                    <Text style={styles.scheduleText}>{scheduleText}</Text>
                  ) : null}
                  {item.line_user_id ? (
                    <Text style={styles.linkedBadge}>LINE連携済み</Text>
                  ) : (
                    <TouchableOpacity
                      onPress={async () => {
                        await copyToClipboard(
                          item.invite_code,
                          `招待コード: ${item.invite_code}`,
                        );
                      }}
                    >
                      <Text style={styles.inviteCode}>
                        招待コード: {item.invite_code}（タップでコピー）
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity onPress={() => startEdit(item)}>
                    <Text style={styles.editText}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Text style={styles.deleteText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            loading ? null : (
              <Text style={styles.emptyText}>
                利用者が登録されていません。{"\n"}
                上のフォームから追加してください。
              </Text>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  countText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
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
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  weekdayButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  weekdayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekdayText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  weekdayTextSelected: {
    color: colors.white,
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
  formButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  submitButton: {
    flex: 1,
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
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  loader: {
    marginTop: 32,
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
  },
  scheduleText: {
    fontSize: 13,
    color: colors.textMid,
    marginTop: 4,
    lineHeight: 18,
  },
  linkedBadge: {
    fontSize: 13,
    color: colors.success,
    fontWeight: "600",
    marginTop: 4,
  },
  inviteCode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: "monospace",
  },
  userActions: {
    flexDirection: "row",
    gap: 16,
  },
  editText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  deleteText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 32,
    lineHeight: 22,
  },
});
