#!/usr/bin/env node
/**
 * 为入口 bundle 补一个同名声明文件。
 *
 * 背景：
 * - Nuxt 模块的 `addComponent({ filePath })` 会让宿主生成
 *   `typeof import('.../dist/vue-stack-tabs.es')['VueStackTabs']`。
 * - 入口声明原先只 `export * from './index'`，而 `index.d.ts` 的
 *   `VueStackTabs` 又来自 `./StackTabs.vue`（vite-plugin-dts 产出的
 *   `.vue.d.ts`）。JetBrains/WebStorm 的 Vue 语言服务无法沿
 *   「re-export + .vue.d.ts」这条链解析组件声明，宿主里
 *   `<VueStackTabs>` 就会提示看不到声明。
 * - 这里把组件声明复制成普通 `.d.ts`，并把 `index.d.ts` 的 `.vue` 导入
 *   改成无扩展名导入，让入口类型链完全由普通 TypeScript 声明组成。
 *   运行时产物不受影响。
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const distDir = join(import.meta.dirname, '..', 'dist')

/** 入口声明会直接或间接引用的 .vue 声明，复制为同名普通 .d.ts。 */
const componentDeclarations = [
  ['StackTabs.vue.d.ts', 'StackTabs.d.ts'],
  ['iframe.vue.d.ts', 'iframe.d.ts'],
  ['components/TabHeader/TabHeaderButton.vue.d.ts', 'components/TabHeader/TabHeaderButton.d.ts']
]

for (const [sourceName, targetName] of componentDeclarations) {
  const source = join(distDir, sourceName)
  if (!existsSync(source)) continue
  copyFileSync(source, join(distDir, targetName))
}

const indexPath = join(distDir, 'index.d.ts')
let index = readFileSync(indexPath, 'utf8')
index = index
  .replace(/(['"])\.\/StackTabs\.vue\1/g, '$1./StackTabs$1')
  .replace(/(['"])\.\/iframe\.vue\1/g, '$1./iframe$1')
  .replace(
    /(['"])\.\/components\/TabHeader\/TabHeaderButton\.vue\1/g,
    '$1./components/TabHeader/TabHeaderButton$1'
  )
writeFileSync(indexPath, index)

const distEntry = join(distDir, 'vue-stack-tabs.es.d.ts')
writeFileSync(
  distEntry,
  [
    '// 由 scripts/write-entry-dts.mjs 生成，请勿手动修改。',
    '// 供 Nuxt addComponent({ filePath }) 生成的类型引用解析入口 bundle。',
    "export * from './index'",
    "export { default } from './index'",
    '// 显式导出组件，避免 IDE 沿 ./index 的重导出链解析 .vue 声明',
    "export { default as VueStackTabs } from './StackTabs'",
    ''
  ].join('\n')
)

console.log(`已生成入口声明：${distEntry}`)
