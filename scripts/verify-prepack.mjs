#!/usr/bin/env node
/**
 * 打包前验证：单元测试 + Vue 主项目构建（源码）+ Nuxt playground 构建（源码）
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

async function run(cmd, cwd = root, env = {}) {
  return new Promise((resolve, reject) => {
    const parts = cmd.split(' ')
    const bin = parts[0]
    const args = parts.slice(1)
    const childEnv = { ...process.env, ...env }
    const child = spawn(bin, args, { cwd, stdio: 'inherit', shell: true, env: childEnv })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))))
  })
}

async function main() {
  console.log('[1/4] 单元测试...')
  await run('pnpm run test')

  console.log('\n[2/4] Vue 主项目构建（使用源码 @/lib）...')
  await run('pnpm run build')
  console.log('Vue 主项目构建成功')

  console.log('\n[3/4] Nuxt playground 依赖安装...')
  await run('pnpm install --no-frozen-lockfile', join(root, 'playgrounds/nuxt'))

  console.log('\n[4/4] Nuxt playground 构建（使用源码 alias）...')
  await run('pnpm run build:source', join(root, 'playgrounds/nuxt'), { USE_SOURCE: '1' })
  console.log('Nuxt 源码构建成功')

  console.log('\n全部通过：打包前 Vue + Nuxt 全覆盖验证完成')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
