-- 利用者ごとの通所曜日と送迎時刻を JSONB 形式で管理する schedule カラムを追加。
--
-- schedule の形式:
-- {
--   "1": { "pickup": "09:00", "dropoff": "16:00" },  -- 月曜
--   "3": { "pickup": "09:30", "dropoff": "17:00" }   -- 水曜
-- }
-- キーは曜日番号（0=日〜6=土）。存在するキー = 通所日。
-- pickup / dropoff は未設定の場合 null。

-- 開発中に別形式（weekdays配列 + 個別カラム）を試していた環境向けのクリーンアップ。
-- 新規環境では何もしない（IF EXISTS なので安全）。
ALTER TABLE families
  DROP CONSTRAINT IF EXISTS weekdays_range_check;

ALTER TABLE families
  DROP COLUMN IF EXISTS weekdays,
  DROP COLUMN IF EXISTS pickup_time,
  DROP COLUMN IF EXISTS dropoff_time;

-- schedule カラム追加
ALTER TABLE families
  ADD COLUMN IF NOT EXISTS schedule JSONB NOT NULL DEFAULT '{}'::jsonb;

-- schedule がオブジェクト形式であることを保証
ALTER TABLE families
  ADD CONSTRAINT schedule_is_object_check
  CHECK (jsonb_typeof(schedule) = 'object');
