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

  it('packaged playground builds opt into package mode without changing default source mode', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'verify-packaged.mjs'), 'utf8')
    const vueConfig = readFileSync(
      join(process.cwd(), 'playgrounds', 'vue', 'vite.config.ts'),
      'utf8'
    )
    const nuxtConfig = readFileSync(
      join(process.cwd(), 'playgrounds', 'nuxt', 'nuxt.config.ts'),
      'utf8'
    )

    expect(script).toContain("{ USE_PACKAGE: '1' }")
    expect(vueConfig).toContain("process.env.USE_PACKAGE === '1'")
    expect(vueConfig).toContain("'vue-stack-tabs': resolve(rootDir, 'src/lib/index.ts')")
    expect(nuxtConfig).toContain("process.env.USE_PACKAGE === '1'")
    expect(nuxtConfig).toContain("resolve(rootDir, 'src/lib/nuxt/module.ts')")
  })

  it('packaged smoke script verifies iframe bridge TypeScript closure from the real tarball', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'verify-packaged.mjs'), 'utf8')

    expect(script).toContain('writeIframeBridgeTypeSmokeProject')
    expect(script).toContain("import { postOpenTab, onRefreshRequest } from 'vue-stack-tabs/iframe-bridge'")
    expect(script).toContain("'--noEmit', '--pretty', 'false'")
  })

  it('lib build copies iframe bridge declaration dependencies next to the subpath declaration', () => {
    const pkg = readPackageJson()
    const buildScript = readFileSync(join(process.cwd(), 'package.json'), 'utf8')

    expect(pkg.exports?.['./iframe-bridge']).toEqual({
      types: './dist/iframe-bridge.d.ts',
      import: './dist/iframe-bridge.mjs'
    })
    expect(buildScript).toContain('dist/utils')
    expect(buildScript).toContain('dist/src/lib/utils/iframeBridge.d.ts')
  })

  it('README documents compatible sandbox and cross-origin targetOrigin requirements', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8')

    expect(readme).toContain('兼容优先，不是强隔离')
    expect(readme).toContain('强隔离请移除 `allow-same-origin`')
    expect(readme).toContain('默认未传 `targetOrigin` 时使用 iframe 页面自身的 `window.location.origin`')
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
})
