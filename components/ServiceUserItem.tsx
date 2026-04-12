import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  name: string;
  selected: boolean;
  onSelect: (name: string) => void;
  notifiedTypes?: Set<"depart" | "arrive">;
};

export function ServiceUserItem({ name, selected, onSelect, notifiedTypes }: Props) {
  const departed = notifiedTypes?.has("depart");
  const arrived = notifiedTypes?.has("arrive");

  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.selectedItem]}
      onPress={() => onSelect(name)}
    >
      <Text style={[styles.name, selected && styles.selectedName]}>{name}</Text>
      {(departed || arrived) && (
        <View style={styles.badgeRow}>
          {departed && <Text style={styles.departBadge}>出発通知済み</Text>}
          {arrived && <Text style={styles.arriveBadge}>到着通知済み</Text>}
        </View>
      )}
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
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  departBadge: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
  },
  arriveBadge: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
  },
});
