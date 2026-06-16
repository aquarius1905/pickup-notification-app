import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { NotifyPhase } from "@/hooks/useServiceUsers";
import { colors } from "@/lib/theme";
import { memo } from "react";

type Props = {
  id: string;
  name: string;
  selected: boolean;
  onSelect: (id: string) => void;
  notifyPhase?: NotifyPhase;
  notifyMinutes?: 5 | 10;
  schedule?: string;
  lineLinked: boolean;
};

function getBadgeLabel(phase: NotifyPhase): string {
  switch (phase) {
    case "pickup_approaching":
      return `お迎え連絡通知済み`;
    case "pickup_completed":
      return "お迎え済み";
    case "dropoff_approaching":
      return `お送り連絡通知済み`;
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
  id,
  name,
  selected,
  onSelect,
  notifyPhase,
  notifyMinutes,
  schedule,
  lineLinked,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.selectedItem]}
      onPress={() => onSelect(id)}
    >
      <View style={styles.nameRow}>
        <Text style={[styles.name, selected && styles.selectedName]}>{name}</Text>
        <View style={styles.badgeRow}>
          {!lineLinked && (
            <View style={[styles.minutesBadge, styles.unlinkedBadge]}>
              <Text style={styles.minutesBadgeText}>LINE未連携</Text>
            </View>
          )}
          {notifyMinutes && (
            <View style={styles.minutesBadge}>
              <Text style={styles.minutesBadgeText}>{notifyMinutes}分前通知</Text>
            </View>
          )}
        </View>
      </View>
      {schedule ? <Text style={styles.schedule}>{schedule}</Text> : null}
      {notifyPhase && (
        <Text style={[styles.badge, { color: BADGE_COLOR[notifyPhase] }]}>
          {getBadgeLabel(notifyPhase)}
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
  schedule: {
    fontSize: 15,
    color: colors.textMid,
    marginTop: 4,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  minutesBadge: {
    backgroundColor: colors.textSecondary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unlinkedBadge: {
    backgroundColor: colors.warning,
  },
  minutesBadgeText: {
    fontSize: 13,
    color: colors.white,
    fontWeight: "600",
  },
  badge: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },
});
