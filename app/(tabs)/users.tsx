import React, { useCallback, useEffect, useState } from "react";
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
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type Schedule,
  type ServiceUser,
  type Weekday,
  createServiceUser,
  deleteServiceUser,
  fetchServiceUsers,
  updateServiceUser,
} from "../../lib/api";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  formatSchedule,
  formatTimeForDisplay,
} from "../../lib/schedule";
import { TimePickerField } from "../../components/TimePickerField";

/** API由来の "HH:MM:SS" を "HH:MM" に揃えた Schedule を返す（編集UIでの表示用） */
function normalizeScheduleForEdit(schedule: Schedule): Schedule {
  const result: Schedule = {};
  for (const day of WEEKDAYS) {
    const entry = schedule[`${day}`];
    if (!entry) continue;
    result[`${day}`] = {
      pickup: entry.pickup ? formatTimeForDisplay(entry.pickup) : null,
      dropoff: entry.dropoff ? formatTimeForDisplay(entry.dropoff) : null,
    };
  }
  return result;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [lineId, setLineId] = useState("");
  const [draft, setDraft] = useState<Schedule>({});
  const [editingUser, setEditingUser] = useState<ServiceUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (setLoadingFlag: (v: boolean) => void) => {
      try {
        setLoadingFlag(true);
        const data = await fetchServiceUsers();
        setUsers(data);
      } catch {
        Alert.alert("エラー", "利用者一覧の取得に失敗しました");
      } finally {
        setLoadingFlag(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(setLoading);
  }, [load]);

  const handleRefresh = useCallback(() => load(setRefreshing), [load]);

  const resetForm = () => {
    setName("");
    setLineId("");
    setDraft({});
    setEditingUser(null);
  };

  const startEdit = (user: ServiceUser) => {
    setEditingUser(user);
    setName(user.patient_name);
    setLineId(user.line_user_id);
    setDraft(normalizeScheduleForEdit(user.schedule));
  };

  const toggleWeekday = (day: Weekday) => {
    setDraft((prev) => {
      const key = `${day}` as const;
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { pickup: null, dropoff: null } };
    });
  };

  const updateTime = (day: Weekday, field: "pickup" | "dropoff", value: string | null) => {
    setDraft((prev) => {
      const key = `${day}` as const;
      const entry = prev[key] ?? { pickup: null, dropoff: null };
      return { ...prev, [key]: { ...entry, [field]: value } };
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("エラー", "利用者名を入力してください");
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        await updateServiceUser(editingUser.id, name.trim(), lineId.trim(), draft);
      } else {
        await createServiceUser(name.trim(), lineId.trim(), draft);
      }
      resetForm();
      await load(setLoading);
    } catch (error) {
      Alert.alert("エラー", error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (user: ServiceUser) => {
    Alert.alert(
      "削除確認",
      `${user.patient_name}さんを削除しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteServiceUser(user.id);
              if (editingUser?.id === user.id) resetForm();
              await load(setLoading);
            } catch (error) {
              Alert.alert("エラー", error instanceof Error ? error.message : "削除に失敗しました");
            }
          },
        },
      ]
    );
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
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="LINE ID（任意）"
                value={lineId}
                onChangeText={setLineId}
              />

              <Text style={styles.fieldLabel}>通所曜日（タップで選択）</Text>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((day) => {
                  const selected = Boolean(draft[`${day}`]);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.weekdayButton, selected && styles.weekdayButtonSelected]}
                      onPress={() => toggleWeekday(day)}
                    >
                      <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>
                        {WEEKDAY_LABELS[day]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {WEEKDAYS.filter((day) => draft[`${day}`]).map((day) => {
                const entry = draft[`${day}`]!;
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
                  style={[styles.submitButton, submitting && styles.disabledButton]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {editingUser ? "更新" : "追加"}
                    </Text>
                  )}
                </TouchableOpacity>
                {editingUser && (
                  <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {loading && <ActivityIndicator size="large" style={styles.loader} />}
          </View>
        }
        renderItem={({ item }) => {
          const scheduleText = formatSchedule(item);
          return (
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.patient_name}</Text>
                {scheduleText ? (
                  <Text style={styles.scheduleText}>{scheduleText}</Text>
                ) : null}
                {item.line_user_id ? (
                  <Text style={styles.linkedBadge}>LINE連携済み</Text>
                ) : (
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(item.invite_code);
                      Alert.alert("コピーしました", `招待コード: ${item.invite_code}`);
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
              利用者が登録されていません。{"\n"}上のフォームから追加してください。
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
    backgroundColor: "#fff",
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
    color: "#666",
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#666",
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
    borderColor: "#ddd",
    alignItems: "center",
  },
  weekdayButtonSelected: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  weekdayText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  weekdayTextSelected: {
    color: "#fff",
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
    color: "#333",
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
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
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
    borderColor: "#ddd",
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
    color: "#444",
    marginTop: 4,
    lineHeight: 18,
  },
  linkedBadge: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
    marginTop: 4,
  },
  inviteCode: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    fontFamily: "monospace",
  },
  userActions: {
    flexDirection: "row",
    gap: 16,
  },
  editText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    marginTop: 32,
    lineHeight: 22,
  },
});
