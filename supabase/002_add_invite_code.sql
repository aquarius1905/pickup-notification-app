-- familiesテーブルに招待コードカラムを追加
-- 6文字の英大文字＋数字（紛らわしい0,O,1,I,Lは除外）
ALTER TABLE families ADD COLUMN invite_code TEXT UNIQUE;

-- 既存データ用に招待コードを生成する関数
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 既存利用者に招待コードを発行
UPDATE families SET invite_code = generate_invite_code() WHERE invite_code IS NULL;
