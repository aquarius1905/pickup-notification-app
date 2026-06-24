#!/usr/bin/env node
// 「事前キャンセル」リッチメニューを作成し、画像をアップロードして全員のデフォルトに設定するスクリプト。
// 事前に `node scripts/generate-rich-menu-image.mjs` で assets/rich-menu.png を生成しておくこと。
// 再実行すると新しいリッチメニューが作られ、デフォルトが入れ替わる（古いものはLINE Developersコンソールから削除可能）。
//
// 使い方:
//   LINE_TOKEN=xxxx LINE_LIFF_ID=yyyy node scripts/setup-rich-menu.mjs

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const lineToken = process.env.LINE_TOKEN;
const liffId = process.env.LINE_LIFF_ID;

if (!lineToken || !liffId) {
  console.error("環境変数 LINE_TOKEN と LINE_LIFF_ID が必要です（wranglerに設定したものと同じ値）。");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagePath = path.join(__dirname, "assets", "rich-menu.png");

const richMenuBody = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: "事前キャンセル",
  chatBarText: "事前キャンセル",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 2500, height: 843 },
      action: { type: "uri", uri: `https://liff.line.me/${liffId}` },
    },
  ],
};

async function lineFetch(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    console.error(`failed: ${url} -> ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  return res;
}

const createRes = await lineFetch("https://api.line.me/v2/bot/richmenu", {
  method: "POST",
  headers: { Authorization: `Bearer ${lineToken}`, "Content-Type": "application/json" },
  body: JSON.stringify(richMenuBody),
});
const { richMenuId } = await createRes.json();
console.log(`richMenuId: ${richMenuId}`);

const image = await readFile(imagePath);
await lineFetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: "POST",
  headers: { Authorization: `Bearer ${lineToken}`, "Content-Type": "image/png" },
  body: image,
});
console.log("画像をアップロードしました");

await lineFetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${lineToken}` },
});
console.log("デフォルトのリッチメニューとして設定しました");
