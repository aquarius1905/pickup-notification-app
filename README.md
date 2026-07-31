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

- 利用者を選択して到着前通知（あと〇分で到着）をLINEで送信
- 利用者の追加・編集・削除
- 招待コードによるLINE連携（家族が友だち追加→コード送信で自動紐付け）。利用者管理画面から友だち追加QRと招待コードを拡大表示できる
- 施設ごとのAPIキー認証（マルチ施設対応）
- 通知履歴（ログ）の検索・期間/種別フィルタ・ページング表示
- 利用者側からのキャンセル連絡（当日・事前を問わず、トーク画面下のリッチメニュー「キャンセル」からLIFFフォームを開き、日付・理由を選んで送信。一度送信したキャンセルは同じ画面から取り消せる）
- 予定確認タブ（「利用予定」: 日付を選んでその日の利用予定者とキャンセル状況を確認。「キャンセル予定」: 今後のキャンセルを日付順に一覧表示）

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

#### キャンセル用のLIFF・リッチメニュー設定（初回のみ）

1. LINE Developersコンソールで、**Messaging APIチャンネルと同じProvider配下に LINE Loginチャンネルを新規作成**する（Messaging APIチャンネルへの直接のLIFF追加は廃止されている）。同じProviderであれば、LIFFで取得できるユーザーIDとMessaging APIのuserIdが一致する。
2. そのLINE LoginチャンネルのLIFFタブでLIFFアプリを追加する（サイズ: Tall、Endpoint URL: `https://<workerのドメイン>/cancel-form`、スコープ: `openid`）。発行された **LIFF ID** を `LINE_LIFF_ID` に設定する。サイズを`Full`にすると「トーク内ブラウザ（大）」扱いになり、開く際に遷移先URLの警告が表示されてしまうため`Tall`を推奨。
3. そのLINE Loginチャンネルの **Channel ID**（数値。Messaging APIチャンネルのIDではない）を `LINE_CHANNEL_ID` に設定する。
4. デプロイ後、リッチメニューを作成する。

```bash
cd worker
npm run generate-rich-menu-image
LINE_TOKEN=xxxx LINE_LIFF_ID=yyyy npm run setup-rich-menu
```

### データベースマイグレーション

`supabase/migrations/`配下のSQLファイルをSupabase CLIで管理している。`main`にマージされると、GitHub Actions（`.github/workflows/db-migrations.yml`）が自動でSupabase本番DBに適用する。

初回のみ、以下をローカルで一度実行する。

```bash
npx supabase login
npx supabase link --project-ref <SupabaseのプロジェクトRef>
# 001〜011は既に手動適用済みのため、適用済みとして記録する（実際にはDBに反映しない）
npx supabase migration repair --status applied <各マイグレーションのtimestamp>
```

また、GitHubリポジトリのSecretsに以下を設定する（Settings > Secrets and variables > Actions）。

| Secret名 | 説明 |
|--------|------|
| `SUPABASE_ACCESS_TOKEN` | [アカウント設定](https://supabase.com/dashboard/account/tokens)で発行するPersonal Access Token |
| `SUPABASE_PROJECT_ID` | SupabaseプロジェクトのRef（ダッシュボードのURLやプロジェクト設定に表示される） |
| `SUPABASE_DB_PASSWORD` | プロジェクト作成時に設定したDBパスワード |

新しいマイグレーションを追加する場合は `npx supabase migration new <名前>` でファイルを作成し、SQLを書いて`main`にマージするだけでよい。

### 環境変数（アプリ側 `.env`）

| 変数名 | 説明 |
|--------|------|
| `EXPO_PUBLIC_WORKER_URL` | Cloudflare WorkerのURL |
| `EXPO_PUBLIC_LINE_ADD_FRIEND_URL` | 送迎通知専用LINE公式アカウントの友だち追加URL（LINE Official Account Managerで発行）。全施設で共通の1アカウントのため、施設ごとではなくここで1つだけ設定する。未設定でも動作するが、利用者管理画面の招待コード表示に友だち追加QRが出なくなる |

施設のAPIキー（64文字）はビルド時に埋め込まず、アプリ初回起動時のセットアップ画面で**施設コード**（短い人が読み書きできるコード）を入力することで取得し、端末内のAsyncStorageに保存する。これにより1つのビルドを全施設に配布できる。施設コードは「施設設定」タブで確認・コピーできる。端末の設定をやり直したい場合は同タブの「この端末の設定を解除」から再設定できる。

施設コードからAPIキーを取得するエンドポイントはAPIキー認証なしで呼べるため、総当たり対策として接続元IPごとにレート制限している（`facility_code_lookup_attempts`テーブル、`worker/src/index.ts`の`handleResolveFacilityCode`）。

## 今後の課題

- **UIの調整**
- **通知文面のカスタマイズ**: 施設ごとに通知メッセージを変更できるようにする。
- **`schedule` の持ち方の見直し**: 現状JSONカラムにWeekday単位で格納しているが、拡張性・検索性の観点から別テーブルへの正規化などを検討する。
- **LINE通知の既読確認**: LINE Messaging APIには送信済みメッセージが読まれたかどうかを取得する仕組みがなく、厳密な既読確認は不可能。「確認しました」ボタンのタップを記録する等で近似することは技術的には可能だが、通知を受け取るご家族側に毎回操作の手間を強いることになるため、現時点では実装しない。
- **招待コード入力をLIFFのワンタップ登録に置き換える**: 現状は家族が友だち追加後に6桁の招待コードを手入力する必要がある。キャンセルフォームと同様にLIFFを使い、利用者ごとの固有リンクをタップするだけで自動連携できるようにすれば入力の手間が減る。ただし招待コード自体（リンクに埋め込む形）や友だち追加自体は仕組み上なくならないため、効果に対して実装コストが見合うかはモニター運用でのフィードバックを見てから判断する。
