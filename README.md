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
