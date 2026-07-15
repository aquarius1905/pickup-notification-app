-- 事前キャンセルの理由を記録するカラムを追加
ALTER TABLE cancellations ADD COLUMN reason TEXT;
