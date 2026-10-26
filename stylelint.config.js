/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-recommended-vue/scss'],
  ignoreFiles: [
    '**/dist/**',
    '**/node_modules/**',
    '**/.nuxt/**',
    '**/.output/**',
    'coverage/**',
    'docs/.vitepress/cache/**',
    'docs/.vitepress/dist/**'
  ],
  rules: {
    // 类名沿用 BEM（block__element--modifier）；VitePress 内置组件使用 PascalCase（如 .VPHero）。
    'selector-class-pattern': [
      '^(?:[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?|VP[A-Z][a-zA-Z0-9]*)$',
      { resolveNestedSelectors: true }
    ],
    // 项目统一用小数书写 alpha，例如 rgb(0 0 0 / 0.8)。
    'alpha-value-notation': 'number',
    // 字体族名与 text-rendering 关键字保留惯用大小写。
    'value-keyword-case': [
      'lower',
      {
        ignoreKeywords: ['optimizeLegibility', 'SFMono-Regular', 'Menlo', 'Consolas']
      }
    ],
    // 主题令牌按分组用空行分隔，保留可读性。
    'custom-property-empty-line-before': null,
    // 允许使用独占一行的 `//` 作为分隔注释。
    'scss/comment-no-empty': null,
    // 项目内 @use 两种写法共存：带扩展名（入口）与不带扩展名（局部）。
    'scss/load-partial-extension': null
  }
}
