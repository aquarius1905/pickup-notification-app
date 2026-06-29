# 送迎通知アプリ

デイサービス施設の職員が、利用者の送迎状況（出発・到着）をご家族のLINEに通知するアプリです。

## 構成

```
Expo (React Native) → Cloudflare Worker → Supabase (DB)
                                        → LINE Messaging API (通知)
```

- **フロントエンド**: Expo / React Native（iOS / Android）
- **バックエンド**: Cloudflare Workers
- **データベース**: Supabase (PostgreSQL)
- **通知**: LINE Messaging API

## 機能

- 利用者を選択して出発・到着通知をLINEで送信
- 利用者の追加・編集・削除
- 招待コードによるLINE連携（家族が友だち追加→コード送信で自動紐付け）
- 施設ごとのAPIキー認証（マルチ施設対応）
- 通知履歴（ログ）の検索・期間/種別フィルタ・ページング表示
- 利用者側からのLINEキャンセル連絡（当日分。「キャンセル」「休み」等のキーワードを含むメッセージを送信すると記録され、送迎通知タブにバッジ表示。メッセージ本文はキャンセル理由としても保存される）
- 利用者側からの事前キャンセル連絡（通院などで事前にわかっている分。トーク画面のリッチメニューからLIFFフォームを開き、日付と理由を選んで送信）
- キャンセル予定タブ（当日・事前を問わず、今後のキャンセルを日付順に一覧表示）

## セットアップ

### アプリ

```bash
npm install
cp .env.example .env  # 環境変数を設定
npx expo start
```

### Worker

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_API_KEY
npx wrangler secret put LINE_TOKEN
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_LIFF_ID
npx wrangler secret put LINE_CHANNEL_ID
npx wrangler deploy
```

#### 事前キャンセル用のLIFF・リッチメニュー設定（初回のみ）

1. LINE Developersコンソールで、**Messaging APIチャンネルと同じProvider配下に LINE Loginチャンネルを新規作成**する（Messaging APIチャンネルへの直接のLIFF追加は廃止されている）。同じProviderであれば、LIFFで取得できるユーザーIDとMessaging APIのuserIdが一致する。
2. そのLINE LoginチャンネルのLIFFタブでLIFFアプリを追加する（サイズ: Full、Endpoint URL: `https://<workerのドメイン>/cancel-form`、スコープ: `openid`）。発行された **LIFF ID** を `LINE_LIFF_ID` に設定する。
3. そのLINE Loginチャンネルの **Channel ID**（数値。Messaging APIチャンネルのIDではない）を `LINE_CHANNEL_ID` に設定する。
4. デプロイ後、リッチメニューを作成する。

```bash
cd worker
npm run generate-rich-menu-image
LINE_TOKEN=xxxx LINE_LIFF_ID=yyyy npm run setup-rich-menu
```

### 環境変数（アプリ側 `.env`）

| 変数名 | 説明 |
|--------|------|
| `EXPO_PUBLIC_WORKER_URL` | Cloudflare WorkerのURL |

施設のAPIキー（64文字）はビルド時に埋め込まず、アプリ初回起動時のセットアップ画面で**施設コード**（短い人が読み書きできるコード）を入力することで取得し、端末内のAsyncStorageに保存する。これにより1つのビルドを全施設に配布できる。施設コードは「施設設定」タブで確認・コピーできる。端末の設定をやり直したい場合は同タブの「この端末の設定を解除」から再設定できる。

施設コードからAPIキーを取得するエンドポイントはAPIキー認証なしで呼べるため、総当たり対策として接続元IPごとにレート制限している（`facility_code_lookup_attempts`テーブル、`worker/src/index.ts`の`handleResolveFacilityCode`）。

## 今後の課題

- **EAS Buildで実機にインストールできるようにする**: 現状`eas.json`が無く、`app.json`にも`ios.bundleIdentifier`/`android.package`が未設定のため、`npx expo start`（Expo Go経由）でしか動作確認できない。内部テスト配布（TestFlightの内部テスト、Androidは直接APK配布）用のビルドを用意し、実機で日常運用できる状態にする。他の課題はこれが前提になる。
- **UIの調整**
- **通知文面のカスタマイズ**: 施設ごとに通知メッセージを変更できるようにする。
- **`schedule` の持ち方の見直し**: 現状JSONカラムにWeekday単位で格納しているが、拡張性・検索性の観点から別テーブルへの正規化などを検討する。
- **事前キャンセルの理由（`cancel_reasons`）の持ち方の見直し**: 現状 `worker/src/cancelForm.ts` で `'hospital'/'other'` という英語キーを `CANCEL_REASONS` で日本語ラベルに変換しているが、DBの `cancellations.reason` には変換後の日本語テキストがそのまま保存され、英語キーは他の場所で使われていない。`'通院'/'その他'` を値として直接使う形に簡略化できる可能性があるが、未対応。
