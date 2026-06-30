import { useCallback, useRef } from "react";

/**
 * 連続実行時に古いリクエストの結果が新しいリクエストの結果を上書きしないようにする
 * 世代カウンタ付きの非同期ロード処理。
 */
export function useGuardedLoad() {
  const requestIdRef = useRef(0);

  const run = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      setLoadingFlag: (v: boolean) => void,
      onSuccess: (data: T) => void,
      onError: (error: unknown) => void,
    ): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setLoadingFlag(true);
      try {
        const data = await fn();
        if (requestId !== requestIdRef.current) return;
        onSuccess(data);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        onError(error);
      } finally {
        if (requestId === requestIdRef.current) setLoadingFlag(false);
      }
    },
    [],
  );

  return run;
}
