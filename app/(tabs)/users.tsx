import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type ServiceUser,
  createServiceUser,
  deleteServiceUser,
  fetchServiceUsers,
  updateServiceUser,
} from "../../lib/api";

export default function UsersScreen() {
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [lineId, setLineId] = useState("");
  const [editingUser, setEditingUser] = useState<ServiceUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchServiceUsers();
      setUsers(data);
    } catch {
      Alert.alert("エラー", "利用者一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setLineId("");
    setEditingUser(null);
  };

  const startEdit = (user: ServiceUser) => {
    setEditingUser(user);
    setName(user.patient_name);
    setLineId(user.line_user_id);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("エラー", "利用者名を入力してください");
      return;
    }
    try {
      setSubmitting(true);
      if (editingUser) {
        await updateServiceUser(editingUser.id, name.trim(), lineId.trim());
      } else {
        await createServiceUser(name.trim(), lineId.trim());
      }
      resetForm();
      await load();
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
              await load();
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
      <Text style={styles.title}>利用者管理</Text>

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

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.patient_name}</Text>
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
          )}
          style={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
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
  formButtons: {
    flexDirection: "row",
    gap: 8,
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
  list: {
    flex: 1,
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
  linkedBadge: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
    marginTop: 2,
  },
  inviteCode: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
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
});
