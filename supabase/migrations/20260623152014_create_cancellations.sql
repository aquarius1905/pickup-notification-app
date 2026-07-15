-- ご家族からのLINEキャンセル連絡を記録するテーブル
CREATE TABLE IF NOT EXISTS cancellations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   UUID        NOT NULL REFERENCES families(id),
  date        DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, date)
);
