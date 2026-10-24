#!/usr/bin/env node
/**
 * 打包后验证：先检查 dist 入口，再用真实 pnpm pack tarball 验证 package exports。
 */
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname as pathDirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const require = createRequire(import.meta.url)
const root = join(import.meta.dirname, '..')

async function run(bin, args, cwd = root, env = {}) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, ...env }
    // Windows 上 pnpm 是 pnpm.cmd，spawn 需要经 shell 解析；
    // tar 等真实可执行文件直接 spawn，避免 shell 改写 Windows 路径。
    const useShell = process.platform === 'win32' && bin === 'pnpm'
    const child = spawn(bin, args, { cwd, env: childEnv, stdio: 'inherit', shell: useShell })
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

function writeIframeBridgeTypeSmokeProject(tempProjectDir) {
  fs.writeFileSync(
    join(tempProjectDir, 'iframe-bridge-consumer.ts'),
    `import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'

postOpenTab(
  { title: 'typed tab', path: '/typed', query: { id: '1' } },
  { targetOrigin: 'https://parent.example.com' }
)

const off = onRefreshRequest(() => undefined, {
  allowedOrigins: ['https://parent.example.com']
})
off()
`
  )
  fs.writeFileSync(
    join(tempProjectDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          skipLibCheck: false,
          noEmit: true
        },
        include: ['iframe-bridge-consumer.ts', 'root-entry-types-consumer.ts']
      },
      null,
      2
    )
  )
}

/**
 * 模拟 Nuxt 模块在宿主 `.nuxt/components.d.ts` 里生成的组件类型引用，
 * 断言入口 bundle 的声明文件可解析、props 有类型、未知 prop 报错。
 *
 * 若类型退化为 any，`@ts-expect-error` 会因未被使用而报 TS2578，从而使校验失败。
 */
function writeRootEntryTypeSmokeProject(tempProjectDir) {
  fs.writeFileSync(
    join(tempProjectDir, 'root-entry-types-consumer.ts'),
    `// Nuxt 生成的是去掉 .js 扩展名的相对路径引用
import type * as Bundle from './node_modules/vue-stack-tabs/dist/vue-stack-tabs.es'
// 同时覆盖包 specifier 形式（宿主最小复现）
import type * as PackageBundle from 'vue-stack-tabs/dist/vue-stack-tabs.es'

type RelativeProps = InstanceType<typeof Bundle.VueStackTabs>['$props']
type PackageProps = InstanceType<typeof PackageBundle.VueStackTabs>['$props']

const relative: RelativeProps = { iframePath: '/x', max: 20, scrollContainer: undefined }
const fromPackage: PackageProps = { iframePath: '/x', max: 20, scrollContainer: undefined }

// @ts-expect-error 不存在的 prop 必须报错
const badRelative: RelativeProps = { iframePath: '/x', nope: 1 }
// @ts-expect-error 不存在的 prop 必须报错
const badPackage: PackageProps = { iframePath: '/x', nope: 1 }

export { relative, fromPackage, badRelative, badPackage }
`
  )
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
    `export const addComponent = () => {}
export const addImports = () => {}
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

/**
 * Nuxt 产物检查：插件必须保持轻量且把 Vue / i18n 留给使用方解析；
 * 自动注册组件的入口必须指向真实发布的文件。
 */
function assertNuxtArtifacts() {
  const pluginPath = join(root, 'dist', 'nuxt', 'runtime', 'plugin.mjs')
  const modulePath = join(root, 'dist', 'nuxt', 'module.mjs')
  const pluginSource = fs.readFileSync(pluginPath, 'utf8')
  const moduleSource = fs.readFileSync(modulePath, 'utf8')
  const pluginSize = fs.statSync(pluginPath).size

  if (pluginSize > 10_000) {
    throw new Error(
      `Nuxt 插件体积异常（${pluginSize} B），疑似内联了 Vue 运行时；请检查 vite.config.nuxt.ts 的 external`
    )
  }
  if (pluginSource.includes('inject() can only be used inside setup')) {
    throw new Error('Nuxt 插件内联了 Vue 运行时（inject 实现），请把 vue 加入 external')
  }
  if (!/from\s*["']vue-i18n-lite["']/.test(pluginSource)) {
    throw new Error('Nuxt 插件未以 external 方式引用 vue-i18n-lite')
  }
  if (moduleSource.includes('../index.ts')) {
    throw new Error('Nuxt 模块的 addComponent.filePath 仍指向未发布的 ../index.ts')
  }
  if (!moduleSource.includes('vue-stack-tabs.es.js')) {
    throw new Error('Nuxt 模块的 addComponent.filePath 未指向 dist 产物')
  }
}

/**
 * 入口 bundle 声明检查：Nuxt addComponent 生成的类型引用指向
 * dist/vue-stack-tabs.es，该声明必须把类型转发到 dist/index.d.ts，
 * 否则宿主全局组件类型会退化为 any（被 skipLibCheck 掩盖）。
 */
function assertRootEntryTypes() {
  const entryTypesPath = join(root, 'dist', 'vue-stack-tabs.es.d.ts')
  const source = fs.readFileSync(entryTypesPath, 'utf8')
  const indexTypesPath = join(root, 'dist', 'index.d.ts')

  if (!fs.existsSync(indexTypesPath)) {
    throw new Error(`入口声明的转发目标不存在：${indexTypesPath}`)
  }
  if (!/export \* from '\.\/index'/.test(source)) {
    throw new Error('入口声明未转发 dist/index.d.ts 的类型')
  }
  if (!/export \{ default \} from '\.\/index'/.test(source)) {
    throw new Error('入口声明未转发 dist/index.d.ts 的默认导出')
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

/**
 * GNU tar 会把 Windows 路径开头的盘符当成远程主机（`Cannot connect to C:`），
 * `--force-local` 让它按本地文件处理；bsdtar（macOS）没有该选项，故仅 Windows 添加。
 */
function withTarCompat(args) {
  return process.platform === 'win32' ? ['--force-local', ...args] : args
}

async function assertPackedFileList(tarballPath) {
  const fileList = await runCapture('tar', withTarCompat(['-tf', tarballPath]), root)
  const packedFiles = new Set(fileList.trim().split(/\r?\n/).filter(Boolean))
  const requiredPackedFiles = [
    'package/package.json',
    'package/dist/vue-stack-tabs.es.js',
    'package/dist/vue-stack-tabs.es.d.ts',
    'package/dist/style.css',
    'package/dist/iframe-bridge.mjs',
    'package/dist/iframe-bridge.d.ts',
    'package/dist/utils/iframeBridge.d.ts',
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
  // 不用 -C：MSYS/GNU tar 在 Windows 上无法解析带盘符的 -C 目录，
  // 改为把工作目录切到目标目录（-f 的盘符路径已由 --force-local 处理）。
  await run('tar', withTarCompat(['-xzf', tarballPath, '--strip-components', '1']), packageDir)
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
    // 运行时依赖已设为 external，tarball smoke 需要能解析它们；
    // 真实消费者由 npm/pnpm 自动安装 dependencies。
    linkRuntimeDependency(tempProjectDir, 'defu')
    linkRuntimeDependency(tempProjectDir, 'mitt')
    linkRuntimeDependency(tempProjectDir, 'vue-i18n-lite')
    writeIframeBridgeTypeSmokeProject(tempProjectDir)
    writeRootEntryTypeSmokeProject(tempProjectDir)
    writeNuxtSmokeStubs(tempProjectDir)

    await run('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false'], tempProjectDir)

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

function linkPeerDependency(tempProjectDir, packageName) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`)
  const sourcePath = pathDirname(packageJsonPath)
  const targetPath = join(tempProjectDir, 'node_modules', packageName)

  fs.mkdirSync(pathDirname(targetPath), { recursive: true })
  fs.symlinkSync(sourcePath, targetPath, 'junction')
}

/** 链接本项目 node_modules 中的运行时依赖（external 后 tarball 不再内联它们）。 */
function linkRuntimeDependency(tempProjectDir, packageName) {
  const sourcePath = join(root, 'node_modules', packageName)
  if (!fs.existsSync(sourcePath)) throw new Error(`运行时依赖未安装：${packageName}`)
  const targetPath = join(tempProjectDir, 'node_modules', packageName)

  fs.mkdirSync(pathDirname(targetPath), { recursive: true })
  fs.symlinkSync(sourcePath, targetPath, 'junction')
}

async function main() {
  const tempRoot = fs.mkdtempSync(join(tmpdir(), 'vue-stack-tabs-packaged-'))

  try {
    console.log('[1/3] 检查 dist 入口文件...')
    const requiredDistFiles = [
      ['root ESM', join(root, 'dist', 'vue-stack-tabs.es.js')],
      ['root entry types', join(root, 'dist', 'vue-stack-tabs.es.d.ts')],
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

    assertNuxtArtifacts()
    assertRootEntryTypes()

    console.log('\n[2/3] pnpm pack 并验证 tarball 文件清单...')
    const packDir = join(tempRoot, 'pack')
    fs.mkdirSync(packDir, { recursive: true })
    const tarballPath = await packPackage(packDir)
    await assertPackedFileList(tarballPath)

    console.log('\n[3/3] tarball 解包后验证 exports 与 ESM 导入...')
    await verifyPackageExportsFromTarball(tarballPath)

    console.log('\n全部通过：dist 入口、tarball exports、ESM 导入验证完成')
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
