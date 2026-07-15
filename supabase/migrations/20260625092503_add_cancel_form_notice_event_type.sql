-- 事前キャンセルの確認LINE通知の送信結果を記録できるよう、logs.event_typeの許可値を追加
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_event_type_check;

ALTER TABLE logs ADD CONSTRAINT logs_event_type_check
  CHECK (event_type IN ('pickup_approaching', 'dropoff_approaching', 'cancel_form_notice'));
