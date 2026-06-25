import { useCallback, useEffect, useState } from "react";

import type { UpcomingCancellation } from "@/lib/api";
import { fetchUpcomingCancellations } from "@/lib/api";
import { showErrorAlert } from "@/lib/error";
import { withAsyncLoading } from "@/lib/asyncLoad";

export function useUpcomingCancellations() {
  const [cancellations, setCancellations] = useState<UpcomingCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (setLoadingFlag: (v: boolean) => void) => {
      const data = await withAsyncLoading(
        () => fetchUpcomingCancellations(),
        setLoadingFlag,
        showErrorAlert,
      );
      if (data) setCancellations(data);
    },
    [],
  );

  useEffect(() => {
    load(setLoading);
  }, [load]);

  const refresh = useCallback(() => load(setRefreshing), [load]);

  return { cancellations, loading, refreshing, refresh } as const;
}
