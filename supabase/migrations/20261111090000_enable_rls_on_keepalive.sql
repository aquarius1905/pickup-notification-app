-- keepalive テーブルは CREATE TABLE で作ったため RLS が無効のままで、
-- Supabase の Security Advisor で「誰でも読み書きできる」と警告された。
-- RLS を有効にし、ポリシーは作らない（anon キーからは一切アクセスできなくする）。
-- Worker は RLS の対象外となる service_role キーで接続しているため、Cron からの書き込みは引き続き動く。
ALTER TABLE keepalive ENABLE ROW LEVEL SECURITY;
