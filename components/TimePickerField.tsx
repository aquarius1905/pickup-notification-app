import { formatTime, formatTimeForDisplay, padZero } from "@/lib/schedule";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { colors } from "@/lib/theme";

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  minHour?: number;
  maxHour?: number;
  step?: number;
};

const ITEM_HEIGHT = 50;

function range(from: number, to: number, step = 1): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += step) out.push(i);
  return out;
}

type PickerColumnProps = {
  label: string;
  data: number[];
  selected: number | null;
  onSelect: (n: number) => void;
  initialNumToRender: number;
};

function PickerColumn({ label, data, selected, onSelect, initialNumToRender }: PickerColumnProps) {
  const listRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (selected === null) return;
    const index = data.indexOf(selected);
    if (index < 0) return;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, data]);

  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(n) => String(n)}
        initialNumToRender={initialNumToRender}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        extraData={selected}
        renderItem={({ item }) => {
          const isSelected = selected === item;
          return (
            <TouchableOpacity
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onSelect(item)}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {padZero(item)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

export function TimePickerField({
  value,
  onChange,
  placeholder = "選択",
  minHour = 5,
  maxHour = 22,
  step = 5,
}: Props) {
  const windowDimensions = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const display = formatTimeForDisplay(value);

  const initialNumToRender = useMemo(() => {
    const sheetMaxHeight = windowDimensions.height * 0.7;
    return Math.max(Math.ceil(sheetMaxHeight / ITEM_HEIGHT), 10);
  }, [windowDimensions.height]);

  const hours = useMemo(() => range(minHour, maxHour), [minHour, maxHour]);
  const minutes = useMemo(() => range(0, 59, step), [step]);

  const [draftHour, setDraftHour] = useState<number | null>(null);
  const [draftMinute, setDraftMinute] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (value) {
      const [h, m] = value.split(":").map(Number);
      setDraftHour(h);
      setDraftMinute(m);
    } else {
      setDraftHour(null);
      setDraftMinute(null);
    }
  }, [open, value]);

  const canConfirm = draftHour !== null && draftMinute !== null;

  const confirm = () => {
    if (!canConfirm) return;
    const formatted = formatTime(draftHour, draftMinute);
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
              <PickerColumn
                label="時"
                data={hours}
                selected={draftHour}
                onSelect={setDraftHour}
                initialNumToRender={initialNumToRender}
              />
              <PickerColumn
                label="分"
                data={minutes}
                selected={draftMinute}
                onSelect={setDraftMinute}
                initialNumToRender={initialNumToRender}
              />
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.clearButton} onPress={clear}>
                <Text style={styles.clearText}>未設定</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !canConfirm && styles.confirmButtonDisabled,
                ]}
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
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.white,
  },
  valueText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
    paddingTop: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  columns: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    height: 280,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 8,
    backgroundColor: colors.bgLight,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  option: {
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.bgMuted,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: 18,
    color: colors.textDark,
  },
  optionTextSelected: {
    color: colors.primary,
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
    borderColor: colors.border,
    alignItems: "center",
  },
  clearText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 15,
    color: colors.white,
    fontWeight: "700",
  },
});
