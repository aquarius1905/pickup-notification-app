-- 利用者ごとの通所曜日と送迎時刻を管理するカラムを追加
-- weekdays: 通所する曜日の配列。0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
-- pickup_time: お迎え時刻（自宅→施設）
-- dropoff_time: お送り時刻（施設→自宅）
ALTER TABLE families
  ADD COLUMN IF NOT EXISTS weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pickup_time TIME,
  ADD COLUMN IF NOT EXISTS dropoff_time TIME;

-- weekdaysの値が0〜6の範囲であることを保証
ALTER TABLE families
  ADD CONSTRAINT weekdays_range_check
  CHECK (weekdays <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]);
