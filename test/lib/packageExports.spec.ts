/// <reference types="node" />

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface PackageExportEntry {
  types?: string
  import?: string
  default?: string
  require?: string
}

interface PackageJsonShape {
  type?: string
  main?: string
  module?: string
  typings?: string
  exports?: Record<string, string | PackageExportEntry>
}

const readPackageJson = (): PackageJsonShape =>
  JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJsonShape

describe('package exports', () => {
  it('root export is ESM-only and does not advertise CommonJS require', () => {
    const pkg = readPackageJson()
    const rootExport = pkg.exports?.['.'] as PackageExportEntry

    expect(pkg.type).toBe('module')
    expect(rootExport.import).toBe('./dist/vue-stack-tabs.es.js')
    expect(rootExport.types).toBe('./dist/index.d.ts')
    expect(rootExport.require).toBeUndefined()
    expect(pkg.main).toBe('./dist/vue-stack-tabs.es.js')
    expect(pkg.module).toBe('./dist/vue-stack-tabs.es.js')
  })

  it('packaged smoke script creates one pnpm pack tarball for isolated smoke checks', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'verify-packaged.mjs'), 'utf8')

    expect(script).toContain('await packPackage(packDir)')
    expect(script).toContain("['pack', '--pack-destination', packDir]")
    expect(script).toContain('tarballPath')
    expect(script).toContain('await verifyPackageExportsFromTarball(tarballPath)')
    expect(script).toContain('extractTarballForSmoke(tempProjectDir, tarballPath)')
    expect(script).not.toContain('copyPackageForSmoke')
  })

  it('packaged smoke script verifies root, iframe, Nuxt module, CSS, types, and Nuxt runtime from the tarball', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'verify-packaged.mjs'), 'utf8')

    expect(script).toContain("await import('vue-stack-tabs')")
    expect(script).toContain("await import('vue-stack-tabs/iframe-bridge')")
    expect(script).toContain("await import('vue-stack-tabs/nuxt')")
    expect(script).toContain("assertResolvedFile('vue-stack-tabs/dist/style.css', 'root CSS')")
    expect(script).toContain('assertExportTypesExist(packageDir, pkg.exports)')
    expect(script).toContain(
      "await import('./node_modules/vue-stack-tabs/dist/nuxt/runtime/plugin.mjs')"
    )
    expect(script).toContain('assertPackedFileList')
  })

  it('packaged smoke script rejects CommonJS require on every object export', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'verify-packaged.mjs'), 'utf8')

    expect(script).toContain(
      'for (const [exportPath, exportConfig] of Object.entries(pkg.exports))'
    )
    expect(script).toContain(
      "throw new Error('CommonJS require export should not exist: ' + exportPath)"
    )
  })

  it('packaged smoke script verifies iframe bridge TypeScript closure from the real tarball', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'verify-packaged.mjs'), 'utf8')

    expect(script).toContain('writeIframeBridgeTypeSmokeProject')
    expect(script).toContain(
      "import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'"
    )
    expect(script).toContain("'--noEmit', '--pretty', 'false'")
  })

  it('lib build generates iframe bridge declaration dependencies next to the subpath declaration via tsconfig rootDir', () => {
    const pkg = readPackageJson()
    const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.lib.json'), 'utf8'))
    const buildScript = readFileSync(join(process.cwd(), 'package.json'), 'utf8')

    expect(pkg.exports?.['./iframe-bridge']).toEqual({
      types: './dist/iframe-bridge.d.ts',
      import: './dist/iframe-bridge.mjs'
    })
    expect(tsconfig.compilerOptions?.rootDir).toBe('src/lib')
    expect(buildScript).not.toContain('dist/src/lib/')
  })

  it('README documents compatible sandbox and cross-origin targetOrigin requirements', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8')

    expect(readme).toContain('兼容优先，不是强隔离')
    expect(readme).toContain('强隔离请移除 `allow-same-origin`')
    expect(readme).toContain(
      '默认未传 `targetOrigin` 时使用 iframe 页面自身的 `window.location.origin`'
    )
    expect(readme).toContain('跨域父页面必须显式传 `targetOrigin`')
  })

  it('lib tsconfig suppresses TypeScript 6 deprecation noise explicitly', () => {
    const tsconfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.lib.json'), 'utf8')) as {
      compilerOptions?: { ignoreDeprecations?: string }
    }

    expect(tsconfig.compilerOptions?.ignoreDeprecations).toBe('6.0')
  })

  it('exposes side-effect-free iframe bridge and dist Nuxt module subpaths', () => {
    const pkg = readPackageJson()
    const iframeBridgeExport = pkg.exports?.['./iframe-bridge'] as PackageExportEntry
    const nuxtExport = pkg.exports?.['./nuxt'] as PackageExportEntry

    expect(iframeBridgeExport).toEqual({
      types: './dist/iframe-bridge.d.ts',
      import: './dist/iframe-bridge.mjs'
    })
    expect(nuxtExport).toEqual({
      types: './dist/nuxt/module.d.ts',
      import: './dist/nuxt/module.mjs'
    })
  })

  it('Nuxt 产物配置：Vue/i18n external 化，组件入口指向 dist 产物', () => {
    const nuxtConfig = readFileSync(join(process.cwd(), 'vite.config.nuxt.ts'), 'utf8')
    const nuxtModule = readFileSync(join(process.cwd(), 'src', 'lib', 'nuxt', 'module.ts'), 'utf8')
    const packagedScript = readFileSync(
      join(process.cwd(), 'scripts', 'verify-packaged.mjs'),
      'utf8'
    )

    // 插件必须复用使用方的 Vue / i18n 实例，否则会出现两份运行时与 Symbol key 不匹配。
    expect(nuxtConfig).toContain("'vue'")
    expect(nuxtConfig).toContain("'vue-router'")
    expect(nuxtConfig).toContain("'vue-i18n-lite'")

    // 源码入口不会被发布，addComponent 必须指向真实产物。
    expect(nuxtModule).toContain("resolve('../vue-stack-tabs.es.js')")
    expect(nuxtModule).not.toContain("resolve('../index.ts')")

    // 打包冒烟需要守住上述两条约束，避免后续回归。
    expect(packagedScript).toContain('assertNuxtArtifacts')
    expect(packagedScript).toContain('Nuxt 插件内联了 Vue 运行时')
  })
})
