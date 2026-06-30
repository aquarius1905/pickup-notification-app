import { useCallback, useEffect, useState } from "react";

import type { LogsEventTypeFilter, LogsPeriod, NotificationLog } from "@/lib/api";
import { fetchNotificationLogs } from "@/lib/api";
import { showErrorAlert } from "@/lib/error";
import { useGuardedLoad } from "@/hooks/useGuardedLoad";

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

  const runGuarded = useGuardedLoad();

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchText.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadFirstPage = useCallback(
    (setLoadingFlag: (v: boolean) => void) =>
      runGuarded(
        () =>
          fetchNotificationLogs({
            search: debouncedSearch || undefined,
            period,
            eventType: eventTypeFilter,
            offset: 0,
          }),
        setLoadingFlag,
        (page) => {
          setLogs(page.logs);
          setHasMore(page.hasMore);
        },
        showErrorAlert,
      ),
    [runGuarded, debouncedSearch, period, eventTypeFilter],
  );

  useEffect(() => {
    loadFirstPage(setLoading);
  }, [loadFirstPage]);

  const refresh = useCallback(
    () => loadFirstPage(setRefreshing),
    [loadFirstPage],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading || refreshing) return;
    return runGuarded(
      () =>
        fetchNotificationLogs({
          search: debouncedSearch || undefined,
          period,
          eventType: eventTypeFilter,
          offset: logs.length,
        }),
      setLoadingMore,
      (page) => {
        setLogs((prev) => [...prev, ...page.logs]);
        setHasMore(page.hasMore);
      },
      showErrorAlert,
    );
  }, [
    runGuarded,
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
