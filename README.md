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
npx wrangler deploy
```

### 環境変数（アプリ側 `.env`）

| 変数名 | 説明 |
|--------|------|
| `EXPO_PUBLIC_WORKER_URL` | Cloudflare WorkerのURL |
| `EXPO_PUBLIC_API_KEY` | 施設のAPIキー |

## 今後の課題

- **施設設定の仕組みを見直す**: 現状APIキーをビルド時に環境変数で埋め込んでいるため施設ごとに別ビルドが必要。初回起動時のセットアップ画面でAPIキーを入力しAsyncStorageに保存する方式に変更し、1ビルドを全施設に配布できるようにする。
- **UIの調整**
- **利用者側から施設へのキャンセル連絡**: LINEから施設へキャンセルを連絡できる仕組み。
- **通知履歴（ログ）の画面表示**: 送信ログはDBに記録済み。アプリ上で確認できる画面を追加する。
- **通知文面のカスタマイズ**: 施設ごとに通知メッセージを変更できるようにする。
- **`schedule` の持ち方の見直し**: 現状JSONカラムにWeekday単位で格納しているが、拡張性・検索性の観点から別テーブルへの正規化などを検討する。
