#!/usr/bin/env node
/**
 * 打包后验证：先检查 dist 入口，再用真实 pnpm pack tarball 验证 package exports 和 playground 构建。
 */
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { tmpdir } from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const playgrounds = ['vue', 'nuxt']

async function run(bin, args, cwd = root, env = {}) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, ...env }
    const child = spawn(bin, args, { cwd, env: childEnv, stdio: 'inherit', shell: false })
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))))
  })
}

async function runCapture(bin, args, cwd = root) {
  return new Promise((resolve, reject) => {
    let stdout = ''
    const child = spawn(bin, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], shell: false })
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.on('close', (code) => (code === 0 ? resolve(stdout) : reject(new Error(`exit ${code}`))))
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function cleanPlaygroundBuildOutputs(cwd) {
  for (const outputPath of ['.nuxt', '.output', 'dist']) {
    fs.rmSync(join(cwd, outputPath), { recursive: true, force: true })
  }
}

function linkPeerDependency(tempProjectDir, packageName) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`)
  const sourcePath = dirname(packageJsonPath)
  const targetPath = join(tempProjectDir, 'node_modules', packageName)

  fs.mkdirSync(dirname(targetPath), { recursive: true })
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

function assertNoRequireExport(exportConfig, exportPath) {
  if (!exportConfig || typeof exportConfig !== 'object') return

  for (const [key, value] of Object.entries(exportConfig)) {
    const nestedExportPath = `${exportPath}.${key}`
    if (key === 'require') {
      throw new Error('CommonJS require export should not exist: ' + exportPath)
    }
    assertNoRequireExport(value, nestedExportPath)
  }
}

function assertExportTypesExist(packageDir, exportConfig) {
  if (!exportConfig || typeof exportConfig !== 'object') return

  for (const [key, value] of Object.entries(exportConfig)) {
    if (key === 'types' && typeof value === 'string') {
      const typePath = join(packageDir, value)
      if (!fs.existsSync(typePath)) throw new Error(`types export 不存在：${typePath}`)
      continue
    }
    assertExportTypesExist(packageDir, value)
  }
}

async function packPackage(packDir) {
  await run('pnpm', ['pack', '--pack-destination', packDir], root)

  const tarballs = fs
    .readdirSync(packDir)
    .filter((fileName) => fileName.endsWith('.tgz'))
    .map((fileName) => join(packDir, fileName))

  if (tarballs.length !== 1) {
    throw new Error(`预期 pnpm pack 生成 1 个 tarball，实际为 ${tarballs.length}`)
  }

  return tarballs[0]
}

async function assertPackedFileList(tarballPath) {
  const fileList = await runCapture('tar', ['-tf', tarballPath], root)
  const packedFiles = new Set(fileList.trim().split(/\r?\n/).filter(Boolean))
  const requiredPackedFiles = [
    'package/package.json',
    'package/dist/vue-stack-tabs.es.js',
    'package/dist/style.css',
    'package/dist/iframe-bridge.mjs',
    'package/dist/iframe-bridge.d.ts',
    'package/dist/nuxt/module.mjs',
    'package/dist/nuxt/module.d.ts',
    'package/dist/nuxt/runtime/plugin.mjs',
    'package/dist/nuxt/runtime/plugin.d.ts'
  ]

  for (const filePath of requiredPackedFiles) {
    if (!packedFiles.has(filePath)) throw new Error(`tarball 缺少文件：${filePath}`)
  }
}

async function extractTarballForSmoke(tempProjectDir, tarballPath) {
  const packageDir = join(tempProjectDir, 'node_modules', 'vue-stack-tabs')
  fs.mkdirSync(packageDir, { recursive: true })
  await run('tar', ['-xzf', tarballPath, '--strip-components', '1', '-C', packageDir], root)
  return packageDir
}

async function verifyPackageExportsFromTarball(tarballPath) {
  const tempProjectDir = fs.mkdtempSync(join(tmpdir(), 'vue-stack-tabs-tarball-smoke-'))

  try {
    fs.writeFileSync(join(tempProjectDir, 'package.json'), '{"type":"module"}\n')
    const packageDir = await extractTarballForSmoke(tempProjectDir, tarballPath)
    const pkg = readJson(join(packageDir, 'package.json'))

    for (const [exportPath, exportConfig] of Object.entries(pkg.exports)) {
      assertNoRequireExport(exportConfig, exportPath)
    }
    if (!pkg.exports['./iframe-bridge']) throw new Error('iframe bridge export missing')
    if (!pkg.exports['./nuxt']) throw new Error('Nuxt export missing')
    assertExportTypesExist(packageDir, pkg.exports)

    linkPeerDependency(tempProjectDir, 'vue')
    linkPeerDependency(tempProjectDir, 'vue-router')
    linkPeerDependency(tempProjectDir, 'element-plus')
    writeNuxtSmokeStubs(tempProjectDir)

    await runNodeScript(
      `
        import { existsSync } from 'node:fs'
        import { createRequire } from 'node:module'
        const require = createRequire(new URL('./package.json', import.meta.url))
        const assertResolvedFile = (specifier, label) => {
          const resolved = require.resolve(specifier)
          if (!existsSync(resolved)) throw new Error(label + ' 不存在：' + resolved)
        }
        assertResolvedFile('vue-stack-tabs/dist/style.css', 'root CSS')
        await import('vue-stack-tabs')
        const bridge = await import('vue-stack-tabs/iframe-bridge')
        if (typeof bridge.postOpenTab !== 'function') throw new Error('postOpenTab missing')
        if (typeof bridge.onRefreshRequest !== 'function') throw new Error('onRefreshRequest missing')
        const nuxtModule = await import('vue-stack-tabs/nuxt')
        if (typeof nuxtModule.default !== 'function') throw new Error('Nuxt module default export missing')
        const nuxtRuntime = await import('./node_modules/vue-stack-tabs/dist/nuxt/runtime/plugin.mjs')
        if (typeof nuxtRuntime.default !== 'function') throw new Error('Nuxt runtime plugin default export missing')
        console.log('tarball ESM imports verified')
      `,
      tempProjectDir
    )
  } finally {
    fs.rmSync(tempProjectDir, { recursive: true, force: true })
  }
}

function copyPlaygroundForTarball(name, tempRoot, tarballPath) {
  const source = join(root, 'playgrounds', name)
  const target = join(tempRoot, 'playgrounds', name)
  const skippedTopLevelPaths = new Set(['node_modules', '.nuxt', '.output', 'dist'])

  fs.cpSync(source, target, {
    recursive: true,
    filter: (sourcePath) => {
      const sourceRelativePath = relative(source, sourcePath)
      const topLevelPath = sourceRelativePath.split(/[\\/]/)[0]
      return !skippedTopLevelPaths.has(topLevelPath)
    }
  })

  const packageJsonPath = join(target, 'package.json')
  const packageJson = readJson(packageJsonPath)
  const relativeTarballPath = relative(target, tarballPath).replaceAll('\\', '/')
  const tarballDependency = relativeTarballPath.startsWith('.')
    ? `file:${relativeTarballPath}`
    : `file:./${relativeTarballPath}`
  packageJson.dependencies = {
    ...packageJson.dependencies,
    'vue-stack-tabs': tarballDependency
  }
  writeJson(packageJsonPath, packageJson)

  return target
}

async function verifyPlaygroundBuildsFromTarball(tarballPath, tempRoot) {
  for (const name of playgrounds) {
    const cwd = copyPlaygroundForTarball(name, tempRoot, tarballPath)
    try {
      console.log(`\n[3/4] ${name}: pnpm install tarball...`)
      await run(
        'pnpm',
        ['--dir', cwd, 'install', '--ignore-workspace', '--ignore-scripts', '--no-frozen-lockfile'],
        root
      )
      console.log(`\n[4/4] ${name}: pnpm run build...`)
      await run('pnpm', ['--dir', cwd, 'run', 'build'], root, { USE_PACKAGE: '1' })
      console.log(`${name} tarball 构建成功`)
    } finally {
      cleanPlaygroundBuildOutputs(cwd)
    }
  }
}

async function main() {
  const tempRoot = fs.mkdtempSync(join(tmpdir(), 'vue-stack-tabs-packaged-'))

  try {
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

    console.log('\n[2/4] pnpm pack 并验证 tarball exports 与 ESM 导入...')
    const packDir = join(tempRoot, 'pack')
    fs.mkdirSync(packDir, { recursive: true })
    const tarballPath = await packPackage(packDir)
    await assertPackedFileList(tarballPath)
    await verifyPackageExportsFromTarball(tarballPath)
    await verifyPlaygroundBuildsFromTarball(tarballPath, tempRoot)

    console.log('\n全部通过：dist 入口、tarball exports、Vue 与 Nuxt tarball 构建验证完成')
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
