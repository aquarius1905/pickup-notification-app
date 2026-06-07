import { memo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import type { NotifyPhase } from "@/hooks/useServiceUsers";
import { colors } from "@/lib/theme";

type Props = {
  name: string;
  selected: boolean;
  onSelect: (name: string) => void;
  notifyPhase?: NotifyPhase;
  subtitle?: string;
};

const PHASE_LABEL: Record<NotifyPhase, string> = {
  pickup_departed: "お迎え出発中",
  pickup_completed: "お迎え済み",
  dropoff_departed: "お送り出発中",
  dropoff_completed: "お送り済み",
};

const PHASE_COLOR: Record<NotifyPhase, string> = {
  pickup_departed: colors.primary,
  pickup_completed: colors.success,
  dropoff_departed: colors.primary,
  dropoff_completed: colors.success,
};

function ServiceUserItemBase({
  name,
  selected,
  onSelect,
  notifyPhase,
  subtitle,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.selectedItem]}
      onPress={() => onSelect(name)}
    >
      <Text style={[styles.name, selected && styles.selectedName]}>{name}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {notifyPhase && (
        <Text style={[styles.badge, { color: PHASE_COLOR[notifyPhase] }]}>
          {PHASE_LABEL[notifyPhase]}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export const ServiceUserItem = memo(ServiceUserItemBase);

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedItem: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  selectedName: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMid,
    marginTop: 4,
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
});
