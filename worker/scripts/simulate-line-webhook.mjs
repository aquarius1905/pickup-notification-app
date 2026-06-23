#!/usr/bin/env node
// LINEの実アカウントを使わずに、Workerの/webhookへ偽装リクエストを送るテスト用スクリプト。
// LINE_CHANNEL_SECRETで正しい署名(x-line-signature)を計算して付与する。
//
// 使い方:
//   LINE_CHANNEL_SECRET=xxxx node scripts/simulate-line-webhook.mjs <workerUrl> <fakeUserId> <text>
//
// 例:
//   # 招待コードで紐付け（fakeUserIdを覚えておけば同じ「利用者」として継続テストできる）
//   LINE_CHANNEL_SECRET=xxxx node scripts/simulate-line-webhook.mjs http://localhost:8787 Utest0001 ABC123
//
//   # キャンセル連絡
//   LINE_CHANNEL_SECRET=xxxx node scripts/simulate-line-webhook.mjs http://localhost:8787 Utest0001 キャンセル

import { createHmac } from "node:crypto";

const [workerUrl, fakeUserId, text] = process.argv.slice(2);
const channelSecret = process.env.LINE_CHANNEL_SECRET;

if (!workerUrl || !fakeUserId || !text) {
  console.error(
    "使い方: LINE_CHANNEL_SECRET=xxxx node scripts/simulate-line-webhook.mjs <workerUrl> <fakeUserId> <text>",
  );
  process.exit(1);
}

if (!channelSecret) {
  console.error("環境変数 LINE_CHANNEL_SECRET が必要です（wranglerに設定したものと同じ値）。");
  process.exit(1);
}

const body = JSON.stringify({
  events: [
    {
      type: "message",
      replyToken: "dummy-reply-token-for-testing",
      message: { type: "text", text },
      source: { userId: fakeUserId },
    },
  ],
});

const signature = createHmac("sha256", channelSecret).update(body).digest("base64");

const res = await fetch(`${workerUrl.replace(/\/$/, "")}/webhook`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-line-signature": signature,
  },
  body,
});

console.log(`status: ${res.status}`);
console.log(await res.text());
