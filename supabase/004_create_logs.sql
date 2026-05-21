-- 送迎通知のログテーブル。Worker の handleNotify が毎回書き込む。
CREATE TABLE IF NOT EXISTS logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES families(id),
  event_type  TEXT        NOT NULL CHECK (event_type IN ('depart', 'arrive')),
  message     TEXT        NOT NULL,
  success     BOOLEAN     NOT NULL,
  error_message TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
