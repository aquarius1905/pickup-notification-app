-- 「お迎え済み」「お送り済み」をスタッフ複数端末間で共有するため、
-- これまでローカル(AsyncStorage)のみで管理していた完了状態をlogsに記録できるようにする
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_event_type_check;

ALTER TABLE logs ADD CONSTRAINT logs_event_type_check
  CHECK (event_type IN (
    'pickup_approaching',
    'dropoff_approaching',
    'cancel_form_notice',
    'pickup_completed',
    'dropoff_completed'
  ));
