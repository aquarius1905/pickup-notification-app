-- sent_atはcreated_atと常に同じ値が入る重複カラムで、
-- アプリ側（並び順・期間フィルタ・表示）はすべてcreated_atのみを参照しているため削除する
ALTER TABLE logs DROP COLUMN IF EXISTS sent_at;
