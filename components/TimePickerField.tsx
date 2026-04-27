import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { formatTimeForDisplay } from "../lib/schedule";

type Props = {
  value: string | null; // "HH:MM" or null
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** 開始時刻（時単位、デフォルト 5） */
  minHour?: number;
  /** 終了時刻（時単位、デフォルト 22。この時間まで含む） */
  maxHour?: number;
  /** 分の刻み（デフォルト 5） */
  step?: number;
};

function range(from: number, to: number, step = 1): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += step) out.push(i);
  return out;
}

export function TimePickerField({
  value,
  onChange,
  placeholder = "選択",
  minHour = 5,
  maxHour = 22,
  step = 5,
}: Props) {
  const [open, setOpen] = useState(false);
  const display = formatTimeForDisplay(value);

  const hours = useMemo(() => range(minHour, maxHour), [minHour, maxHour]);
  const minutes = useMemo(() => range(0, 59, step), [step]);

  // モーダル内で編集中の時・分。開いた時に現在値で初期化
  const [draftHour, setDraftHour] = useState<number | null>(null);
  const [draftMinute, setDraftMinute] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      if (value) {
        const [h, m] = value.split(":").map(Number);
        setDraftHour(h);
        setDraftMinute(m);
      } else {
        setDraftHour(null);
        setDraftMinute(null);
      }
    }
  }, [open, value]);

  const canConfirm = draftHour !== null && draftMinute !== null;

  const confirm = () => {
    if (!canConfirm) return;
    const formatted = `${String(draftHour).padStart(2, "0")}:${String(draftMinute).padStart(2, "0")}`;
    onChange(formatted);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)}>
        <Text style={display ? styles.valueText : styles.placeholderText}>
          {display || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>時刻を選択</Text>

            <View style={styles.columns}>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>時</Text>
                <FlatList
                  data={hours}
                  keyExtractor={(n) => `h-${n}`}
                  initialNumToRender={20}
                  renderItem={({ item }) => {
                    const selected = draftHour === item;
                    return (
                      <TouchableOpacity
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => setDraftHour(item)}
                      >
                        <Text
                          style={[styles.optionText, selected && styles.optionTextSelected]}
                        >
                          {String(item).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>分</Text>
                <FlatList
                  data={minutes}
                  keyExtractor={(n) => `m-${n}`}
                  initialNumToRender={20}
                  renderItem={({ item }) => {
                    const selected = draftMinute === item;
                    return (
                      <TouchableOpacity
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => setDraftMinute(item)}
                      >
                        <Text
                          style={[styles.optionText, selected && styles.optionTextSelected]}
                        >
                          {String(item).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.clearButton} onPress={clear}>
                <Text style={styles.clearText}>未設定</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
                onPress={confirm}
                disabled={!canConfirm}
              >
                <Text style={styles.confirmText}>決定</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  valueText: {
    fontSize: 16,
    color: "#111",
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    paddingTop: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 12,
  },
  columns: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
    height: 280,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  option: {
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  optionSelected: {
    backgroundColor: "#eff6ff",
  },
  optionText: {
    fontSize: 18,
    color: "#333",
  },
  optionTextSelected: {
    color: "#2563eb",
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  clearText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "600",
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "700",
  },
});
