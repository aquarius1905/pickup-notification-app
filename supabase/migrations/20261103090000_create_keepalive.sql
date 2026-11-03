-- Supabase無料プランの自動停止を防ぐための書き込み先。
-- Workerの定期実行（worker/src/index.ts の scheduled）が数時間おきに last_ping_at を更新する。
-- 1日1回の読み取りだけでは「十分なアクセス」と判定されず停止予告が届いたため、書き込みも行う。
-- 行は常に1行だけ（id = 1）。
CREATE TABLE IF NOT EXISTS keepalive (
  id           SMALLINT    PRIMARY KEY CHECK (id = 1),
  last_ping_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO keepalive (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
