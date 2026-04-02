import { StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  name: string;
  selected: boolean;
  onSelect: (name: string) => void;
};

export function ServiceUserItem({ name, selected, onSelect }: Props) {
  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.selectedItem]}
      onPress={() => onSelect(name)}
    >
      <Text style={[styles.name, selected && styles.selectedName]}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedItem: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  selectedName: {
    color: "#2563eb",
  },
});
