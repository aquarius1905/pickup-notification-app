-- 施設テーブル作成
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- familiesテーブルにfacility_idカラムを追加
ALTER TABLE families ADD COLUMN facility_id UUID REFERENCES facilities(id);

-- 動作確認用：最初の施設を作成してAPIキーを確認
-- INSERT INTO facilities (name) VALUES ('あなたの施設名');
-- SELECT id, name, api_key FROM facilities;

-- 既存のfamiliesデータに施設を紐付ける（施設作成後に実行）
-- UPDATE families SET facility_id = '上で取得した施設ID';

-- 紐付け完了後、NOT NULL制約を追加
-- ALTER TABLE families ALTER COLUMN facility_id SET NOT NULL;
