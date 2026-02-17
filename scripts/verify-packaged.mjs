#!/usr/bin/env node
/**
 * 打包后验证：在 Vue / Nuxt playground 中构建，确保 dist 产物在两者下均正常
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const playgrounds = ['vue', 'nuxt']

async function run(cmd, cwd) {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = cmd.split(' ')
    const child = spawn(bin, args, { cwd, stdio: 'inherit', shell: true })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))))
  })
}

async function main() {
  console.log('[1/3] 检查 dist 是否存在...')
  const fs = await import('node:fs')
  const distPath = join(root, 'dist', 'vue-stack-tabs.es.js')
  if (!fs.existsSync(distPath)) {
    console.error('dist 不存在，请先运行 pnpm run lib:build')
    process.exit(1)
  }

  for (const name of playgrounds) {
    const cwd = join(root, 'playgrounds', name)
    console.log(`\n[2/3] ${name}: pnpm install...`)
    await run('pnpm install', cwd)
    console.log(`\n[3/3] ${name}: pnpm run build...`)
    await run('pnpm run build', cwd)
    console.log(`${name} 构建成功`)
  }

  console.log('\n全部通过：Vue 与 Nuxt 打包后验证完成')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
