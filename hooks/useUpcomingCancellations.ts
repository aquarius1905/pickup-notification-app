import { useCallback, useEffect, useState } from "react";

import type { UpcomingCancellation } from "@/lib/api";
import { fetchUpcomingCancellations } from "@/lib/api";
import { showErrorAlert } from "@/lib/error";
import { useGuardedLoad } from "@/hooks/useGuardedLoad";

export function useUpcomingCancellations() {
  const [cancellations, setCancellations] = useState<UpcomingCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const runGuarded = useGuardedLoad();

  const load = useCallback(
    (setLoadingFlag: (v: boolean) => void) =>
      runGuarded(
        () => fetchUpcomingCancellations(),
        setLoadingFlag,
        setCancellations,
        showErrorAlert,
      ),
    [runGuarded],
  );

  useEffect(() => {
    load(setLoading);
  }, [load]);

  const refresh = useCallback(() => load(setRefreshing), [load]);

  return { cancellations, loading, refreshing, refresh } as const;
}
