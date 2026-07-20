-- キャンセルの取り消し時にもLINE通知を送るようにしたため、その送信結果を記録できるようlogs.event_typeの許可値を追加
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_event_type_check;

ALTER TABLE logs ADD CONSTRAINT logs_event_type_check
  CHECK (event_type IN (
    'pickup_approaching',
    'dropoff_approaching',
    'cancel_form_notice',
    'cancel_form_withdraw_notice',
    'pickup_completed',
    'dropoff_completed'
  ));
