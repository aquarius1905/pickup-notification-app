export async function withAsyncLoading<T>(
  fn: () => Promise<T>,
  setLoading: (v: boolean) => void,
  onError: (error: unknown) => void,
): Promise<T | null> {
  try {
    setLoading(true);
    return await fn();
  } catch (error) {
    onError(error);
    return null;
  } finally {
    setLoading(false);
  }
}
