import { useCallback, useEffect, useRef, useState } from "react";

import type { UpcomingCancellation } from "@/lib/api";
import { fetchUpcomingCancellations } from "@/lib/api";
import { showErrorAlert } from "@/lib/error";

export function useUpcomingCancellations() {
  const [cancellations, setCancellations] = useState<UpcomingCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 連続更新時に古いリクエストの結果が新しいリクエストの結果を上書きしないようにするための世代カウンタ
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (setLoadingFlag: (v: boolean) => void) => {
      const requestId = ++requestIdRef.current;
      setLoadingFlag(true);
      try {
        const data = await fetchUpcomingCancellations();
        if (requestId !== requestIdRef.current) return;
        setCancellations(data);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        showErrorAlert(error);
      } finally {
        if (requestId === requestIdRef.current) setLoadingFlag(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(setLoading);
  }, [load]);

  const refresh = useCallback(() => load(setRefreshing), [load]);

  return { cancellations, loading, refreshing, refresh } as const;
}
