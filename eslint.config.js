// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // workerはExpoアプリと別プロジェクト（Node.js/Cloudflare Worker）で、
    // 独自のtsconfigでのみ型チェックしており、この設定の対象外とする。
    ignores: ['dist/*', 'worker/**'],
  },
]);
