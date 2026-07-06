#!/usr/bin/env node
// リッチメニュー用の画像（単色背景＋テキスト1枚）を生成するスクリプト。
// 見た目を変えたい場合はこのファイルのSVGを直接編集して再実行すればよい。
//
// 使い方:
//   node scripts/generate-rich-menu-image.mjs

import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 2500;
const HEIGHT = 843;
const LABEL = "キャンセル";

// dominant-baseline="middle"は和文フォントだと視覚的な中央よりやや上にずれるため、
// 実際にレンダリングして確認した値（HEIGHT/2 + 68px）で補正している。
const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#06c755"/>
  <text x="50%" y="${HEIGHT / 2 + 68}" text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif" font-size="180" font-weight="bold" fill="#ffffff">${LABEL}</text>
</svg>`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "assets");
const outPath = path.join(outDir, "rich-menu.png");

await mkdir(outDir, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outPath);

console.log(`生成しました: ${outPath}`);
