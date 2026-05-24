export function getErrorMessage(error: unknown): string {
  if (
    error instanceof TypeError &&
    error.message === "Network request failed"
  ) {
    return "ネットワークに接続できません。電波状況を確認してください。";
  }
  if (error instanceof Error) {
    if (error.message.includes("401")) {
      return "認証に失敗しました。アプリを再起動してください。";
    }
    if (error.message.includes("500")) {
      return "サーバーエラーが発生しました。時間をおいて再試行してください。";
    }
    return error.message;
  }
  return "予期しないエラーが発生しました。";
}
