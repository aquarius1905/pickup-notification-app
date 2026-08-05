-- familiesテーブルは本来のマイグレーション追跡が始まる前に手動で作成されており、
-- 以降の20260406093717以降のマイグレーション（ALTER TABLE families ...）はその存在を前提にしている。
-- このマイグレーションが存在しないと、ローカル等でsupabase startした際に
-- 「relation "families" does not exist」で失敗し、本番と同じスキーマを再現できない。
--
-- 本番での実際の作成日時・手順は記録が残っていないため、後続マイグレーションが
-- 前提とする最小限の形（patient_nameカラムは20260530144142でuser_nameへリネームされる）で
-- 遡って作成する。notify_minutesカラムも同様に、どのマイグレーションにも属さず
-- 手動追加されたと見られるため、ここで併せて補う。
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  line_user_id TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_minutes SMALLINT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supabase CLIのローカル環境では、マイグレーションで作成したテーブルに対して
-- anon/authenticated/service_roleへのSELECT/INSERT/UPDATE/DELETE権限が
-- 自動では付与されない（本番では初期プロビジョニング時に別途設定されている）。
-- これを補わないとWorkerからのAPI呼び出しがすべて「permission denied」になり、
-- ローカルでアプリを動作確認できないため、以降に作成するテーブルすべてに
-- 権限が及ぶよう、最初のテーブル作成前にデフォルト権限として設定しておく。
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
