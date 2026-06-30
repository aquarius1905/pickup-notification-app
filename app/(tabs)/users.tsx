import type { ServiceUser } from "@/lib/api";
import { deleteServiceUser, fetchServiceUsers } from "@/lib/api";
import { formatSchedule } from "@/lib/schedule";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useGuardedLoad } from "@/hooks/useGuardedLoad";
import { copyToClipboard } from "@/lib/clipboard";
import { showErrorAlert } from "@/lib/error";
import { colors, inputStyle } from "@/lib/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<ServiceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => u.user_name.toLowerCase().includes(query));
  }, [users, searchText]);

  const runGuarded = useGuardedLoad();

  const load = useCallback(
    (setLoadingFlag: (v: boolean) => void) =>
      runGuarded(() => fetchServiceUsers(), setLoadingFlag, setUsers, showErrorAlert),
    [runGuarded],
  );

  const loadUsers = useCallback(() => load(setLoading), [load]);
  const handleRefresh = useCallback(() => load(setRefreshing), [load]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

  const openCreateForm = () => {
    router.push("/user-form");
  };

  const openEditForm = (user: ServiceUser) => {
    router.push({
      pathname: "/user-form",
      params: {
        id: user.id,
        name: user.user_name,
        lineId: user.line_user_id,
        notifyMinutes: String(user.notify_minutes),
        schedule: JSON.stringify(user.schedule),
      },
    });
  };

  const handleDelete = (user: ServiceUser) => {
    Alert.alert("削除確認", `${user.user_name}さんを削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteServiceUser(user.id);
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
      <View style={styles.body}>
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>利用者管理</Text>
                  <Text style={styles.countText}>
                    登録利用者 {users.length}名
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={openCreateForm}
                >
                  <Text style={styles.addButtonText}>+ 追加</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="利用者名で検索"
                value={searchText}
                onChangeText={setSearchText}
              />

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
                  <TouchableOpacity onPress={() => openEditForm(item)}>
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
                {searchText
                  ? "検索条件に一致する利用者がいません。"
                  : `利用者が登録されていません。${"\n"}右上の「+ 追加」から登録してください。`}
              </Text>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  body: {
    flex: 1,
    padding: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  countText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  searchInput: {
    ...inputStyle,
    marginBottom: 16,
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
