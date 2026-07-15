-- 履歴画面で「○分前」をメッセージ文字列から正規表現で抜き出していたのをやめ、
-- 通知時点の分数を構造化データとして保持する
ALTER TABLE logs ADD COLUMN IF NOT EXISTS notify_minutes SMALLINT;
