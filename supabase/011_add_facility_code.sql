-- 職員のスマホ初回設定を簡単にするため、64文字のAPIキーの代わりに
-- 人が読み書きできる短いコードから対応するAPIキーを引けるようにする
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS facility_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(5), 'hex');

-- 短いコードは64文字のAPIキーより総当たりされやすいため、
-- 施設コードからのAPIキー取得は接続元IPごとにレート制限する
CREATE TABLE IF NOT EXISTS facility_code_lookup_attempts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS facility_code_lookup_attempts_ip_idx
  ON facility_code_lookup_attempts (ip, created_at);
