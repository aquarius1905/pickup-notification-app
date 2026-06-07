import { memo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import type { NotifyPhase } from "@/hooks/useServiceUsers";
import { colors } from "@/lib/theme";

type Props = {
  name: string;
  selected: boolean;
  onSelect: (name: string) => void;
  notifyPhase?: NotifyPhase;
  notifyMinutes?: 5 | 10;
  subtitle?: string;
};

function getBadgeLabel(phase: NotifyPhase, minutes?: 5 | 10): string {
  switch (phase) {
    case "pickup_approaching":
      return `お迎え あと${minutes ?? "?"}分通知済み`;
    case "pickup_completed":
      return "お迎え済み";
    case "dropoff_approaching":
      return `お送り あと${minutes ?? "?"}分通知済み`;
    case "dropoff_completed":
      return "お送り済み";
  }
}

const BADGE_COLOR: Record<NotifyPhase, string> = {
  pickup_approaching: colors.primary,
  pickup_completed: colors.success,
  dropoff_approaching: colors.primary,
  dropoff_completed: colors.success,
};

function ServiceUserItemBase({
  name,
  selected,
  onSelect,
  notifyPhase,
  notifyMinutes,
  subtitle,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.selectedItem]}
      onPress={() => onSelect(name)}
    >
      <Text style={[styles.name, selected && styles.selectedName]}>{name}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {notifyMinutes && (
        <Text style={styles.notifyMinutes}>{notifyMinutes}分前通知</Text>
      )}
      {notifyPhase && (
        <Text style={[styles.badge, { color: BADGE_COLOR[notifyPhase] }]}>
          {getBadgeLabel(notifyPhase, notifyMinutes)}
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
  notifyMinutes: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
});
