-- キャンセルの登録元を記録するカラムを追加する。
-- 'family'  : ご家族がLINEのキャンセルフォームから送信
-- 'facility': 電話連絡などを受けて施設の職員がアプリから登録
-- 既存の行はすべてLINEフォーム経由のため 'family' とする。
ALTER TABLE cancellations
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'family';

ALTER TABLE cancellations DROP CONSTRAINT IF EXISTS cancellations_source_check;

ALTER TABLE cancellations
  ADD CONSTRAINT cancellations_source_check
  CHECK (source IN ('family', 'facility'));
