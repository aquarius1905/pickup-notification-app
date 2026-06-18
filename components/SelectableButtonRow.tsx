import type { ViewStyle } from "react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/lib/theme";

type Props<T extends string | number> = {
  options: readonly { value: T; label: string }[];
  isSelected: (value: T) => boolean;
  onSelect: (value: T) => void;
  style?: ViewStyle;
};

export function SelectableButtonRow<T extends string | number>({
  options,
  isSelected: getIsSelected,
  onSelect,
  style,
}: Props<T>) {
  return (
    <View style={[styles.row, style]}>
      {options.map((option) => {
        const isSelected = getIsSelected(option.value);
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.button, isSelected && styles.buttonSelected]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.text, isSelected && styles.textSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  buttonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  textSelected: {
    color: colors.white,
  },
});
