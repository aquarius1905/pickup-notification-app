-- logs.event_type の CHECK 制約を実際の値に合わせて修正
-- 旧値 'approaching'/'depart'/'arrive' はすべてお迎え前通知として扱い pickup_approaching に統一

-- 1. 先に古い制約を削除してから UPDATE する（制約が生きている間は旧値→新値の書き換えが弾かれるため）
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_event_type_check;

UPDATE logs
SET event_type = 'pickup_approaching'
WHERE event_type NOT IN ('pickup_approaching', 'dropoff_approaching');

ALTER TABLE logs ADD CONSTRAINT logs_event_type_check
  CHECK (event_type IN ('pickup_approaching', 'dropoff_approaching'));
