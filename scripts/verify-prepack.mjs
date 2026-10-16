#!/usr/bin/env node
/**
 * 打包前验证：单元测试 + Vue 主项目构建（源码）
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

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
  console.log('[1/2] 单元测试...')
  await run('pnpm run test')

  console.log('\n[2/2] Vue 主项目构建（使用源码 @/lib）...')
  await run('pnpm run build')
  console.log('Vue 主项目构建成功')

  console.log('\n全部通过：打包前 Vue 全覆盖验证完成')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
