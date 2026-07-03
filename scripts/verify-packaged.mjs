#!/usr/bin/env node
/* global console, process */
/**
 * 打包后验证：先检查 dist 入口和 ESM 导入，再在 Vue / Nuxt playground 中构建。
 */
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const playgrounds = ['vue', 'nuxt']

async function run(bin, args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, ...env }
    const child = spawn(bin, args, { cwd, env: childEnv, stdio: 'inherit', shell: false })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))))
  })
}

async function runNodeScript(source, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      cwd,
      stdio: 'inherit',
      shell: false
    })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))))
  })
}

function cleanPlaygroundBuildOutputs(cwd) {
  for (const outputPath of ['.nuxt', '.output', 'dist']) {
    fs.rmSync(join(cwd, outputPath), { recursive: true, force: true })
  }
}

function copyPackageForSmoke(packageDir) {
  fs.mkdirSync(packageDir, { recursive: true })
  fs.cpSync(join(root, 'dist'), join(packageDir, 'dist'), { recursive: true })
  fs.copyFileSync(join(root, 'package.json'), join(packageDir, 'package.json'))
}

function linkPeerDependency(tempProjectDir, packageName) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`)
  const sourcePath = dirname(packageJsonPath)
  const targetPath = join(tempProjectDir, 'node_modules', packageName)

  fs.symlinkSync(sourcePath, targetPath, 'junction')
}

function writeNuxtSmokeStubs(tempProjectDir) {
  const nuxtDir = join(tempProjectDir, 'node_modules', 'nuxt')
  fs.mkdirSync(join(nuxtDir, 'kit'), { recursive: true })
  fs.mkdirSync(join(nuxtDir, 'app'), { recursive: true })
  fs.writeFileSync(
    join(nuxtDir, 'package.json'),
    JSON.stringify({
      type: 'module',
      exports: { './kit': './kit/index.js', './app': './app/index.js' }
    })
  )
  fs.writeFileSync(
    join(nuxtDir, 'kit', 'index.js'),
    `export const addImports = () => {}
export const addPlugin = () => {}
export const createResolver = () => ({ resolve: (path) => path })
export const defineNuxtModule = (moduleDefinition) => () => moduleDefinition
`
  )
  fs.writeFileSync(
    join(nuxtDir, 'app', 'index.js'),
    `export const defineNuxtPlugin = (plugin) => plugin
export const useRuntimeConfig = () => ({ public: { vueStackTabs: { locale: 'zh-CN' } } })
`
  )
}

async function verifyPackageExportsFromTempProject() {
  const tempProjectDir = fs.mkdtempSync(join(tmpdir(), 'vue-stack-tabs-packaged-'))
  const packageDir = join(tempProjectDir, 'node_modules', 'vue-stack-tabs')

  try {
    copyPackageForSmoke(packageDir)
    linkPeerDependency(tempProjectDir, 'vue')
    linkPeerDependency(tempProjectDir, 'vue-router')
    writeNuxtSmokeStubs(tempProjectDir)

    await runNodeScript(
      `
        import pkg from './node_modules/vue-stack-tabs/package.json' with { type: 'json' }
        if (pkg.exports['.'].require) throw new Error('CommonJS require export should not exist')
        if (!pkg.exports['./iframe-bridge']) throw new Error('iframe bridge export missing')
        if (!pkg.exports['./nuxt']) throw new Error('Nuxt export missing')
        await import('vue-stack-tabs')
        const bridge = await import('vue-stack-tabs/iframe-bridge')
        if (typeof bridge.postOpenTab !== 'function') throw new Error('postOpenTab missing')
        if (typeof bridge.onRefreshRequest !== 'function') throw new Error('onRefreshRequest missing')
        const nuxtModule = await import('vue-stack-tabs/nuxt')
        if (typeof nuxtModule.default !== 'function') throw new Error('Nuxt module default export missing')
        const nuxtRuntime = await import('./node_modules/vue-stack-tabs/dist/nuxt/runtime/plugin.mjs')
        if (typeof nuxtRuntime.default !== 'function') throw new Error('Nuxt runtime plugin default export missing')
        console.log('dist ESM imports verified')
      `,
      tempProjectDir
    )
  } finally {
    fs.rmSync(tempProjectDir, { recursive: true, force: true })
  }
}

async function main() {
  console.log('[1/4] 检查 dist 入口文件...')
  const requiredDistFiles = [
    ['root ESM', join(root, 'dist', 'vue-stack-tabs.es.js')],
    ['root CSS', join(root, 'dist', 'style.css')],
    ['iframe bridge ESM', join(root, 'dist', 'iframe-bridge.mjs')],
    ['iframe bridge types', join(root, 'dist', 'iframe-bridge.d.ts')],
    ['Nuxt module ESM', join(root, 'dist', 'nuxt', 'module.mjs')],
    ['Nuxt module types', join(root, 'dist', 'nuxt', 'module.d.ts')],
    ['Nuxt runtime plugin ESM', join(root, 'dist', 'nuxt', 'runtime', 'plugin.mjs')],
    ['Nuxt runtime plugin types', join(root, 'dist', 'nuxt', 'runtime', 'plugin.d.ts')]
  ]

  for (const [label, filePath] of requiredDistFiles) {
    if (!fs.existsSync(filePath)) {
      console.error(`${label} 不存在：${filePath}`)
      process.exit(1)
    }
  }

  console.log('\n[2/4] 验证临时 package 的 exports 与 ESM 导入...')
  await verifyPackageExportsFromTempProject()

  for (const name of playgrounds) {
    const cwd = join(root, 'playgrounds', name)
    console.log(`\n[3/4] ${name}: pnpm install...`)
    await run(
      'pnpm',
      ['--dir', cwd, 'install', '--ignore-workspace', '--ignore-scripts', '--frozen-lockfile'],
      root
    )
    console.log(`\n[4/4] ${name}: pnpm run build...`)
    await run('pnpm', ['--dir', cwd, 'run', 'build'], root, { USE_SOURCE: '' })
    console.log(`${name} 构建成功`)
    cleanPlaygroundBuildOutputs(cwd)
  }

  console.log('\n全部通过：dist 入口、ESM 导入、Vue 与 Nuxt 打包后验证完成')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
