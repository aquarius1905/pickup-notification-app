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
  {
    rules: {
      // import の並び順を統一する（外部パッケージ → @/ のプロジェクト内 → 相対パス、各グループ内はアルファベット順）。
      // `npx expo lint --fix` で自動整列できる。
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
]);
