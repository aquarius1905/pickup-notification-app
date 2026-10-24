// 予定確認タブでの今日分のキャンセル登録・取り消しを、別のタブ（送迎通知など）に即時に伝える。
// タブごとに利用者一覧のstateを別々に持っているため、フォーカス時の再取得を待たずに
// 「本日キャンセル」バッジを切り替えられるようにする。

export type TodayCancellationChange = {
  userId: string;
  canceledToday: boolean;
};

type Listener = (change: TodayCancellationChange) => void;

const listeners = new Set<Listener>();

export function subscribeTodayCancellation(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTodayCancellation(change: TodayCancellationChange): void {
  listeners.forEach((listener) => listener(change));
}
