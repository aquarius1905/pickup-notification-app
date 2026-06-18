import { useCallback, useEffect, useRef, useState } from "react";

import type { LogsEventTypeFilter, LogsPeriod, NotificationLog } from "@/lib/api";
import { fetchNotificationLogs } from "@/lib/api";
import { showErrorAlert } from "@/lib/error";

const SEARCH_DEBOUNCE_MS = 400;

export function useNotificationLogs() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [period, setPeriod] = useState<LogsPeriod>("all");
  const [eventTypeFilter, setEventTypeFilter] =
    useState<LogsEventTypeFilter>("all");

  // フィルタ変更や連続実行で古いリクエストの結果を無視するための世代カウンタ
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchText.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadFirstPage = useCallback(
    async (setLoadingFlag: (v: boolean) => void) => {
      const requestId = ++requestIdRef.current;
      setLoadingFlag(true);
      try {
        const page = await fetchNotificationLogs({
          search: debouncedSearch || undefined,
          period,
          eventType: eventTypeFilter,
          offset: 0,
        });
        if (requestId !== requestIdRef.current) return;
        setLogs(page.logs);
        setHasMore(page.hasMore);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        showErrorAlert(error);
      } finally {
        if (requestId === requestIdRef.current) setLoadingFlag(false);
      }
    },
    [debouncedSearch, period, eventTypeFilter],
  );

  useEffect(() => {
    loadFirstPage(setLoading);
  }, [loadFirstPage]);

  const refresh = useCallback(
    () => loadFirstPage(setRefreshing),
    [loadFirstPage],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading || refreshing) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      const page = await fetchNotificationLogs({
        search: debouncedSearch || undefined,
        period,
        eventType: eventTypeFilter,
        offset: logs.length,
      });
      if (requestId !== requestIdRef.current) return;
      setLogs((prev) => [...prev, ...page.logs]);
      setHasMore(page.hasMore);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      showErrorAlert(error);
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }, [
    loadingMore,
    hasMore,
    loading,
    refreshing,
    debouncedSearch,
    period,
    eventTypeFilter,
    logs.length,
  ]);

  return {
    logs,
    loading,
    refreshing,
    loadingMore,
    searchText,
    setSearchText,
    period,
    setPeriod,
    eventTypeFilter,
    setEventTypeFilter,
    refresh,
    loadMore,
  } as const;
}
