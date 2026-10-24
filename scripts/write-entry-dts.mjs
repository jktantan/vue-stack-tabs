#!/usr/bin/env node
/**
 * 为入口 bundle 补一个同名声明文件。
 *
 * vite-plugin-dts 按源文件产出声明，不会为 `dist/vue-stack-tabs.es.js`
 * 产出 `dist/vue-stack-tabs.es.d.ts`。而 Nuxt 模块的
 * `addComponent({ filePath })` 会让宿主生成
 * `typeof import('.../dist/vue-stack-tabs.es')['VueStackTabs']` 的类型引用，
 * 文件缺失时宿主 `<VueStackTabs>` 的类型退化为 any（TS2307 被 skipLibCheck 掩盖）。
 *
 * 因此这里把入口声明转发到已有的 `dist/index.d.ts`（含 GlobalComponents 声明）。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const distEntry = join(import.meta.dirname, '..', 'dist', 'vue-stack-tabs.es.d.ts')

writeFileSync(
  distEntry,
  [
    '// 由 scripts/write-entry-dts.mjs 生成，请勿手动修改。',
    '// 供 Nuxt addComponent({ filePath }) 生成的类型引用解析入口 bundle。',
    "export * from './index'",
    "export { default } from './index'",
    ''
  ].join('\n')
)

console.log(`已生成入口声明：${distEntry}`)
